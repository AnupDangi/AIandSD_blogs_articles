import { describe, expect, it } from "vitest";
import { configuredSecretNeedles, leakedSecretNames, redactConfiguredSecrets } from "../scripts/public-secret-scan";

describe("public asset secret checks", () => {
  it("detects encoded database passwords and reports only their variable name", () => {
    const password = "synthetic-password@2026";
    const needles = configuredSecretNeedles({ DATABASE_URL: `postgresql://user:${encodeURIComponent(password)}@localhost/db` });
    expect(leakedSecretNames(`asset: ${password}`, needles)).toEqual(["DATABASE_URL"]);
    expect(leakedSecretNames(`asset: ${encodeURIComponent(password)}`, needles)).toEqual(["DATABASE_URL"]);
    expect(JSON.stringify(leakedSecretNames(password, needles))).not.toContain(password);
  });

  it("checks provider/server credentials while permitting public auth configuration", () => {
    const needles = configuredSecretNeedles({ OPENAI_API_KEY: "synthetic-private-provider-key", NEXT_PUBLIC_SUPABASE_ANON_KEY: "public-browser-key", SUPABASE_SERVICE_ROLE_KEY: "synthetic-service-role-key" });
    expect(leakedSecretNames("public-browser-key", needles)).toEqual([]);
    expect(leakedSecretNames("synthetic-private-provider-key synthetic-service-role-key", needles).sort()).toEqual(["OPENAI_API_KEY", "SUPABASE_SERVICE_ROLE_KEY"]);
  });

  it("ignores empty keys and non-secret local database placeholders", () => {
    expect(configuredSecretNeedles({ OPENAI_API_KEY: "", DATABASE_URL: "postgresql://disabled:disabled@localhost/disabled" })).toEqual([]);
  });

  it("redacts configured secrets in failure paths and repeated occurrences", () => {
    const value = "synthetic-secret-in-a-filename";
    const needles = configuredSecretNeedles({ OPENAI_API_KEY: value });
    expect(redactConfiguredSecrets(`/public/${value}/${value}.txt`, needles)).toBe("/public/[REDACTED]/[REDACTED].txt");
  });
});
