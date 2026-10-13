import { defineConfig } from "vitest/config";
import { fileURLToPath, URL } from "node:url";
import { requireIntegrationDatabaseUrl } from "./scripts/integration-database";

requireIntegrationDatabaseUrl(process.env);

export default defineConfig({
  resolve: { alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) } },
  test: {
    environment: "node",
    include: ["integration/**/*.integration.ts"],
    fileParallelism: false,
    maxWorkers: 1,
    testTimeout: 20_000,
    hookTimeout: 20_000,
    restoreMocks: true,
    clearMocks: true,
  },
});
