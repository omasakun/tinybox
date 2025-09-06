import { PrismaClient } from "@prisma/client";

declare global {
  var __prisma: PrismaClient | undefined;
}

// Store globally to prevent recreation during development reloads
const prisma = globalThis.__prisma || new PrismaClient();

if (process.env.NODE_ENV === "development") {
  globalThis.__prisma = prisma;
}

export { prisma };
