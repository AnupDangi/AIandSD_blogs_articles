/**
 * Local full-stack dev: a persistent loopback Postgres (data in .local-stack/), the checked-in
 * migrations, the draft course catalog, then `next dev` on port 3000.
 *
 * Sign-in still uses the Supabase project from .env.local (real Google/GitHub/email accounts),
 * but every learner record (progress, quiz attempts, hints, bookmarks) lands in the local database.
 * The catalog is marked published in this local database only so quizzes and hints can be exercised;
 * the production importer's human-review gate is untouched and nothing here can reach production.
 */
import { spawn, spawnSync } from "node:child_process";
import { existsSync, mkdirSync, realpathSync } from "node:fs";
import { dirname, delimiter, join } from "node:path";
import pg from "pg";
import { requireIntegrationDatabaseUrl } from "./integration-database";

const project = process.cwd();
const root = join(project, ".local-stack");
const cluster = join(root, "pgdata");
const log = join(root, "postgres.log");
const port = Number(process.env.LOCAL_STACK_DB_PORT ?? 54329);
const database = "learnlikeadev_test_local";
const databaseUrl = requireIntegrationDatabaseUrl({ ACADEMY_TEST_DATABASE_URL: `postgresql://academy_test@127.0.0.1:${port}/${database}` });

function postgresBin() {
  if (process.env.PG_BIN) return process.env.PG_BIN;
  for (const directory of (process.env.PATH ?? "").split(delimiter)) {
    const path = join(directory, "postgres");
    if (existsSync(path)) return dirname(realpathSync(path));
  }
  throw new Error("Install PostgreSQL server tools (for example `brew install postgresql@17`) or set PG_BIN to their bin directory.");
}

const bin = postgresBin();
const isolated: NodeJS.ProcessEnv = { NODE_ENV: "development", PATH: process.env.PATH, HOME: process.env.HOME, LC_ALL: "C", LANG: "C" };

function sh(command: string, args: string[], env: NodeJS.ProcessEnv = isolated, allowFailure = false) {
  const result = spawnSync(command, args, { cwd: project, env, stdio: ["ignore", "pipe", "pipe"], encoding: "utf8" });
  if (result.status !== 0 && !allowFailure) throw new Error(`${command} failed: ${(result.stderr || result.stdout).trim().slice(-600)}`);
  return result;
}

function clusterRunning() {
  return sh(join(bin, "pg_ctl"), ["-D", cluster, "status"], isolated, true).status === 0;
}

async function main() {
  mkdirSync(root, { recursive: true });
  if (!existsSync(join(cluster, "PG_VERSION"))) {
    console.log("Creating the local Postgres cluster in .local-stack/ …");
    sh(join(bin, "initdb"), ["-D", cluster, "--username=academy_test", "--encoding=UTF8", "--no-locale", "--auth-local=trust", "--auth-host=trust"]);
  }
  const startedByUs = !clusterRunning();
  if (startedByUs) {
    sh(join(bin, "pg_ctl"), ["-D", cluster, "-l", log, "-o", `-h 127.0.0.1 -p ${port} -k ''`, "-t", "20", "-w", "start"]);
  }
  console.log(`Local Postgres: 127.0.0.1:${port}/${database}`);
  sh(join(bin, "createdb"), ["-h", "127.0.0.1", "-p", String(port), "-U", "academy_test", database], isolated, true);

  const dbEnv = { ...process.env, DATABASE_URL: databaseUrl, DIRECT_URL: databaseUrl, ACADEMY_TEST_DATABASE_URL: databaseUrl };
  sh(process.execPath, [join(project, "node_modules/prisma/build/index.js"), "migrate", "deploy", "--config", "prisma/integration.config.ts"], dbEnv);
  console.log("Migrations are up to date.");

  const client = new pg.Client({ connectionString: databaseUrl });
  await client.connect();
  try {
    const count = Number((await client.query('select count(*) from app."CourseVersion"')).rows[0].count);
    if (count === 0) {
      console.log("Importing the draft course catalog (needs curriculum/private) …");
      const imported = sh(process.execPath, ["--import", "tsx", join(project, "prisma/import-curriculum.ts")], {
        ...dbEnv, CURRICULUM_IMPORT_TARGET: "staging", ACADEMY_IMPORT_TEST_TARGET: "disposable",
      }, true);
      if (imported.status !== 0) throw new Error(`Catalog import failed: ${(imported.stderr || imported.stdout).trim().slice(-600)}`);
    }
    await client.query('update app."CourseVersion" set "publishedAt" = now() where "publishedAt" is null');
    await client.query('update app."Assessment" set "publishedAt" = now() where "publishedAt" is null');
    await client.query('update app."Project" set "publishedAt" = now() where "publishedAt" is null');
    const published = (await client.query('select count(*) from app."Assessment" where "publishedAt" is not null')).rows[0].count;
    console.log(`Catalog ready in the local database (${published} assessments published locally).`);
  } finally {
    await client.end();
  }

  console.log("Starting the app on http://localhost:3000 (sign-in uses your Supabase project; learner data stays local).\n");
  const app = spawn(process.execPath, [join(project, "node_modules/next/dist/bin/next"), "dev", "--port", "3000"], {
    cwd: project,
    stdio: "inherit",
    env: { ...process.env, DATABASE_URL: databaseUrl, DIRECT_URL: databaseUrl },
  });
  const stop = (signal: NodeJS.Signals) => { app.kill(signal); };
  process.on("SIGINT", () => stop("SIGINT"));
  process.on("SIGTERM", () => stop("SIGTERM"));
  const code = await new Promise<number>((resolve) => app.on("close", (value) => resolve(value ?? 0)));
  if (startedByUs) sh(join(bin, "pg_ctl"), ["-D", cluster, "-m", "fast", "-t", "10", "-w", "stop"], isolated, true);
  process.exit(code);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : "Local stack failed to start.");
  process.exit(1);
});
