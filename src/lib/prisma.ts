import { PrismaClient } from "@prisma/client";

// Standard Next.js + Prisma singleton pattern. In dev, Next's HMR would
// otherwise create a new PrismaClient (and a new DB connection pool) on
// every file change, eventually exhausting Postgres's connection limit.
// Caching the instance on `globalThis` survives module reloads.

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma =
  globalForPrisma.prisma ?? new PrismaClient({ log: process.env.PRISMA_LOG_QUERIES === "true" ? ["query"] : [] });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}

export default prisma;
