import { atom, computed, map } from "nanostores";

// File information interface
export interface FileInfo {
  id: string;
  fileName: string;
  fileSize: number;
  uploadDate: Date;
  uploadedAt: string;
}

// Upload progress tracking
export interface UploadProgress {
  [fileId: string]: number;
}

// Global stores
export const filesStore = atom<FileInfo[]>([]);
export const uploadingStore = atom<boolean>(false);
export const selectedFilesStore = atom<File[]>([]);
export const uploadProgressStore = map<UploadProgress>({});
export const dragOverStore = atom<boolean>(false);

// Key management state
export const keyHashStore = atom<string | null>(null);
export const keyReadyStore = computed(keyHashStore, (keyHash) => !!keyHash);
export const encryptionKeyStore = atom<CryptoKey | null>(null);
export const keyLoadedFromExternal = atom<boolean>(false);
export const hasUploadedFilesStore = atom<boolean>(false);
