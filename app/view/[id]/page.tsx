"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { decryptMessage, deriveKeyFromPassphrase } from "@/lib/crypto";
import LinkExpired from "@/components/LinkExpired";
import Header from "@/components/Header";
import Footer from "@/components/Footer";

export default function SecretView() {
    const [isExpired, setIsExpired] = useState(false);
    const [secret, setSecret] = useState<string | null>(null);
    const [fileData, setFileData] = useState<{ fileName: string, mimeType: string, content: string } | null>(null);
    const [loadingMessage, setLoadingMessage] = useState("Loading...");

    // Passphrase state
    const [isPassphraseProtected, setIsPassphraseProtected] = useState(false);
    const [passphraseInput, setPassphraseInput] = useState("");
    const [encryptedPkg, setEncryptedPkg] = useState<{ encrypted_content: string; salt: string } | null>(null);
    const [passphraseError, setPassphraseError] = useState("");
    const [decrypting, setDecrypting] = useState(false);

    // Timer logic
    const [timeLeft, setTimeLeft] = useState(0);
    const [timerInitialized, setTimerInitialized] = useState(false);

    const params = useParams();
    // Helper to check for UUID format
    const isUUID = (str: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str);

    useEffect(() => {
        const id = params?.id as string;
        const hash = window.location.hash.substring(1);

        const fetchSecret = async () => {
            // 1. Backend Mode: ID is UUID
            if (id && isUUID(id)) {
                // Removed early hash check. We must fetch data first to see if it's passphrase protected.

                try {
                    const { data, error } = await supabase
                        .from('secrets')
                        .select('encrypted_content, expires_at')
                        .eq('id', id)
                        .single();

                    if (error || !data) {
                        setIsExpired(true);
                        return;
                    }

                    // Check expiration
                    const now = new Date();
                    const expiresAt = new Date(data.expires_at);
                    const remainingMs = expiresAt.getTime() - now.getTime();

                    if (remainingMs <= 0) {
                        // Lazy cleanup: It's expired, so delete it now
                        await supabase.from('secrets').delete().eq('id', id);
                        setIsExpired(true);
                        return;
                    }

                    // Set timer
                    setTimeLeft(Math.floor(remainingMs / 1000));

                    // --- Decryption Logic ---

                    // 1. Check if Passphrase Protected (Check for salt/flag in JSON wrapper)
                    // Note: In create page we wrapped the standard {iv, data} inside another JSON with {salt, passphraseProtected}
                    // Let's first peek at the structure.

                    let isProtected = false;
                    let salt = "";
                    let finalEncryptedContent = data.encrypted_content;

                    try {
                        const parsed = JSON.parse(data.encrypted_content);
                        if (parsed.passphraseProtected || parsed.salt) {
                            isProtected = true;
                            salt = parsed.salt;
                            // The actual encrypted data is everything else? 
                            // No, in Create we did: encryptedDataObj.salt = salt; encryptedDataObj.passphraseProtected = true;
                            // So 'parsed' IS the object {iv, data, salt, passphraseProtected}.
                            // decryptMessage expects JSON string {iv, data}. 
                            // We can just pass the stringified version of this object to decryptMessage 
                            // because decryptMessage only looks for 'iv' and 'data'.
                        }
                    } catch (e) {
                        // Not JSON, or standard structure.
                    }

                    if (isProtected) {
                        // If protected and no hash key (which is expected), prompt for passphrase
                        setIsPassphraseProtected(true);
                        setEncryptedPkg({ encrypted_content: data.encrypted_content, salt });
                        setTimerInitialized(true);
                        // We stop here and wait for user input
                        return;
                    }

                    // 2. Standard Decryption (URL Hash has key)
                    if (!hash) {
                        setLoadingMessage("Missing decryption key in URL.");
                        return;
                    }

                    // Decrypt
                    try {
                        const decrypted = await decryptMessage(data.encrypted_content, hash);

                        // Try to parse as JSON (New format)
                        try {
                            const parsed = JSON.parse(decrypted);
                            if (parsed.type === 'file') {
                                if (!parsed.fileName || !parsed.mimeType || !parsed.content) {
                                    throw new Error("Corrupted Data: Missing file metadata");
                                }
                                setFileData({
                                    fileName: parsed.fileName,
                                    mimeType: parsed.mimeType,
                                    content: parsed.content
                                });
                            } else if (parsed.type === 'text') {
                                setSecret(parsed.content);
                            } else {
                                // Fallback for unknown JSON structures (treat as text)
                                setSecret(decrypted);
                            }
                        } catch (e) {
                            // Valid JSON parse error -> It's a legacy text secret
                            setSecret(decrypted);
                        }

                    } catch (err: any) {
                        if (err.message && err.message.includes("Corrupted Data")) {
                            setLoadingMessage("Secret data is corrupted or invalid.");
                        } else {
                            setLoadingMessage("Failed to decrypt. Invalid key.");
                        }
                        return;
                    }

                    // Burn on Read logic is disabled to allow persistence until expiration
                    // await supabase.from('secrets').delete().eq('id', id);

                } catch (err: any) {
                    console.error("Backend fetch error", err);
                    setLoadingMessage("Error retrieving secret.");
                }
            }
            // 2. Legacy/Mock Mode (Hash contains secret)
            else {
                let secretVal = "";
                let durationVal = 300;

                if (hash) {
                    if (hash.includes('|')) {
                        const parts = hash.split('|');
                        secretVal = decodeURIComponent(parts[0]);
                        if (parts[1]) durationVal = parseInt(parts[1], 10) || 300;
                    } else {
                        secretVal = decodeURIComponent(hash);
                    }
                }

                if (secretVal) {
                    // Try to parse legacy/mock secret as JSON
                    try {
                        const parsed = JSON.parse(secretVal);
                        if (parsed.type === 'file') {
                            setFileData(parsed); // Mock mode file
                        } else if (parsed.type === 'text') {
                            setSecret(parsed.content);
                        } else {
                            setSecret(secretVal);
                        }
                    } catch {
                        setSecret(secretVal);
                    }

                    // Timer logic for mock (persistence)
                    const storageKey = `burnlink_expiry_${hash || 'demo'}`;
                    const storedExpiry = localStorage.getItem(storageKey);
                    const now = Date.now();

                    if (storedExpiry) {
                        const expiryTime = parseInt(storedExpiry, 10);
                        const remaining = Math.floor((expiryTime - now) / 1000);
                        if (remaining <= 0) {
                            setTimeLeft(0);
                            setIsExpired(true);
                        } else {
                            setTimeLeft(remaining);
                        }
                    } else {
                        const expiryTime = now + durationVal * 1000;
                        localStorage.setItem(storageKey, expiryTime.toString());
                        setTimeLeft(durationVal);
                    }
                } else {
                    setLoadingMessage("No secret found.");
                }
            }
            setTimerInitialized(true);
        };

        fetchSecret();
    }, [params]);

    useEffect(() => {
        if (!timerInitialized) return;

        if (timeLeft <= 0) {
            setIsExpired(true);
            return;
        }

        const timer = setInterval(() => {
            setTimeLeft((prev) => {
                if (prev <= 1) {
                    clearInterval(timer);
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);

        return () => clearInterval(timer);
    }, [timeLeft, timerInitialized]);

    const formatTime = (seconds: number) => {
        const hours = Math.floor(seconds / 3600);
        const mins = Math.floor((seconds % 3600) / 60);
        const secs = seconds % 60;

        if (hours > 0) {
            return `${hours.toString().padStart(2, "0")}:${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
        }
        return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
    };

    const downloadFile = () => {
        if (!fileData) return;
        const link = document.createElement("a");
        link.href = `data:${fileData.mimeType};base64,${fileData.content}`;
        link.download = fileData.fileName;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const saveTextFile = () => {
        if (!secret) return;
        const blob = new Blob([secret], { type: "text/plain;charset=utf-8" });
        const link = document.createElement("a");
        link.href = URL.createObjectURL(blob);
        link.download = "decrypted_secret.txt";
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const handleUnlock = async (e?: React.FormEvent) => {
        if (e) e.preventDefault();
        if (!passphraseInput || !encryptedPkg) return;

        setDecrypting(true);
        setPassphraseError("");

        try {
            // 1. Derive Key
            const key = await deriveKeyFromPassphrase(passphraseInput, encryptedPkg.salt);

            // 2. Decrypt
            const decrypted = await decryptMessage(encryptedPkg.encrypted_content, key);

            // 3. Parse and Reveal
            try {
                const parsed = JSON.parse(decrypted);
                if (parsed.type === 'file') {
                    if (!parsed.fileName || !parsed.mimeType || !parsed.content) {
                        throw new Error("Corrupted Data: Missing file metadata");
                    }
                    setFileData({
                        fileName: parsed.fileName,
                        mimeType: parsed.mimeType,
                        content: parsed.content
                    });
                } else if (parsed.type === 'text') {
                    setSecret(parsed.content);
                } else {
                    setSecret(decrypted);
                }
            } catch (e) {
                setSecret(decrypted);
            }

            // Turn off protection mode to reveal content
            setIsPassphraseProtected(false);

        } catch (err: any) {
            console.error(err);
            if (err.message && err.message.includes("Corrupted Data")) {
                setPassphraseError("Secret data is corrupted.");
            } else {
                setPassphraseError("Incorrect passphrase. Please try again.");
            }
        } finally {
            setDecrypting(false);
        }
    };

    if (isExpired) {
        return <LinkExpired />;
    }

    if (isPassphraseProtected) {
        return (
            <>
                <Header />
                <main className="flex-1 flex flex-col items-center justify-center p-4 relative overflow-hidden">
                    <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-primary/5 blur-[120px] rounded-full pointer-events-none -z-10"></div>
                    <div className="w-full max-w-md bg-surface-dark border border-border-dark rounded-xl p-8 shadow-card animate-fade-in z-10">
                        <div className="flex flex-col items-center gap-4 text-center mb-6">
                            <div className="h-12 w-12 bg-surface-lighter rounded-full flex items-center justify-center border border-border-light">
                                <span className="material-symbols-outlined text-primary text-[24px]">
                                    lock
                                </span>
                            </div>
                            <div>
                                <h2 className="text-xl font-semibold text-white">Protected Secret</h2>
                                <p className="text-text-muted text-sm mt-1">This link is protected with a passphrase.</p>
                            </div>
                        </div>

                        <form onSubmit={handleUnlock} className="flex flex-col gap-4">
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-text-muted" htmlFor="passphrase">
                                    Passphrase
                                </label>
                                <input
                                    id="passphrase"
                                    type="password"
                                    autoFocus
                                    className="w-full bg-background-dark border border-border-light rounded-md px-4 py-2.5 text-text-main placeholder:text-text-subtle focus:outline-none focus:border-primary transition-colors"
                                    placeholder="Enter passphrase..."
                                    value={passphraseInput}
                                    onChange={(e) => setPassphraseInput(e.target.value)}
                                />
                                {passphraseError && (
                                    <p className="text-xs text-danger animate-shake">
                                        {passphraseError}
                                    </p>
                                )}
                            </div>

                            <button
                                type="submit"
                                disabled={decrypting || !passphraseInput}
                                className={`w-full flex items-center justify-center gap-2 rounded-md bg-primary hover:bg-primary-hover px-4 py-2.5 text-sm font-medium text-white shadow-sm transition-all hover:shadow-md mt-2 ${decrypting || !passphraseInput ? "opacity-50 cursor-not-allowed" : ""}`}
                            >
                                {decrypting ? "Decrypting..." : "Unlock Secret"}
                            </button>
                        </form>
                    </div>
                </main>
                <Footer />
            </>
        );
    }

    if (!secret && !fileData) {
        return (
            <>
                <Header />
                <main className="flex-1 flex flex-col items-center justify-center p-4">
                    <div className="text-text-muted animate-pulse">{loadingMessage}</div>
                </main>
                <Footer />
            </>
        );
    }

    return (
        <>
            <Header />

            <main className="flex-1 flex flex-col items-center justify-center p-4 relative">
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-3xl h-[400px] bg-primary/5 rounded-full blur-[100px] pointer-events-none -z-10 opacity-60"></div>
                <div className="w-full max-w-3xl flex flex-col gap-6 animate-fade-in">
                    <div className="flex flex-col sm:flex-row items-start gap-5 bg-bg-card border border-surface-highlight/60 p-6 rounded-xl shadow-card backdrop-blur-sm relative overflow-hidden group">
                        <div className="absolute inset-0 bg-gradient-to-r from-danger-subtle/30 to-transparent opacity-50 pointer-events-none"></div>
                        <div className="bg-surface p-3 rounded-lg shrink-0 flex items-center justify-center border border-surface-highlight relative z-10">
                            <span className="material-symbols-outlined text-danger text-[24px]">
                                local_fire_department
                            </span>
                        </div>
                        <div className="flex-1 relative z-10">
                            <div className="flex items-center justify-between mb-2">
                                <h3 className="text-white font-semibold text-base flex items-center gap-2">
                                    Secret Revealed
                                </h3>
                                <span className="text-[10px] bg-danger/10 text-danger-text px-2 py-0.5 rounded border border-danger/20 font-medium uppercase tracking-wider">
                                    Destructive
                                </span>
                            </div>
                            <p className="text-text-muted text-sm leading-relaxed">
                                This message has been destroyed from the server. <br className="hidden sm:block" />
                                If you refresh this page or navigate away, the secret will be{" "}
                                <strong className="text-danger-text font-medium">
                                    lost forever
                                </strong>
                                .
                            </p>
                        </div>
                    </div>

                    <div className="flex flex-col rounded-xl border border-surface-highlight bg-bg-card shadow-elevated overflow-hidden relative">
                        <div className="bg-surface/50 border-b border-surface-highlight px-4 py-3 flex items-center justify-between select-none">
                            <div className="flex items-center gap-4">
                                <div className="flex gap-2">
                                    <div className="w-2.5 h-2.5 rounded-full bg-surface-highlight border border-surface-active"></div>
                                    <div className="w-2.5 h-2.5 rounded-full bg-surface-highlight border border-surface-active"></div>
                                    <div className="w-2.5 h-2.5 rounded-full bg-surface-highlight border border-surface-active"></div>
                                </div>
                                <div className="h-4 w-px bg-surface-highlight"></div>
                                <span className="text-xs font-mono text-text-muted font-medium flex items-center gap-2">
                                    <span className="material-symbols-outlined text-[14px] text-accent-light">
                                        lock_open
                                    </span>
                                    {fileData ? fileData.fileName : "decrypted_payload.txt"}
                                </span>
                            </div>
                            <div className="flex items-center gap-2">
                                <span className="text-[10px] font-mono text-text-dim px-2 py-0.5 rounded border border-surface-highlight bg-surface/30">
                                    {fileData ? "BINARY" : "UTF-8"}
                                </span>
                            </div>
                        </div>

                        <div className="relative bg-[#131519] group min-h-[300px] flex flex-col">
                            {secret ? (
                                <>
                                    <textarea
                                        className="w-full h-72 p-6 bg-transparent text-text-main font-mono text-sm leading-7 resize-none focus:outline-none border-none block"
                                        readOnly
                                        spellCheck="false"
                                        value={secret}
                                    ></textarea>
                                    <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-all duration-200 translate-y-1 group-hover:translate-y-0 hidden sm:block">
                                        <button
                                            onClick={() => navigator.clipboard.writeText(secret)}
                                            className="bg-surface hover:bg-surface-active text-text-main p-2 rounded-md shadow-lg border border-surface-highlight hover:border-surface-active transition-all"
                                            title="Quick Copy"
                                        >
                                            <span className="material-symbols-outlined text-[18px]">
                                                content_copy
                                            </span>
                                        </button>
                                    </div>
                                </>
                            ) : fileData ? (
                                <div className="flex-1 flex flex-col items-center justify-center p-8 gap-6">
                                    <div className="h-24 w-24 bg-surface-lighter rounded-2xl border border-border-light flex items-center justify-center shadow-lg">
                                        <span className="material-symbols-outlined text-[48px] text-primary">
                                            description
                                        </span>
                                    </div>
                                    <div className="text-center">
                                        <h4 className="text-white text-lg font-medium mb-1">{fileData.fileName}</h4>
                                        <p className="text-text-muted text-sm font-mono">{fileData.mimeType}</p>
                                    </div>
                                    <button
                                        onClick={downloadFile}
                                        className="flex items-center gap-2 px-6 py-3 rounded-lg bg-primary hover:bg-primary-hover text-white font-medium shadow-md transition-all hover:-translate-y-0.5"
                                    >
                                        <span className="material-symbols-outlined">download</span>
                                        Download File
                                    </button>
                                </div>
                            ) : null}
                        </div>

                        <div className="p-4 bg-surface/30 border-t border-surface-highlight flex flex-col sm:flex-row gap-4 justify-between items-center">
                            <div className="flex items-center gap-3 w-full sm:w-auto bg-surface/50 px-3 py-2 rounded-md border border-surface-highlight">
                                <div className="relative flex items-center justify-center">
                                    <span className="material-symbols-outlined text-danger text-[20px] animate-pulse">
                                        timer
                                    </span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <span className="text-[10px] text-text-dim uppercase font-bold tracking-wider">
                                        Auto-Delete
                                    </span>
                                    <span className="h-3 w-px bg-surface-highlight"></span>
                                    <span className="font-mono text-text-main text-sm font-medium">
                                        {timerInitialized ? formatTime(timeLeft) : "..."}
                                    </span>
                                </div>
                            </div>
                            <div className="flex items-center gap-3 w-full sm:w-auto">
                                {secret && (
                                    <button
                                        onClick={saveTextFile}
                                        className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2 rounded-md bg-surface hover:bg-surface-highlight text-text-main text-sm font-medium transition-all border border-surface-highlight hover:border-surface-active shadow-subtle"
                                    >
                                        <span className="material-symbols-outlined text-[18px]">
                                            download
                                        </span>
                                        Save as .txt
                                    </button>
                                )}
                                {secret && (
                                    <button
                                        onClick={() => navigator.clipboard.writeText(secret)}
                                        className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2 rounded-md bg-primary hover:bg-primary-dark text-white text-sm font-medium shadow-sm transition-all active:scale-[0.98]"
                                    >
                                        <span className="material-symbols-outlined text-[18px]">
                                            content_copy
                                        </span>
                                        Copy Secret
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>
                    <div className="text-center mt-2">
                        <p className="text-[11px] text-text-dim font-mono">
                            ID: {params?.id || "Unknown"} • Encrypted with AES-256-GCM
                        </p>
                    </div>
                </div>
            </main>

            <Footer />
        </>
    );
}
