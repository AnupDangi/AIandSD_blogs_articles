import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/generated/prisma/client";
import { resolveDatabaseConnection } from "@/lib/database-connection";
import { SUPABASE_ROOT_CA } from "@/lib/server/supabase-root-ca";

const globalForPrisma = globalThis as typeof globalThis & {
  learnLikeDb?: PrismaClient;
};

export function getDatabase() {
  const connection = resolveDatabaseConnection(process.env, SUPABASE_ROOT_CA);
  if (!connection) return null;

  if (!globalForPrisma.learnLikeDb) {
    const adapter = new PrismaPg(connection);
    globalForPrisma.learnLikeDb = new PrismaClient({ adapter });
  }

  return globalForPrisma.learnLikeDb;
}
