import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const db =
  globalForPrisma.prisma ??
  new PrismaClient({ log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"] });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = db;

/**
 * Case-insensitive substring match.
 *
 * Postgres `LIKE` is case-sensitive, so a bare `contains` would make searching
 * "derja" stop matching "Derja". Always use this for user-entered search terms.
 */
export const ilike = (value: string) => ({
  contains: value,
  mode: "insensitive" as const,
});
