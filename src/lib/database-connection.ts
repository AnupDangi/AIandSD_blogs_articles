/** Pure connection resolution for the Postgres client. No secrets are logged or returned in errors. */
export type DatabaseConnection = {
  connectionString: string;
  /** Present for Supabase hosts: verify the server against Supabase's root CA. */
  ssl?: { ca: string; rejectUnauthorized: true };
};

type Env = Record<string, string | undefined>;

// Parameters that only make sense to libpq or Prisma, or that would override the explicit TLS settings.
const STRIPPED_PARAMS = ["sslmode", "sslrootcert", "sslcert", "sslkey", "supa", "pgbouncer", "connection_limit", "pool_timeout", "uselibpqcompat", "schema"];

export function isSupabaseHost(hostname: string): boolean {
  const host = hostname.toLowerCase();
  return host === "supabase.co" || host === "supabase.com" || host.endsWith(".supabase.co") || host.endsWith(".supabase.com");
}

/**
 * `DATABASE_URL` wins. If it is absent, fall back to the pooled URL the Supabase integration adds to
 * Vercel (`POSTGRES_PRISMA_URL`, then `POSTGRES_URL`). Supabase hosts are always verified against the
 * embedded root CA, whatever sslmode the URL carries. Other hosts (local test databases) are used as given.
 */
export function resolveDatabaseConnection(env: Env, supabaseCa: string): DatabaseConnection | null {
  const raw = env.DATABASE_URL?.trim() || env.POSTGRES_PRISMA_URL?.trim() || env.POSTGRES_URL?.trim();
  if (!raw) return null;
  let url: URL;
  try { url = new URL(raw); } catch { return null; }
  if (!["postgres:", "postgresql:"].includes(url.protocol)) return null;
  if (!isSupabaseHost(url.hostname)) return { connectionString: raw };
  for (const name of STRIPPED_PARAMS) url.searchParams.delete(name);
  return { connectionString: url.toString(), ssl: { ca: supabaseCa, rejectUnauthorized: true } };
}
