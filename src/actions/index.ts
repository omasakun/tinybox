import { defineAction, ActionError } from "astro:actions";
import { z } from "astro:schema";
import path from "path";
import fs from "fs";
import { v4 as uuidv4 } from "uuid";
import { prisma } from "@/lib/prisma";

export const server = {
  store: defineAction({
    accept: "form",
    input: z.object({
      encryptedFile: z.instanceof(File),
      encryptedMetadata: z.string().min(1, "Encrypted metadata is required"),
      metadataIv: z.string().min(1, "Metadata IV is required"),
      fileIv: z.string().min(1, "File IV is required"),
      keyHash: z.string().min(1, "Key hash is required"),
    }),
    handler: async (input) => {
      const { encryptedFile, encryptedMetadata, metadataIv, fileIv, keyHash } = input;

      if (!encryptedFile || encryptedFile.size === 0) {
        throw new ActionError({
          code: "BAD_REQUEST",
          message: "Invalid file provided",
        });
      }

      try {
        // Generate UUID for file
        const fileId = uuidv4();
        const filename = `${fileId}.bin`;

        // Ensure upload directory exists
        const uploadDir = path.join(process.cwd(), "uploads");
        await fs.promises.mkdir(uploadDir, { recursive: true });

        // Save file
        const filePath = path.join(uploadDir, filename);
        const arrayBuffer = await encryptedFile.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);
        await fs.promises.writeFile(filePath, buffer);

        // Save metadata to database
        const encryptedFileRecord = await prisma.encryptedFile.create({
          data: {
            id: fileId,
            encryptedMetadata,
            metadataIv,
            fileIv,
            encryptionKeyHash: keyHash,
          },
        });

        return {
          success: true,
          message: "File uploaded successfully",
          fileId: encryptedFileRecord.id,
        };
      } catch (error) {
        console.error("File upload error:", error);
        throw new ActionError({
          code: "INTERNAL_SERVER_ERROR",
          message: error instanceof Error ? error.message : "File upload failed",
        });
      }
    },
  }),

  list: defineAction({
    accept: "json",
    input: z.object({
      keyHash: z.string().min(1, "Key hash is required"),
    }),
    handler: async ({ keyHash }) => {
      try {
        const encryptedFiles = await prisma.encryptedFile.findMany({
          where: {
            encryptionKeyHash: keyHash,
          },
          orderBy: {
            createdAt: "desc",
          },
        });

        const files = encryptedFiles.map((file) => ({
          id: file.id,
          encryptedMetadata: file.encryptedMetadata,
          metadataIv: file.metadataIv,
          fileIv: file.fileIv,
          uploadedAt: file.createdAt.toISOString(),
        }));

        return { files };
      } catch (error) {
        console.error("File list fetch error:", error);
        throw new ActionError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to fetch file list",
        });
      }
    },
  }),

  info: defineAction({
    accept: "json",
    input: z.object({
      fileId: z.string().uuid("Invalid file ID format"),
    }),
    handler: async ({ fileId }) => {
      try {
        const fileInfo = await prisma.encryptedFile.findUnique({
          where: {
            id: fileId,
          },
        });

        if (!fileInfo) {
          throw new ActionError({
            code: "NOT_FOUND",
            message: "File not found",
          });
        }

        return {
          id: fileInfo.id,
          encryptedMetadata: fileInfo.encryptedMetadata,
          metadataIv: fileInfo.metadataIv,
          fileIv: fileInfo.fileIv,
          encryptionKeyHash: fileInfo.encryptionKeyHash,
          uploadedAt: fileInfo.createdAt.toISOString(),
        };
      } catch (error) {
        if (error instanceof ActionError) throw error;
        console.error("File info fetch error:", error);
        throw new ActionError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to fetch file information",
        });
      }
    },
  }),

  fetch: defineAction({
    accept: "json",
    input: z.object({
      fileId: z.string().uuid("Invalid file ID format"),
    }),
    handler: async ({ fileId }) => {
      try {
        const filename = `${fileId}.bin`;
        const filePath = path.join(process.cwd(), "uploads", filename);

        const fileExists = await fs.promises
          .access(filePath, fs.constants.F_OK)
          .then(() => true)
          .catch(() => false);

        if (!fileExists) {
          throw new ActionError({
            code: "NOT_FOUND",
            message: "File not found",
          });
        }

        const encryptedFile = await fs.promises.readFile(filePath);
        const base64Data = Buffer.from(encryptedFile).toString("base64");

        return {
          data: base64Data,
          filename: filename,
        };
      } catch (error) {
        if (error instanceof ActionError) throw error;
        console.error("File download error:", error);
        throw new ActionError({
          code: "INTERNAL_SERVER_ERROR",
          message: "File download failed",
        });
      }
    },
  }),
};
