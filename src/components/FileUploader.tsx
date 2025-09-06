import type React from "react";
import { useEffect, useCallback, useState } from "react";
import { toast } from "sonner";
import { actions } from "astro:actions";
import { encryptFile, decryptData, encryptText, decryptText } from "@/lib/crypto";
import { keyManager } from "@/lib/key-manager";
import {
  filesStore,
  keyReadyStore,
  uploadingStore,
  selectedFilesStore,
  uploadProgressStore,
  hasUploadedFilesStore,
  keyHashStore,
} from "@/lib/stores";
import ShareLink from "./ShareLink";
import { useAtom } from "@/lib/utils";
import { Button } from "./ui/button";
import { Card, CardContent } from "./ui/card";

const FileUploader: React.FC = () => {
  const [files, setFiles] = useAtom(filesStore);
  const [keyReady] = useAtom(keyReadyStore);
  const [uploading, setUploading] = useAtom(uploadingStore);
  const [selectedFiles, setSelectedFiles] = useAtom(selectedFilesStore);
  const [progress, setProgress] = useAtom(uploadProgressStore);
  const [, setHasUploadedFiles] = useAtom(hasUploadedFilesStore);
  const [keyHash] = useAtom(keyHashStore);

  // Drag and drop state
  const [isDragOver, setIsDragOver] = useState(false);
  const [, setDragCounter] = useState(0);

  const loadFiles = useCallback(async () => {
    try {
      if (!keyHash) {
        setFiles([]);
        return;
      }

      const result = await actions.list({ keyHash });

      if (!result.data) {
        throw new Error("Failed to fetch files");
      }

      const key = keyManager.getKey();
      if (!key) {
        setFiles([]);
        return;
      }

      const decryptedFiles = [];
      for (const encryptedFile of result.data.files) {
        try {
          const decryptedMetadata = await decryptMetadata(
            encryptedFile.encryptedMetadata,
            key,
            encryptedFile.metadataIv,
          );

          decryptedFiles.push({
            id: encryptedFile.id,
            fileName: decryptedMetadata.fileName,
            fileSize: decryptedMetadata.fileSize,
            uploadDate: decryptedMetadata.uploadDate,
            uploadedAt: encryptedFile.uploadedAt,
          });
        } catch {
          // Exclude from display due to hash collision decryption failure
          console.log(`Skipping file ${encryptedFile.id} due to decryption failure (hash collision)`);
        }
      }

      setFiles(decryptedFiles);
    } catch (error) {
      console.error("Failed to load files:", error);
      toast.error("Failed to load files");
    }
  }, [setFiles, keyHash]);

  const initializeKey = useCallback(async () => {
    try {
      const result = await keyManager.initialize();
      if (result === "generated") {
        toast.success("Encryption key generated");
      } else if (result === "from-url") {
        toast.success("Encryption key loaded from URL");
      } else if (result === "from-session") {
        toast.success("Encryption key loaded from session storage");
      } else {
        toast.success("Encryption key loaded");
      }
      await loadFiles();
    } catch (error) {
      console.error("Key initialization failed:", error);
      toast.error("Failed to initialize encryption key");
    }
  }, [loadFiles]);

  useEffect(() => {
    void initializeKey();
  }, [initializeKey]);

  // Drag and drop handlers
  const handleDragEnter = useCallback((e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragCounter((prev) => prev + 1);
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragCounter((prev) => {
      const newCounter = prev - 1;
      if (newCounter === 0) {
        setIsDragOver(false);
      }
      return newCounter;
    });
  }, []);

  const handleDragOver = useCallback((e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDrop = useCallback(
    (e: DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setDragCounter(0);
      setIsDragOver(false);
      if (e.dataTransfer?.files) {
        const droppedFiles = Array.from(e.dataTransfer.files);
        // Add dropped files to selected files list
        setSelectedFiles((prev) => [...prev, ...droppedFiles]);
      }
    },
    [setSelectedFiles],
  );

  // Add global drag and drop event listeners
  useEffect(() => {
    const dragEnterHandler = (e: DragEvent) => handleDragEnter(e);
    const dragLeaveHandler = (e: DragEvent) => handleDragLeave(e);
    const dragOverHandler = (e: DragEvent) => handleDragOver(e);
    const dropHandler = (e: DragEvent) => handleDrop(e);

    document.addEventListener("dragenter", dragEnterHandler);
    document.addEventListener("dragleave", dragLeaveHandler);
    document.addEventListener("dragover", dragOverHandler);
    document.addEventListener("drop", dropHandler);

    return () => {
      document.removeEventListener("dragenter", dragEnterHandler);
      document.removeEventListener("dragleave", dragLeaveHandler);
      document.removeEventListener("dragover", dragOverHandler);
      document.removeEventListener("drop", dropHandler);
    };
  }, [handleDragEnter, handleDragLeave, handleDragOver, handleDrop]);

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    setSelectedFiles(files);
  };

  const handleRemoveFile = (index: number) => {
    const newFiles = selectedFiles.filter((_, i) => i !== index);
    setSelectedFiles(newFiles);
  };

  const handleUpload = async () => {
    if (selectedFiles.length === 0) {
      toast.error("Please select at least one file");
      return;
    }

    const key = keyManager.getKey();
    const keyHash = keyManager.getKeyHash();

    if (!key || !keyHash) {
      toast.error("Encryption key not ready");
      return;
    }

    setUploading(true);

    try {
      for (const [index, file] of selectedFiles.entries()) {
        const fileId = `file-${index}`;

        // Update progress for this file
        setProgress((prev) => ({ ...prev, [fileId]: 25 }));

        const encryptedFileData = await encryptFile(file, key);
        const { encryptedMetadata, iv: metadataIv } = await encryptMetadata(file.name, file.size, new Date(), key);

        setProgress((prev) => ({ ...prev, [fileId]: 50 }));

        const encryptedBlob = new Blob([encryptedFileData.encryptedData], {
          type: "application/octet-stream",
        });
        const fileIvBase64 = btoa(String.fromCharCode(...encryptedFileData.iv));

        setProgress((prev) => ({ ...prev, [fileId]: 75 }));

        const formData = new FormData();
        formData.append("encryptedFile", encryptedBlob);
        formData.append("encryptedMetadata", encryptedMetadata);
        formData.append("metadataIv", metadataIv);
        formData.append("keyHash", keyHash);
        formData.append("fileIv", fileIvBase64);

        const result = await actions.store(formData);

        if (result.data?.success) {
          setProgress((prev) => ({ ...prev, [fileId]: 100 }));
        } else {
          throw new Error(result.error?.message || `Upload failed for "${file.name}"`);
        }
      }

      // Clear selection and reset progress
      setSelectedFiles([]);
      setProgress({});

      // Mark that files have been uploaded
      setHasUploadedFiles(true);

      const fileInput = document.getElementById("file-input") as HTMLInputElement;
      if (fileInput) fileInput.value = "";

      await loadFiles();
    } catch (error) {
      console.error("Upload failed:", error);
      toast.error(error instanceof Error ? error.message : "Upload failed");
    } finally {
      setUploading(false);
      setProgress({});
    }
  };

  const handleDownload = async (fileInfo: (typeof files)[0]) => {
    const key = keyManager.getKey();
    if (!key) {
      toast.error("Encryption key not ready");
      return;
    }

    const downloadId = `download-${fileInfo.id}`;

    try {
      setProgress((prev) => ({ ...prev, [downloadId]: 25 }));

      const [fileInfoResult, downloadResult] = await Promise.all([
        actions.info({ fileId: fileInfo.id }),
        actions.fetch({ fileId: fileInfo.id }),
      ]);

      if (!fileInfoResult.data || !downloadResult.data) {
        throw new Error("Failed to fetch file");
      }

      setProgress((prev) => ({ ...prev, [downloadId]: 50 }));

      const fileIv = new Uint8Array(
        atob(fileInfoResult.data.fileIv)
          .split("")
          .map((char) => char.charCodeAt(0)),
      );

      const encryptedData = Uint8Array.from(atob(downloadResult.data.data), (c) => c.charCodeAt(0));
      const decryptedData = await decryptData(encryptedData, key, fileIv);

      setProgress((prev) => ({ ...prev, [downloadId]: 100 }));

      const blob = new Blob([decryptedData], { type: "application/octet-stream" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = fileInfo.fileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      // Remove progress after a short delay
      setTimeout(() => {
        setProgress((prev) => {
          // eslint-disable-next-line @typescript-eslint/no-unused-vars
          const { [downloadId]: _, ...rest } = prev;
          return rest;
        });
      }, 1000);
    } catch (error) {
      console.error("Download failed:", error);
      toast.error(error instanceof Error ? error.message : "Download failed");

      // Remove progress on error
      setProgress((prev) => {
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { [downloadId]: _, ...rest } = prev;
        return rest;
      });
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  return (
    <div className="relative mx-auto max-w-4xl p-6">
      {/* Global drag overlay */}
      {isDragOver && (
        <div className="pointer-events-none fixed inset-0 z-50 flex items-center justify-center backdrop-blur-xl">
          <div>Drop files to upload</div>
        </div>
      )}

      <div className="mb-6">
        <h1 className="mb-2 text-2xl font-bold">TinyBox</h1>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          {/* Upload */}
          <Card>
            <CardContent className="p-6">
              {selectedFiles.length > 0 && (
                <div className="mb-4 space-y-2">
                  {selectedFiles.map((file, index) => {
                    const fileId = `file-${index}`;
                    const fileProgress = progress[fileId];
                    const isUploading = fileProgress !== undefined;

                    return (
                      <div key={index} className="flex items-center justify-between rounded bg-gray-50 p-2">
                        <span className="text-sm">
                          {file.name} ({formatFileSize(file.size)})
                        </span>
                        {isUploading ? (
                          <span className="text-sm font-medium">{fileProgress}%</span>
                        ) : (
                          <Button variant="ghost" size="sm" onClick={() => handleRemoveFile(index)}>
                            Delete
                          </Button>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}

              <div className="flex flex-wrap gap-2">
                <input
                  id="file-input"
                  type="file"
                  multiple
                  onChange={handleFileSelect}
                  className="hidden"
                  disabled={uploading}
                />
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => document.getElementById("file-input")?.click()}
                  disabled={uploading}
                >
                  Select Files
                </Button>
                <Button
                  onClick={handleUpload}
                  disabled={selectedFiles.length === 0 || uploading || !keyReady}
                  className="flex-1"
                >
                  {uploading ? "Uploading..." : "Upload Files"}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* File List */}
          <Card>
            <CardContent className="p-6">
              <h2 className="mb-4 text-sm font-medium">Files</h2>
              {files.length === 0 ? (
                <p className="py-8 text-center text-sm text-gray-500">No files</p>
              ) : (
                <div className="space-y-2">
                  {files.map((file) => {
                    const downloadId = `download-${file.id}`;
                    const downloadProgress = progress[downloadId];
                    const isDownloading = downloadProgress !== undefined;

                    return (
                      <div key={file.id} className="flex items-center justify-between rounded border p-3">
                        <div>
                          <div className="font-medium">{file.fileName}</div>
                          <div className="text-xs text-gray-500">
                            {formatFileSize(file.fileSize)} • {new Date(file.uploadedAt).toLocaleDateString()}
                          </div>
                        </div>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleDownload(file)}
                          disabled={!keyReady || isDownloading}
                        >
                          {isDownloading ? `${downloadProgress}%` : "Download"}
                        </Button>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <ShareLink onKeyChange={loadFiles} />
        </div>
      </div>
    </div>
  );
};

// Encrypt file metadata
export async function encryptMetadata(
  fileName: string,
  fileSize: number,
  uploadDate: Date,
  key: CryptoKey,
): Promise<{ encryptedMetadata: string; iv: string }> {
  const metadata = {
    fileName,
    fileSize,
    uploadDate: uploadDate.toISOString(),
  };

  const result = await encryptText(JSON.stringify(metadata), key);
  return {
    encryptedMetadata: result.encryptedData,
    iv: result.iv,
  };
}

// Decrypt file metadata
export async function decryptMetadata(
  encryptedMetadata: string,
  key: CryptoKey,
  iv: string,
): Promise<{
  fileName: string;
  fileSize: number;
  uploadDate: Date;
}> {
  const decryptedText = await decryptText(encryptedMetadata, key, iv);
  const metadata = JSON.parse(decryptedText);

  return {
    fileName: metadata.fileName,
    fileSize: metadata.fileSize,
    uploadDate: new Date(metadata.uploadDate),
  };
}

export default FileUploader;
