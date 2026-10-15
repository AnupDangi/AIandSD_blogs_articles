import { readFileSync } from "node:fs";
import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { isSupabaseHost, resolveDatabaseConnection } from "../src/lib/database-connection";
import { SUPABASE_ROOT_CA } from "../src/lib/server/supabase-root-ca";

const CA = "-----BEGIN CERTIFICATE-----\nTEST\n-----END CERTIFICATE-----";
const pooled = "postgres://postgres.abcdefghijklmnopqrst:secret@aws-0-ap-southeast-2.pooler.supabase.com:6543/postgres?sslmode=require&supa=base-pooler.x&pgbouncer=true";

describe("resolveDatabaseConnection", () => {
  it("returns null when nothing is configured or the URL is not Postgres", () => {
    expect(resolveDatabaseConnection({}, CA)).toBeNull();
    expect(resolveDatabaseConnection({ DATABASE_URL: "   " }, CA)).toBeNull();
    expect(resolveDatabaseConnection({ DATABASE_URL: "not a url" }, CA)).toBeNull();
    expect(resolveDatabaseConnection({ DATABASE_URL: "https://aws-0.pooler.supabase.com/x" }, CA)).toBeNull();
  });

  it("prefers DATABASE_URL, then the integration's POSTGRES_PRISMA_URL, then POSTGRES_URL", () => {
    const explicit = "postgres://u:p@db.example.supabase.co:5432/postgres";
    expect(resolveDatabaseConnection({ DATABASE_URL: explicit, POSTGRES_PRISMA_URL: pooled }, CA)!.connectionString).toContain("db.example.supabase.co");
    expect(resolveDatabaseConnection({ POSTGRES_PRISMA_URL: pooled, POSTGRES_URL: explicit }, CA)!.connectionString).toContain("pooler.supabase.com");
    expect(resolveDatabaseConnection({ POSTGRES_URL: explicit }, CA)!.connectionString).toContain("db.example.supabase.co");
  });

  it("verifies Supabase hosts against the embedded CA and removes parameters that would override it", () => {
    const connection = resolveDatabaseConnection({ POSTGRES_PRISMA_URL: pooled }, CA)!;
    expect(connection.ssl).toEqual({ ca: CA, rejectUnauthorized: true });
    const url = new URL(connection.connectionString);
    for (const name of ["sslmode", "supa", "pgbouncer", "sslrootcert"]) expect(url.searchParams.has(name)).toBe(false);
    expect(url.hostname).toBe("aws-0-ap-southeast-2.pooler.supabase.com");
    expect(url.port).toBe("6543");
    expect(decodeURIComponent(url.password)).toBe("secret");
  });

  it("also normalizes a DATABASE_URL that points at a certificate file path", () => {
    const withFile = "postgresql://postgres.ref:pw@aws-0.pooler.supabase.com:6543/postgres?sslmode=verify-full&sslrootcert=certs/supabase-prod-root.crt";
    const connection = resolveDatabaseConnection({ DATABASE_URL: withFile }, CA)!;
    expect(new URL(connection.connectionString).search).toBe("");
    expect(connection.ssl?.rejectUnauthorized).toBe(true);
  });

  it("leaves non-Supabase hosts (local test databases) exactly as given", () => {
    const local = "postgresql://academy_test@127.0.0.1:54329/learnlikeadev_test_local";
    expect(resolveDatabaseConnection({ DATABASE_URL: local }, CA)).toEqual({ connectionString: local });
  });

  it("recognizes Supabase hosts strictly", () => {
    expect(isSupabaseHost("db.abc.supabase.co")).toBe(true);
    expect(isSupabaseHost("aws-0-ap-southeast-2.pooler.supabase.com")).toBe(true);
    expect(isSupabaseHost("supabase.com.evil.example")).toBe(false);
    expect(isSupabaseHost("evilsupabase.co")).toBe(false);
    expect(isSupabaseHost("127.0.0.1")).toBe(false);
  });
});

describe("embedded Supabase root CA", () => {
  it("is identical to the committed certificate file", () => {
    const file = readFileSync(new URL("../certs/supabase-prod-root.crt", import.meta.url), "utf8").trim();
    expect(SUPABASE_ROOT_CA.trim()).toBe(file);
    expect(SUPABASE_ROOT_CA).toContain("BEGIN CERTIFICATE");
    expect(SUPABASE_ROOT_CA).not.toMatch(/PRIVATE KEY/);
  });
});
