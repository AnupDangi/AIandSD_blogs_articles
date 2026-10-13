import { createRequire } from "node:module";
import { requireMigrationTarget } from "./migration-target";

const require = createRequire(import.meta.url);
const { loadEnvConfig } = require("@next/env") as typeof import("@next/env");
loadEnvConfig(process.cwd());
requireMigrationTarget(process.env);
