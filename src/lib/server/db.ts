import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/generated/prisma/client";

const globalForPrisma = globalThis as typeof globalThis & {
  learnLikeDb?: PrismaClient;
};

export function getDatabase() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) return null;

  if (!globalForPrisma.learnLikeDb) {
    const adapter = new PrismaPg({ connectionString });
    globalForPrisma.learnLikeDb = new PrismaClient({ adapter });
  }

  return globalForPrisma.learnLikeDb;
}
