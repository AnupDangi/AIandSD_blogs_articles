import { loadEnvConfig } from "@next/env";
import { defineConfig } from "prisma/config";
import { requireMigrationTarget } from "./prisma/migration-target";
import { assertPrismaCommandAllowed, isPrismaDatabaseCommand } from "./prisma/target-guards";

loadEnvConfig(process.cwd());

if (isPrismaDatabaseCommand(process.argv)) {
  const target = requireMigrationTarget(process.env);
  assertPrismaCommandAllowed(process.argv, target);
}
const directUrl = process.env.DIRECT_URL;

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: { path: "prisma/migrations" },
  datasource: {
    // Generation/builds stay credential-free; every migration command is guarded above.
    url: directUrl ?? "postgresql://placeholder:placeholder@127.0.0.1:5432/placeholder",
  },
});
