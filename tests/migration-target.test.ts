import { describe, expect, it } from "vitest";
import { requireMigrationTarget } from "@/../prisma/migration-target";

const stagingRef = "abcdefghijklmnopqrst";
const productionRef = "uvwxyz0123456789abcd";

const staging = {
  CURRICULUM_IMPORT_TARGET: "staging",
  CURRICULUM_STAGING_PROJECT_REF: stagingRef,
  CURRICULUM_PRODUCTION_PROJECT_REF: productionRef,
  NEXT_PUBLIC_SUPABASE_URL: `https://${stagingRef}.supabase.co`,
  DIRECT_URL: `postgresql://postgres:pw@db.${stagingRef}.supabase.co:5432/postgres`,
};

describe("Prisma migration target", () => {
  it("accepts an explicit staging target whose app and direct database refs match", () => {
    expect(requireMigrationTarget(staging)).toBe("staging");
  });

  it("accepts production and its project-qualified session pooler", () => {
    expect(requireMigrationTarget({
      ...staging,
      CURRICULUM_IMPORT_TARGET: "production",
      NEXT_PUBLIC_SUPABASE_URL: `https://${productionRef}.supabase.co`,
      DIRECT_URL: `postgresql://postgres.${productionRef}:pw@aws-0-us-east-1.pooler.supabase.com:5432/postgres`,
    })).toBe("production");
  });

  it("accepts the explicitly selected production project when no staging project is configured", () => {
    expect(requireMigrationTarget({
      CURRICULUM_IMPORT_TARGET: "production",
      CURRICULUM_PRODUCTION_PROJECT_REF: productionRef,
      NEXT_PUBLIC_SUPABASE_URL: `https://${productionRef}.supabase.co`,
      DIRECT_URL: `postgresql://postgres.${productionRef}:pw@aws-0-us-east-1.pooler.supabase.com:5432/postgres`,
    })).toBe("production");
  });

  it("rejects missing and ambiguous target configuration", () => {
    expect(() => requireMigrationTarget({ ...staging, CURRICULUM_IMPORT_TARGET: undefined })).toThrow(/explicitly/);
    expect(() => requireMigrationTarget({ ...staging, CURRICULUM_IMPORT_TARGET: "auto" })).toThrow(/explicitly/);
    expect(() => requireMigrationTarget({ ...staging, DIRECT_URL: undefined })).toThrow(/DIRECT_URL is required/);
    expect(() => requireMigrationTarget({ ...staging, NEXT_PUBLIC_SUPABASE_URL: undefined })).toThrow(/both.*required/i);
    expect(() => requireMigrationTarget({ ...staging, CURRICULUM_PRODUCTION_PROJECT_REF: undefined })).toThrow(/PRODUCTION_PROJECT_REF must be a valid project ref/);
    expect(() => requireMigrationTarget({ ...staging, CURRICULUM_PRODUCTION_PROJECT_REF: "invalid" })).toThrow(/PRODUCTION_PROJECT_REF must be a valid project ref/);
    expect(() => requireMigrationTarget({ ...staging, CURRICULUM_PRODUCTION_PROJECT_REF: stagingRef })).toThrow(/different/);
  });

  it("rejects the wrong database or public project for the selected target", () => {
    expect(() => requireMigrationTarget({ ...staging, DIRECT_URL: `postgresql://postgres:pw@db.${productionRef}.supabase.co:5432/postgres` })).toThrow(/does not match/);
    expect(() => requireMigrationTarget({ ...staging, NEXT_PUBLIC_SUPABASE_URL: `https://${productionRef}.supabase.co` })).toThrow(/does not match/);
  });

  it("rejects transaction pooling and non-Supabase database hosts", () => {
    expect(() => requireMigrationTarget({
      ...staging,
      DIRECT_URL: `postgresql://postgres:pw@db.${stagingRef}.supabase.co:6543/postgres`,
    })).toThrow(/direct database host on port 5432/);
    expect(() => requireMigrationTarget({
      ...staging,
      DIRECT_URL: `postgresql://postgres.${stagingRef}:pw@aws-0-us-east-1.pooler.supabase.com:6543/postgres`,
    })).toThrow(/session pooler/);
    expect(() => requireMigrationTarget({ ...staging, DIRECT_URL: "postgresql://postgres:pw@localhost:5432/postgres" })).toThrow(/Supabase project/);
  });

  it("does not honor the disposable import-test escape for Prisma migrations", () => {
    expect(() => requireMigrationTarget({
      ...staging,
      ACADEMY_IMPORT_TEST_TARGET: "disposable",
      DIRECT_URL: "postgresql://academy_test@127.0.0.1:55432/learnlikeadev_test_abc123",
    })).toThrow(/Supabase project/);
  });
});
