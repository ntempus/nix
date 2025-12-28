// lib/crypto.ts

const checkCrypto = () => {
  if (typeof window === "undefined" || !window.crypto || !window.crypto.subtle) {
    throw new Error("Cryptography API not available. This app requires a secure context (HTTPS) or localhost.");
  }
};

// 1. Generate a random Key for the URL fragment
export async function generateKey(): Promise<string> {
  checkCrypto();
  const key = await window.crypto.subtle.generateKey(
    { name: "AES-GCM", length: 256 },
    true,
    ["encrypt", "decrypt"]
  );
  const exported = await window.crypto.subtle.exportKey("raw", key);
  // Encode as URL-safe base64 (using browser standard methods since Buffer isn't available)
  const bytes = new Uint8Array(exported);
  let binary = "";
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  // Standard base64
  const base64 = btoa(binary);
  // Make URL safe: + -> -, / -> _, = -> (empty)
  return base64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

// 1.5 Derive a Key from a Passphrase (PBKDF2)
export async function deriveKeyFromPassphrase(passphrase: string, salt: string): Promise<string> {
  checkCrypto();
  const enc = new TextEncoder();
  const keyMaterial = await window.crypto.subtle.importKey(
    "raw",
    enc.encode(passphrase),
    { name: "PBKDF2" },
    false,
    ["deriveKey"]
  );

  const key = await window.crypto.subtle.deriveKey(
    {
      name: "PBKDF2",
      salt: enc.encode(salt),
      iterations: 100000,
      hash: "SHA-256",
    },
    keyMaterial,
    { name: "AES-GCM", length: 256 },
    true,
    ["encrypt", "decrypt"]
  );

  const exported = await window.crypto.subtle.exportKey("jwk", key);
  return btoa(JSON.stringify(exported));
}

// Helper to decode Base64URL to Uint8Array
function base64UrlToUint8Array(base64Url: string): Uint8Array {
  const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
  const padLen = (4 - (base64.length % 4)) % 4;
  const padded = base64 + "=".repeat(padLen);
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

// 2. Encrypt the text using the Key
export async function encryptMessage(text: string, keyString: string) {
  checkCrypto();
  let key: CryptoKey | undefined;

  // Try to determine format based on keyString content
  // Legacy keys are full Base64 encoded JSON strings (start with '{')
  // New keys are 43-char URL-safe Base64 strings

  try {
    // Attempt to parse as JWK (Legacy)
    // We check if decoding as base64 results in a JSON string
    try {
      const decoded = atob(keyString);
      if (decoded.trim().startsWith("{")) {
        const keyData = JSON.parse(decoded);
        key = await window.crypto.subtle.importKey(
          "jwk",
          keyData,
          { name: "AES-GCM" },
          true,
          ["encrypt"]
        );
      }
    } catch {
      // Not a valid base64 or not JSON, fall through
    }

    if (!key) {
      // Treat as Raw (New)
      const rawKey = base64UrlToUint8Array(keyString);
      key = await window.crypto.subtle.importKey(
        "raw",
        rawKey as BufferSource,
        { name: "AES-GCM" },
        true,
        ["encrypt"]
      );
    }
  } catch (e) {
    console.error("Key import failed:", e);
    throw new Error("Invalid Key");
  }

  if (!key) {
    throw new Error("Could not determine key format");
  }

  const iv = window.crypto.getRandomValues(new Uint8Array(12)); // Random initialization vector
  const encoder = new TextEncoder();
  const encoded = encoder.encode(text);

  const encrypted = await window.crypto.subtle.encrypt(
    { name: "AES-GCM", iv: iv },
    key,
    encoded
  );

  // Combine IV and Encrypted Data into one string
  const ivArray = Array.from(iv);
  const encryptedArray = Array.from(new Uint8Array(encrypted));
  return JSON.stringify({ iv: ivArray, data: encryptedArray });
}

// 3. Decrypt the message
export async function decryptMessage(encryptedJson: string, keyString: string) {
  checkCrypto();
  let key: CryptoKey | undefined;

  try {
    // Support both Legacy (JWK) and New (Raw) keys
    try {
      // Check for Legacy JWK
      // Decoding base64 to check for JSON structure
      // Note: atob might fail if it's not valid base64 (e.g. valid base64url but identifying characters make it fail standard atob)
      // But our new keys are base64url, so atob needs adjustment or try block
      let isLegacy = false;
      try {
        const decoded = atob(keyString); // standard atob
        if (decoded.trim().startsWith("{")) {
          const keyData = JSON.parse(decoded);
          key = await window.crypto.subtle.importKey(
            "jwk",
            keyData,
            { name: "AES-GCM" },
            true,
            ["decrypt"]
          );
          isLegacy = true;
        }
      } catch {
        // Not standard base64 or not JSON
      }

      if (!isLegacy) {
        // Assume New Raw Key
        const rawKey = base64UrlToUint8Array(keyString);
        key = await window.crypto.subtle.importKey(
          "raw",
          rawKey as BufferSource,
          { name: "AES-GCM" },
          true,
          ["decrypt"]
        );
      }
    } catch (e) {
      console.error("Key import error:", e);
      throw new Error("Invalid Key Format");
    }

    if (!key) {
      throw new Error("Could not determine key format");
    }

    let parsed;
    try {
      parsed = JSON.parse(encryptedJson);
    } catch {
      throw new Error("Corrupted Data: Invalid JSON");
    }

    const { iv, data } = parsed;

    if (!iv || !data) {
      throw new Error("Corrupted Data: Missing IV or Content");
    }

    const decrypted = await window.crypto.subtle.decrypt(
      { name: "AES-GCM", iv: new Uint8Array(iv) },
      key,
      new Uint8Array(data)
    );

    const decoder = new TextDecoder();
    return decoder.decode(decrypted);
  } catch (e: unknown) {
    // If it's already one of our errors, rethrow it
    if (e instanceof Error && e.message.startsWith("Corrupted Data")) {
      throw e;
    }
    // Otherwise it's likely a key mismatch or general crypto failure
    console.error("Decryption failed:", e);
    throw new Error("Invalid Key or Corrupted Data");
  }
}
