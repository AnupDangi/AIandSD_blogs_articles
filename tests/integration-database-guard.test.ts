import { describe, expect, it } from "vitest";
import { requireIntegrationDatabaseUrl } from "../scripts/integration-database";

describe("disposable database acceptance target", () => {
  it("accepts only the explicit loopback test database and test role", () => {
    const url = "postgresql://academy_test@127.0.0.1:55432/learnlikeadev_test_example";
    expect(requireIntegrationDatabaseUrl({ ACADEMY_TEST_DATABASE_URL: url })).toBe(url);
  });

  it("rejects absent, remote, production-named, or non-test-role targets without echoing credentials", () => {
    const urls = [undefined, "postgresql://academy_test:synthetic-secret@db.example.com/learnlikeadev_test_ci", "postgresql://academy_test@127.0.0.1:55432/postgres", "postgresql://postgres@127.0.0.1:55432/learnlikeadev_test_ci"];
    for (const url of urls) {
      expect(() => requireIntegrationDatabaseUrl({ ACADEMY_TEST_DATABASE_URL: url })).toThrow(/local|test/i);
      try { requireIntegrationDatabaseUrl({ ACADEMY_TEST_DATABASE_URL: url }); } catch (error) {
        expect(String(error)).not.toContain("synthetic-secret");
      }
    }
  });

  it("rejects connection-query overrides that could redirect a loopback URL", () => {
    for (const query of ["?host=db.remote.example", "?user=postgres", "?dbname=postgres", "?sslmode=disable"]) {
      expect(() => requireIntegrationDatabaseUrl({ ACADEMY_TEST_DATABASE_URL: `postgresql://academy_test@127.0.0.1:55432/learnlikeadev_test_ci${query}` })).toThrow();
    }
  });
});
