// E2E encryption utilities

// Generate AES-GCM key
export async function generateEncryptionKey(): Promise<CryptoKey> {
  return await crypto.subtle.generateKey(
    {
      name: "AES-GCM",
      length: 256,
    },
    true, // Extractable
    ["encrypt", "decrypt"],
  );
}

// Export key to Base64 string
export async function exportKey(key: CryptoKey): Promise<string> {
  const exported = await crypto.subtle.exportKey("raw", key);
  return btoa(String.fromCharCode(...new Uint8Array(exported)));
}

// Import key from Base64 string
export async function importKey(keyString: string): Promise<CryptoKey> {
  const keyData = new Uint8Array(
    atob(keyString)
      .split("")
      .map((char) => char.charCodeAt(0)),
  );

  return await crypto.subtle.importKey("raw", keyData, { name: "AES-GCM" }, true, ["encrypt", "decrypt"]);
}

// Generate SHA-256 hash of encryption key (8-character hex)
export async function generateKeyHash(keyString: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(keyString);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = new Uint8Array(hashBuffer);
  // Convert first 4 bytes to hex to make 8-character hex
  return Array.from(hashArray.slice(0, 4))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

// Encrypt text data (for metadata)
export async function encryptText(
  text: string,
  key: CryptoKey,
): Promise<{
  encryptedData: string;
  iv: string;
}> {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encoder = new TextEncoder();
  const data = encoder.encode(text);

  const encryptedBuffer = await crypto.subtle.encrypt(
    {
      name: "AES-GCM",
      iv: iv,
    },
    key,
    data,
  );

  return {
    encryptedData: btoa(String.fromCharCode(...new Uint8Array(encryptedBuffer))),
    iv: btoa(String.fromCharCode(...iv)),
  };
}

// Decrypt text data
export async function decryptText(encryptedData: string, key: CryptoKey, iv: string): Promise<string> {
  const encryptedBytes = new Uint8Array(
    atob(encryptedData)
      .split("")
      .map((char) => char.charCodeAt(0)),
  );

  const ivBytes = new Uint8Array(
    atob(iv)
      .split("")
      .map((char) => char.charCodeAt(0)),
  );

  const decryptedBuffer = await crypto.subtle.decrypt(
    {
      name: "AES-GCM",
      iv: ivBytes,
    },
    key,
    encryptedBytes,
  );

  const decoder = new TextDecoder();
  return decoder.decode(decryptedBuffer);
}

// Encrypt file data
export async function encryptFile(file: File, key: CryptoKey): Promise<{ encryptedData: ArrayBuffer; iv: Uint8Array }> {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const fileData = await file.arrayBuffer();

  const encryptedData = await crypto.subtle.encrypt(
    {
      name: "AES-GCM",
      iv: iv,
    },
    key,
    fileData,
  );

  return {
    encryptedData,
    iv,
  };
}

// Decrypt data
export async function decryptData(encryptedData: BufferSource, key: CryptoKey, iv: BufferSource): Promise<ArrayBuffer> {
  return await crypto.subtle.decrypt(
    {
      name: "AES-GCM",
      iv: iv,
    },
    key,
    encryptedData,
  );
}
