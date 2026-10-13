import { describe, expect, it } from "vitest";
import { validateFormativeAnswerPattern } from "@/../prisma/import-integrity";
import {
  assertImportTargetIdentity,
  databaseProjectRef,
  assertPrismaCommandAllowed,
  isDisposableLocalTestDatabaseUrl,
  isPrismaDatabaseCommand,
  requireDirectUrl,
} from "@/../prisma/target-guards";

const staging = "abcdefghijklmnopqrst";
const production = "uvwxyz0123456789abcd";

describe("database deployment guards", () => {
  it("requires DIRECT_URL before any Prisma migration subcommand", () => {
    expect(isPrismaDatabaseCommand(["node", "prisma", "migrate", "deploy"])).toBe(true);
    expect(isPrismaDatabaseCommand(["node", "prisma", "db", "push"])).toBe(true);
    expect(isPrismaDatabaseCommand(["node", "prisma", "db", "execute"])).toBe(true);
    expect(isPrismaDatabaseCommand(["node", "prisma", "db", "pull"])).toBe(true);
    expect(isPrismaDatabaseCommand(["node", "prisma", "studio"])).toBe(true);
    expect(isPrismaDatabaseCommand(["node", "prisma", "generate"])).toBe(false);
    expect(() => requireDirectUrl({})).toThrow(/DIRECT_URL is required/);
  });

  it("blocks schema bypasses, reset, interactive studio, and production development commands", () => {
    for (const argv of [
      ["node", "prisma", "db", "push"],
      ["node", "prisma", "db", "execute"],
      ["node", "prisma", "db", "seed"],
      ["node", "prisma", "migrate", "reset", "--force"],
      ["node", "prisma", "studio"],
    ]) {
      expect(() => assertPrismaCommandAllowed(argv, "staging")).toThrow(/blocked/);
    }
    expect(() => assertPrismaCommandAllowed(["node", "prisma", "migrate", "dev"], "production")).toThrow(/production/);
    expect(() => assertPrismaCommandAllowed(["node", "prisma", "migrate", "resolve"], "production")).toThrow(/production/);
  });

  it("keeps the controlled deploy/status/diff commands available for the selected target", () => {
    for (const command of ["deploy", "status", "diff"]) {
      expect(() => assertPrismaCommandAllowed(["node", "prisma", "migrate", command], "production")).not.toThrow();
    }
  });

  it("accepts a direct Supabase database endpoint matching the staging project", () => {
    expect(assertImportTargetIdentity({
      target: "staging",
      supabaseUrl: `https://${staging}.supabase.co`,
      databaseUrl: `postgresql://postgres:pw@db.${staging}.supabase.co:5432/postgres`,
      stagingProjectRef: staging,
      productionProjectRef: production,
    })).toBe(staging);
  });

  it("allows the owner-selected production project without requiring an unconfigured staging project", () => {
    expect(assertImportTargetIdentity({
      target: "production",
      supabaseUrl: `https://${production}.supabase.co`,
      databaseUrl: `postgresql://postgres:pw@db.${production}.supabase.co:5432/postgres`,
      stagingProjectRef: undefined,
      productionProjectRef: production,
    })).toBe(production);
  });

  it("accepts a project-qualified Supabase pooler username", () => {
    expect(databaseProjectRef(`postgresql://postgres.${staging}:pw@aws-0-us-east-1.pooler.supabase.com:6543/postgres`)).toBe(staging);
  });

  it("rejects a production project when the requested import target is staging", () => {
    expect(() => assertImportTargetIdentity({
      target: "staging",
      supabaseUrl: `https://${production}.supabase.co`,
      databaseUrl: `postgresql://postgres.${production}:pw@aws-0-us-east-1.pooler.supabase.com:6543/postgres`,
      stagingProjectRef: staging,
      productionProjectRef: production,
    })).toThrow(/does not match its configured Supabase project ref/);
  });

  it("rejects missing or shared environment identities", () => {
    expect(() => assertImportTargetIdentity({
      target: "staging",
      supabaseUrl: undefined,
      databaseUrl: undefined,
      stagingProjectRef: staging,
      productionProjectRef: production,
    })).toThrow(/NEXT_PUBLIC_SUPABASE_URL and DIRECT_URL are both required/);
    expect(() => assertImportTargetIdentity({
      target: "staging",
      supabaseUrl: `https://${staging}.supabase.co`,
      databaseUrl: `postgresql://postgres:pw@db.${staging}.supabase.co:5432/postgres`,
      stagingProjectRef: staging,
      productionProjectRef: staging,
    })).toThrow(/must be different/);
    expect(() => assertImportTargetIdentity({
      target: "staging",
      supabaseUrl: `https://${staging}.supabase.co`,
      databaseUrl: `postgresql://postgres:pw@db.${staging}.supabase.co:5432/postgres`,
      stagingProjectRef: staging,
      productionProjectRef: undefined,
    })).toThrow(/PRODUCTION_PROJECT_REF must be a valid project ref/);
    expect(() => assertImportTargetIdentity({
      target: "staging",
      supabaseUrl: `https://${staging}.supabase.co`,
      databaseUrl: `postgresql://postgres:pw@db.${staging}.supabase.co:5432/postgres`,
      stagingProjectRef: staging,
      productionProjectRef: "invalid",
    })).toThrow(/valid project ref/);
  });
});

describe("disposable import-test escape", () => {
  const disposableUrl = (overrides: Partial<Record<"host" | "port" | "database", string>> = {}) =>
    `postgresql://academy_test@${overrides.host ?? "127.0.0.1"}:${overrides.port ?? "55432"}/${overrides.database ?? "learnlikeadev_test_abc123"}`;

  it("accepts only local loopback URLs with an explicit port and a learnlikeadev_test database", () => {
    expect(isDisposableLocalTestDatabaseUrl(disposableUrl())).toBe(true);
    expect(isDisposableLocalTestDatabaseUrl(disposableUrl({ host: "localhost" }))).toBe(true);
    expect(isDisposableLocalTestDatabaseUrl(disposableUrl({ host: "127.0.0.1", database: "learnlikeadev_test_a1b2c3d4e5" }))).toBe(true);
    expect(isDisposableLocalTestDatabaseUrl(disposableUrl({ host: "example.com" }))).toBe(false);
    expect(isDisposableLocalTestDatabaseUrl(disposableUrl({ port: "" }))).toBe(false);
    expect(isDisposableLocalTestDatabaseUrl(disposableUrl({ database: "postgres" }))).toBe(false);
    expect(isDisposableLocalTestDatabaseUrl(disposableUrl({ database: "learnlikeadev_prod" }))).toBe(false);
    expect(isDisposableLocalTestDatabaseUrl(disposableUrl({ database: "learnlikeadev_test_" }))).toBe(false);
    expect(isDisposableLocalTestDatabaseUrl("not a url")).toBe(false);
    expect(isDisposableLocalTestDatabaseUrl("postgresql://academy_test@127.0.0.1:5432/learnlikeadev_test_abc?sslmode=disable")).toBe(false);
  });

  it("accepts the staging importer against a disposable local database only through the explicit escape", () => {
    expect(assertImportTargetIdentity({
      target: "staging",
      supabaseUrl: "http://127.0.0.1:54321",
      databaseUrl: disposableUrl(),
      stagingProjectRef: undefined,
      productionProjectRef: undefined,
      testTargetEnv: "disposable",
    })).toBe("disposable");
  });

  it("rejects the escape for the production target, unknown values, and non-disposable URLs", () => {
    expect(() => assertImportTargetIdentity({
      target: "production",
      supabaseUrl: `https://${production}.supabase.co`,
      databaseUrl: disposableUrl(),
      stagingProjectRef: staging,
      productionProjectRef: production,
      testTargetEnv: "disposable",
    })).toThrow(/limited to the staging import target/);
    expect(() => assertImportTargetIdentity({
      target: "staging",
      supabaseUrl: "http://127.0.0.1:54321",
      databaseUrl: disposableUrl(),
      stagingProjectRef: undefined,
      productionProjectRef: undefined,
      testTargetEnv: "local",
    })).toThrow(/only accepts the value "disposable"/);
    expect(() => assertImportTargetIdentity({
      target: "staging",
      supabaseUrl: "http://127.0.0.1:54321",
      databaseUrl: "postgresql://postgres:pw@example.com:5432/learnlikeadev_test_abc",
      stagingProjectRef: undefined,
      productionProjectRef: undefined,
      testTargetEnv: "disposable",
    })).toThrow(/learnlikeadev_test_<suffix> database/);
  });

  it("does not weaken Supabase identity checks when the escape is unset", () => {
    expect(() => assertImportTargetIdentity({
      target: "staging",
      supabaseUrl: "http://127.0.0.1:54321",
      databaseUrl: disposableUrl(),
      stagingProjectRef: staging,
      productionProjectRef: production,
      testTargetEnv: undefined,
    })).toThrow(/standard Supabase project ref/);
  });
});

describe("private formative key integrity", () => {
  const validLabels: string[] = [];
  const counts = { a: 0, b: 0, c: 0 };
  for (let index = 0; index < 200; index += 1) {
    const label = (["a", "b", "c"] as const)
      .filter((candidate) => index < 3 || candidate !== validLabels[index - 3])
      .sort((left, right) => counts[left] - counts[right] || left.localeCompare(right))[0];
    validLabels.push(label);
    counts[label] += 1;
  }
  const inputs = (labels: string[]) => ({
    questions: labels.map((_, index) => ({ id: `q${index}`, choiceIds: ["a", "b", "c"] })),
    keys: labels.map((correctChoiceId, index) => ({ questionId: `q${index}`, correctChoiceId })),
  });

  it("accepts a balanced label sequence without period-three repetition", () => {
    const { questions, keys } = inputs(validLabels);
    expect(() => validateFormativeAnswerPattern(questions, keys)).not.toThrow();
  });

  it("rejects unbalanced keys and obvious three-answer cycles", () => {
    const unbalanced = [...validLabels];
    unbalanced.fill("a", 0, 80);
    const cycle = Array.from({ length: 200 }, (_, index) => ["a", "b", "c"][index % 3]);
    const unbalancedInput = inputs(unbalanced);
    const cycleInput = inputs(cycle);
    expect(() => validateFormativeAnswerPattern(unbalancedInput.questions, unbalancedInput.keys)).toThrow(/balanced/);
    expect(() => validateFormativeAnswerPattern(cycleInput.questions, cycleInput.keys)).toThrow(/period three/);
  });
});
