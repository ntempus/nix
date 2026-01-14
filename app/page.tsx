"use client";

import Link from "next/link";
import { useState } from "react";
import { supabase } from "@/lib/supabase";
import { encryptMessage, generateKey, deriveKeyFromPassphrase } from "@/lib/crypto";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { DropdownMenu } from "@/components/ui/dropdown-menu";
import { SketchpadDropzone, DropFile } from "@/components/ui/sketchpad-dropzone";
import { AnimatePresence, motion } from "framer-motion";

export default function Home() {
  const [activeTab, setActiveTab] = useState<"text" | "file">("text");
  const [secret, setSecret] = useState("");
  const [files, setFiles] = useState<DropFile[]>([]);
  // Legacy file state removed
  const [generatedLink, setGeneratedLink] = useState("");
  const [loading, setLoading] = useState(false);
  const [expiration, setExpiration] = useState("Instant");
  const [error, setError] = useState("");

  const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
  const MAX_TEXT_SIZE = 100 * 1024; // 100KB

  // Passphrase state
  const [usePassphrase, setUsePassphrase] = useState(false);
  const [passphrase, setPassphrase] = useState("");
  const [showPassphrase, setShowPassphrase] = useState(false);

  const expirationOptions = ["Instant", "5 minutes", "1 hour", "12 hours", "24 hours"];

  const getExpirationSeconds = (label: string) => {
    switch (label) {
      case "5 minutes": return 300;
      case "1 hour": return 3600;
      case "12 hours": return 43200;
      case "24 hours": return 86400;
      case "Instant": return 86400; // Default to 24h as fallback, handled by burnAfterRead
      default: return 86400;
    }
  };

  const readFileAsBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result as string;
        // Remove data URL prefix (e.g., "data:image/png;base64,")
        const base64 = result.split(",")[1];
        resolve(base64);
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  const handleCreateLink = async () => {
    if (activeTab === "text" && !secret.trim()) return;
    if (activeTab === "file" && files.length === 0) return;
    if (usePassphrase && !passphrase.trim()) return;

    // Calculate total size
    const totalSize = files.reduce((acc, f) => acc + f.file.size, 0);

    if (activeTab === "file" && totalSize > MAX_FILE_SIZE) {
      setError(`Total size too large. Max allowed is ${MAX_FILE_SIZE / (1024 * 1024)}MB.`);
      return;
    }

    setLoading(true);
    setError("");

    try {
      // 1. Prepare Payload
      let payloadObj;
      if (activeTab === "text") {
        if (secret.length > MAX_TEXT_SIZE) {
          throw new Error(`Text too long. Max allowed is ${MAX_TEXT_SIZE / 1024}KB.`);
        }
        payloadObj = {
          type: "text",
          content: secret,
        };
      } else {
        let fileToUpload: File;
        let fileName: string;
        let mimeType: string;

        if (files.length === 1) {
          fileToUpload = files[0].file;
          fileName = fileToUpload.name;
          mimeType = fileToUpload.type;
        } else {
          // Zip multiple files
          const JSZip = (await import("jszip")).default;
          const zip = new JSZip();

          files.forEach((f) => {
            zip.file(f.file.name, f.file);
          });

          const blob = await zip.generateAsync({ type: "blob" });
          fileToUpload = new File([blob], "archive.zip", { type: "application/zip" });
          fileName = "archive.zip";
          mimeType = "application/zip";
        }

        const base64Content = await readFileAsBase64(fileToUpload);
        payloadObj = {
          type: "file",
          content: base64Content,
          fileName: fileName,
          mimeType: mimeType,
        };
      }

      const payload = JSON.stringify(payloadObj);
      let key;
      let salt = "";

      // 2. Generate Key (Random or Derived)
      if (usePassphrase) {
        salt = window.crypto.getRandomValues(new Uint8Array(16)).join(","); // Simple comma-separated string for storage
        key = await deriveKeyFromPassphrase(passphrase, salt);
      } else {
        key = await generateKey();
      }

      // 3. Encrypt Payload
      const encryptedJson = await encryptMessage(payload, key);
      const encryptedDataObj = JSON.parse(encryptedJson);

      // If using passphrase, we need to store the salt alongside the encrypted data
      if (usePassphrase) {
        encryptedDataObj.salt = salt;
        encryptedDataObj.passphraseProtected = true;
      }

      // Handle Instant Expiration (Burn on Read)
      if (expiration === "Instant") {
        encryptedDataObj.burnAfterRead = true;
      }

      const finalEncryptedContent = JSON.stringify(encryptedDataObj);

      // 4. Calculate Expiration
      const duration = getExpirationSeconds(expiration);
      const expiresAt = new Date(Date.now() + duration * 1000).toISOString();

      // 5. Insert into Supabase
      const { data, error } = await supabase
        .from("secrets")
        .insert({
          encrypted_content: finalEncryptedContent,
          expires_at: expiresAt,
        })
        .select("id")
        .single();

      if (error) {
        console.error("Supabase error:", JSON.stringify(error, null, 2));
        throw new Error(error.message || "Supabase insert failed");
      }

      const origin = typeof window !== "undefined" ? window.location.origin : "";

      if (usePassphrase) {
        // Passphrase Protected: No key in URL
        setGeneratedLink(`${origin}/view/${data.id}`);
      } else {
        // Standard: Key in URL hash
        setGeneratedLink(`${origin}/view/${data.id}#${key}`);
      }

    } catch (err: unknown) {
      console.warn("Backend failed or Validation error:", err);

      const errorMessage = err instanceof Error ? err.message : "Unknown error";

      if (errorMessage && (errorMessage.includes("too long") || errorMessage.includes("too large"))) {
        setError(errorMessage);
        setLoading(false);
        return;
      }

      console.warn("Using client-side fallback mode due to:", err);
      // Fallback: Client-side URL hash mode
      if (activeTab === "file") {
        setError("Backend unavailable: Files cannot be shared in offline/fallback mode.");
        setLoading(false);
        return;
      }

      if (usePassphrase) {
        setError("Backend unavailable: Passphrase protection requires backend storage.");
        setLoading(false);
        return;
      }

      if (expiration === "Instant") {
        setError("Backend unavailable: 'Instant' expiration requires backend storage.");
        setLoading(false);
        return;
      }

      await new Promise((resolve) => setTimeout(resolve, 1500));
      const origin = typeof window !== "undefined" ? window.location.origin : "";
      const duration = getExpirationSeconds(expiration);

      const payload = JSON.stringify({
        type: "text",
        content: secret,
      });

      const hash = "#" + encodeURIComponent(payload) + "|" + duration;
      setGeneratedLink(
        `${origin}/view/` + Math.random().toString(36).substring(7) + hash
      );
    } finally {
      setLoading(false);
    }
  };

  const [isCopied, setIsCopied] = useState(false);

  const copyToClipboard = () => {
    navigator.clipboard.writeText(generatedLink);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  return (
    <>
      <Header />

      <main className="flex-grow flex flex-col items-center justify-start pt-16 pb-24 px-4 sm:px-6 relative overflow-hidden">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-primary/5 blur-[120px] rounded-full pointer-events-none -z-10"></div>
        <div className="w-full max-w-3xl flex flex-col gap-8 z-10">
          <div className="space-y-4 flex flex-col items-center text-center">
            <div className="flex items-center gap-2 mb-2 justify-center">
              <h2 className="text-3xl font-semibold text-white tracking-tight">
                Create a secure link
              </h2>
            </div>
            <p className="text-text-muted max-w-2xl text-base leading-relaxed">
              Share text or files securely. Data is encrypted in your browser and accessible only once.
            </p>
          </div>

          <div className="w-full bg-surface-dark rounded-xl border border-border-dark shadow-card">
            {/* Tabs */}
            <div className="flex items-center border-b border-border-dark bg-surface-dark px-4 pt-4 gap-4 rounded-t-xl">
              <button
                onClick={() => { setActiveTab("text"); setGeneratedLink(""); setError(""); }}
                className={`pb-3 px-2 text-sm font-medium transition-all relative ${activeTab === "text" ? "text-white" : "text-text-muted hover:text-text-main"
                  }`}
              >
                Text
                {activeTab === "text" && (
                  <div className="absolute bottom-0 left-0 w-full h-0.5 bg-primary rounded-t-full"></div>
                )}
              </button>
              <button
                onClick={() => { setActiveTab("file"); setGeneratedLink(""); setError(""); }}
                className={`pb-3 px-2 text-sm font-medium transition-all relative ${activeTab === "file" ? "text-white" : "text-text-muted hover:text-text-main"
                  }`}
              >
                File
                {activeTab === "file" && (
                  <div className="absolute bottom-0 left-0 w-full h-0.5 bg-primary rounded-t-full"></div>
                )}
              </button>
            </div>

            <div className="relative">

              {activeTab === "text" ? (
                <>
                  <label className="sr-only" htmlFor="secret-input">
                    Secret Content
                  </label>
                  <textarea
                    className="w-full min-h-[220px] bg-transparent text-text-main placeholder:text-text-subtle p-6 text-base font-mono border-none focus:ring-0 resize-none leading-relaxed focus:outline-none"
                    id="secret-input"
                    placeholder="Paste password, API key, or sensitive data..."
                    spellCheck="false"
                    value={secret}
                    onChange={(e) => setSecret(e.target.value)}
                  ></textarea>
                </>
              ) : (
                <div className="w-full min-h-[220px] p-6">
                  <SketchpadDropzone
                    files={files}
                    onDrop={(fileList) => {
                      const newFiles = Array.from(fileList).map((file) => ({
                        id: crypto.randomUUID(),
                        file
                      }));
                      setFiles((prev) => [...prev, ...newFiles]);
                    }}
                    onRemove={(id) => {
                      setFiles((prev) => prev.filter((f) => f.id !== id));
                    }}
                    onClear={() => setFiles([])}
                  />
                  {/* Warning if multiple files */}
                  {/* Message removed as multi-file is now supported */}
                  {files.length > 1 && (
                    <p className="text-xs text-text-muted mt-2 text-center">
                      {files.length} files will be zipped into a single archive.
                    </p>
                  )}
                </div>
              )}
              {error && (
                <div className="mx-6 mb-4 p-3 bg-danger/10 border border-danger/20 rounded-lg flex items-center gap-3 animate-fade-in">
                  <span className="material-symbols-outlined text-danger text-[20px]">error</span>
                  <p className="text-sm text-danger-text">{error}</p>
                </div>
              )}
            </div>

            <div className="px-6 py-4 bg-surface-dark border-t border-border-dark flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex flex-col gap-3">
                <div className="flex items-center gap-6">
                  <label className="inline-flex items-center cursor-pointer group">
                    <input
                      className="sr-only peer"
                      type="checkbox"
                      checked={usePassphrase}
                      onChange={(e) => setUsePassphrase(e.target.checked)}
                    />
                    <div className="w-9 h-5 bg-surface-lighter border border-border-light peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-text-muted after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-primary peer-checked:border-primary peer-checked:after:bg-white peer-checked:after:border-white relative"></div>
                    <span className="ml-3 text-sm font-medium text-text-muted group-hover:text-text-main transition-colors flex items-center gap-2">
                      Passphrase Protection
                    </span>
                  </label>
                </div>

                <AnimatePresence>
                  {usePassphrase && (
                    <motion.div
                      initial={{ height: 0, opacity: 0, marginTop: 0 }}
                      animate={{ height: "auto", opacity: 1, marginTop: 4 }}
                      exit={{ height: 0, opacity: 0, marginTop: 0 }}
                      transition={{ duration: 0.3, ease: "easeInOut" }}
                      className="overflow-hidden pl-12"
                    >
                      <div className="relative w-full sm:w-64 group">
                        <input
                          type={showPassphrase ? "text" : "password"}
                          placeholder="Enter a strong passphrase..."
                          className="w-full bg-background-dark border border-border-light rounded-md pl-3 pr-10 py-2 text-sm text-text-main placeholder:text-text-subtle focus:outline-none focus:border-primary transition-colors"
                          value={passphrase}
                          onChange={(e) => setPassphrase(e.target.value)}
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassphrase(!showPassphrase)}
                          className="absolute right-2 top-1/2 -translate-y-1/2 p-2 text-text-muted hover:text-text-main transition-all opacity-0 group-hover:opacity-100"
                        >
                          <span className="material-symbols-outlined text-[18px]">
                            {showPassphrase ? "visibility" : "visibility_off"}
                          </span>
                        </button>
                      </div>
                      <p className="text-[11px] text-text-muted mt-1">
                        You will need this password to open the link. We do not store it.
                      </p>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
              <div className="flex items-center gap-2 text-sm text-text-muted">
                <span>Expires in</span>
                <div className="relative">
                  <DropdownMenu
                    options={expirationOptions.map((option) => ({
                      label: option,
                      onClick: () => setExpiration(option),
                    }))}
                  >
                    {expiration}
                  </DropdownMenu>
                </div>
              </div>
            </div>
            <div className="p-6 bg-surface-dark border-t border-border-dark flex justify-end rounded-b-xl">
              <button
                onClick={handleCreateLink}
                disabled={loading || (activeTab === "text" && !secret.trim()) || (activeTab === "file" && files.length === 0) || (usePassphrase && !passphrase.trim())}
                className={`w-full sm:w-auto flex items-center justify-center gap-2 rounded-md bg-primary hover:bg-primary-hover px-6 py-2.5 text-sm font-medium text-white shadow-sm transition-all hover:shadow-md cursor-pointer ${loading || (activeTab === "text" && !secret.trim()) || (activeTab === "file" && files.length === 0) || (usePassphrase && !passphrase.trim())
                  ? "opacity-50 cursor-not-allowed"
                  : ""
                  }`}
              >
                {loading ? (
                  <span className="material-symbols-outlined text-[18px] animate-spin">
                    progress_activity
                  </span>
                ) : (
                  <span className="material-symbols-outlined text-[18px]">
                    link
                  </span>
                )}
                {loading ? "Creating..." : "Create Link"}
              </button>
            </div>
          </div>

          <div className="flex justify-center -mt-4">
            <p className="text-xs text-text-muted flex items-center gap-1.5 opacity-80 hover:opacity-100 transition-opacity">
              <span className="material-symbols-outlined text-[14px] text-green-500">lock</span>
              End-to-end encrypted. Zero knowledge.
              <Link href="/security" className="underline hover:text-primary transition-colors">
                Learn how
              </Link>
            </p>
          </div>

          {generatedLink && (
            <div className="w-full bg-surface-dark rounded-xl border border-border-dark p-1 flex flex-col sm:flex-row items-center gap-3 relative overflow-hidden animate-fade-in">
              <div className="flex-grow w-full min-w-0 bg-background-dark rounded-lg border border-border-dark p-3 flex items-center justify-between group">
                <span className="text-text-subtle select-none text-sm pl-1 truncate max-w-[150px] sm:max-w-none">
                  {generatedLink.substring(0, 24)}...
                </span>
                <span className="text-white font-mono text-sm truncate px-2 hidden sm:block">
                  {generatedLink.split("/").pop()}
                </span>
                <button
                  onClick={copyToClipboard}
                  className="p-1.5 hover:bg-surface-lighter text-text-muted hover:text-white rounded-md transition-colors"
                  title="Copy"
                >
                  <span className={`material-symbols-outlined text-[18px] transition-all ${isCopied ? 'text-green-500 scale-110' : ''}`}>
                    {isCopied ? 'check' : 'content_copy'}
                  </span>
                </button>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-4">
            <div className="flex flex-col gap-3 p-5 rounded-xl bg-surface-dark border border-border-dark hover:border-border-light transition-colors group">
              <div className="flex items-center gap-3">
                <div className="h-8 w-8 rounded-md bg-surface-lighter border border-border-light flex items-center justify-center text-text-muted group-hover:text-white transition-colors">
                  <span className="material-symbols-outlined text-[18px]">
                    visibility_off
                  </span>
                </div>
                <h3 className="text-white font-medium text-sm">Burn on Read</h3>
              </div>
              <p className="text-xs text-text-muted leading-relaxed pl-11">
                When you select &quot;Instant&quot; expiration, the link is permanently deleted after the first view.
              </p>
            </div>
            <div className="flex flex-col gap-3 p-5 rounded-xl bg-surface-dark border border-border-dark hover:border-border-light transition-colors group">
              <div className="flex items-center gap-3">
                <div className="h-8 w-8 rounded-md bg-surface-lighter border border-border-light flex items-center justify-center text-text-muted group-hover:text-white transition-colors">
                  <span className="material-symbols-outlined text-[18px]">
                    encrypted
                  </span>
                </div>
                <h3 className="text-white font-medium text-sm">
                  Zero Knowledge
                </h3>
              </div>
              <p className="text-xs text-text-muted leading-relaxed pl-11">
                Your data is encrypted locally. We don&apos;t have the keys, so we can&apos;t read your secrets.
              </p>
            </div>
            <div className="flex flex-col gap-3 p-5 rounded-xl bg-surface-dark border border-border-dark hover:border-border-light transition-colors group">
              <div className="flex items-center gap-3">
                <div className="h-8 w-8 rounded-md bg-surface-lighter border border-border-light flex items-center justify-center text-text-muted group-hover:text-white transition-colors">
                  <span className="material-symbols-outlined text-[18px]">
                    timer
                  </span>
                </div>
                <h3 className="text-white font-medium text-sm">
                  Auto Expiration
                </h3>
              </div>
              <p className="text-xs text-text-muted leading-relaxed pl-11">
                Set a timer for 5m, 1h, or 24h. If the link isn&apos;t opened by then, it auto-destructs.
              </p>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </>
  );
}
