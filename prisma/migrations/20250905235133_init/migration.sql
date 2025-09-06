-- CreateTable
CREATE TABLE "EncryptedFile" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "encryptedMetadata" TEXT NOT NULL,
    "metadataIv" TEXT NOT NULL,
    "fileIv" TEXT NOT NULL,
    "encryptionKeyHash" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateIndex
CREATE INDEX "EncryptedFile_encryptionKeyHash_idx" ON "EncryptedFile"("encryptionKeyHash");
