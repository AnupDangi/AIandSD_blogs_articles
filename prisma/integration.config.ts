import { defineConfig } from "prisma/config";
import { requireIntegrationDatabaseUrl } from "../scripts/integration-database";

// No .env loader and no fallback to DATABASE_URL/DIRECT_URL. This config exists
// only to deploy the same checked-in migrations into a disposable local test DB.
export default defineConfig({
  schema: "./schema.prisma",
  migrations: { path: "./migrations" },
  datasource: { url: requireIntegrationDatabaseUrl(process.env) },
});
