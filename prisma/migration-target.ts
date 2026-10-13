import { assertImportTargetIdentity, requireDirectUrl, type ImportTarget } from "./target-guards";

type MigrationEnvironment = Record<string, string | undefined>;

/** Reject an ambiguous database target before Prisma is allowed to migrate it. */
export function requireMigrationTarget(env: MigrationEnvironment): ImportTarget {
  const target = env.CURRICULUM_IMPORT_TARGET;
  if (target !== "staging" && target !== "production") {
    throw new Error("CURRICULUM_IMPORT_TARGET must explicitly be staging or production for Prisma migrations.");
  }

  const directUrl = requireDirectUrl(env);
  assertImportTargetIdentity({
    target,
    supabaseUrl: env.NEXT_PUBLIC_SUPABASE_URL,
    databaseUrl: directUrl,
    stagingProjectRef: env.CURRICULUM_STAGING_PROJECT_REF,
    productionProjectRef: env.CURRICULUM_PRODUCTION_PROJECT_REF,
  });

  // Supabase's transaction pooler (6543) cannot be used for Prisma migrations.
  // The project-qualified session pooler (5432) and direct host are supported.
  const databaseUrl = new URL(directUrl);
  const hostname = databaseUrl.hostname.toLowerCase();
  if (hostname.startsWith("db.") && databaseUrl.port !== "5432") {
    throw new Error("DIRECT_URL must use the Supabase direct database host on port 5432.");
  }
  if (hostname.endsWith(".pooler.supabase.com") && databaseUrl.port !== "5432") {
    throw new Error("DIRECT_URL must use the Supabase session pooler on port 5432, not the transaction pooler.");
  }

  return target;
}
