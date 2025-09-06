// Encryption key management

import { generateEncryptionKey, exportKey, importKey, generateKeyHash } from "./crypto";
import { keyHashStore, encryptionKeyStore, keyLoadedFromExternal } from "./stores";

export class KeyManager {
  private key: CryptoKey | null = null;
  private keyString: string | null = null;
  private keyHash: string | null = null;
  private readonly SESSION_STORAGE_KEY = "tinybox_encryption_key";
  private hashChangeListener: (() => void) | null = null;

  constructor() {
    // Set up hash change listener for real-time key updates
    this.setupHashChangeListener();
  }

  // Get current key
  getKey(): CryptoKey | null {
    return this.key;
  }

  // Get current key hash
  getKeyHash(): string | null {
    return this.keyHash;
  }

  // Generate new key
  async generateNewKey(): Promise<void> {
    const keyString = await exportKey(await generateEncryptionKey());
    await this.setKey(keyString);
  }

  // Set existing key
  async setKey(keyString: string): Promise<void> {
    this.key = await importKey(keyString);
    this.keyString = keyString;
    this.keyHash = await generateKeyHash(keyString);
    this.saveToSessionStorage();

    // Update stores
    encryptionKeyStore.set(this.key);
    keyHashStore.set(this.keyHash);
  }

  // Save key to session storage
  private saveToSessionStorage(): void {
    if (this.keyString && window?.sessionStorage) {
      try {
        sessionStorage.setItem(this.SESSION_STORAGE_KEY, this.keyString);
      } catch (error) {
        console.warn("Failed to save key to session storage:", error);
      }
    }
  }

  // Load key from session storage
  private async loadFromSessionStorage(): Promise<boolean> {
    if (!window?.sessionStorage) {
      return false;
    }

    try {
      const storedKey = sessionStorage.getItem(this.SESSION_STORAGE_KEY);
      if (storedKey) {
        await this.setKey(storedKey);
        keyLoadedFromExternal.set(true);
        return true;
      }
    } catch (error) {
      console.warn("Failed to load key from session storage:", error);
    }

    return false;
  }

  // Load key from URL hash fragment and remove from URL
  private async loadFromUrl(): Promise<boolean> {
    const hash = window.location.hash;
    if (!hash.startsWith("#")) {
      return false;
    }

    // Parse hash fragment as URL search params
    const hashParams = new URLSearchParams(hash.substring(1));
    const keyFromUrl = hashParams.get("key");

    if (keyFromUrl) {
      try {
        await this.setKey(keyFromUrl);

        // Mark that key was loaded from URL
        keyLoadedFromExternal.set(true);

        // Remove key from URL after reading
        const url = new URL(window.location.href);
        url.hash = "";
        window.history.replaceState({}, "", url.toString());

        return true;
      } catch (error) {
        console.error("Failed to restore key from URL hash:", error);
      }
    }

    return false;
  }

  // Initialize: session storage → URL hash → generate new key
  async initialize(): Promise<"generated" | "from-url" | "from-session"> {
    // Try to restore from URL hash
    if (await this.loadFromUrl()) {
      console.log("Key loaded from URL hash");
      return "from-url";
    }

    // Try to restore from session storage first
    if (await this.loadFromSessionStorage()) {
      console.log("Key loaded from session storage");
      return "from-session";
    }

    // Generate new key
    await this.generateNewKey();
    console.log("New key generated");
    return "generated";
  }

  // Generate share URL with hash fragment
  getShareUrl(): string {
    if (!this.keyString) {
      throw new Error("No key available for sharing");
    }

    const url = new URL(window.location.href);
    url.hash = `#key=${encodeURIComponent(this.keyString)}`;
    return url.toString();
  }

  // Set up hash change listener for real-time key updates
  private setupHashChangeListener(): void {
    if (typeof window === "undefined") return;

    this.hashChangeListener = async () => {
      this.loadFromUrl();
    };

    window.addEventListener("hashchange", this.hashChangeListener);
  }
}

// Global instance
export const keyManager = new KeyManager();
