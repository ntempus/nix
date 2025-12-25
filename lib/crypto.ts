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
  const exported = await window.crypto.subtle.exportKey("jwk", key);
  // Encode as URL-safe base64
  return btoa(JSON.stringify(exported));
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

// 2. Encrypt the text using the Key
export async function encryptMessage(text: string, keyString: string) {
  checkCrypto();
  const keyData = JSON.parse(atob(keyString));
  const key = await window.crypto.subtle.importKey(
    "jwk",
    keyData,
    { name: "AES-GCM" },
    true,
    ["encrypt"]
  );

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
  try {
    const keyData = JSON.parse(atob(keyString));
    const key = await window.crypto.subtle.importKey(
      "jwk",
      keyData,
      { name: "AES-GCM" },
      true,
      ["decrypt"]
    );

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
  } catch (e: any) {
    // If it's already one of our errors, rethrow it
    if (e.message.startsWith("Corrupted Data")) {
      throw e;
    }
    // Otherwise it's likely a key mismatch or general crypto failure
    console.error("Decryption failed:", e);
    throw new Error("Invalid Key or Corrupted Data");
  }
}
