import { spawn, type ChildProcess } from "node:child_process";
import { existsSync, mkdtempSync, readFileSync, realpathSync, rmSync } from "node:fs";
import { createServer } from "node:net";
import { tmpdir } from "node:os";
import { basename, dirname, join, delimiter } from "node:path";
import { randomBytes } from "node:crypto";
import { requireIntegrationDatabaseUrl } from "./integration-database";

const project = process.cwd();
const workspace = mkdtempSync(join(tmpdir(), "academy-db-"));
let postgresDirectory: string | undefined;
let running = false;
let startAttempted = false;
let interrupted: "SIGINT" | "SIGTERM" | undefined;
let activeChild: { child: ChildProcess; interruptible: boolean } | undefined;
let teardown: Promise<void> | undefined;
let killTimer: NodeJS.Timeout | undefined;

function interrupt(signal: "SIGINT" | "SIGTERM") {
  if (interrupted) return;
  interrupted = signal;
  process.exitCode = signal === "SIGINT" ? 130 : 143;
  // Let pg_ctl finish startup before stopping its server. Killing pg_ctl while
  // it forks Postgres can otherwise leave an unobserved live cluster.
  if (activeChild?.interruptible && activeChild.child.pid) {
    try {
      if (process.platform === "win32") activeChild.child.kill("SIGTERM");
      else process.kill(-activeChild.child.pid, "SIGTERM");
      const child = activeChild.child;
      killTimer = setTimeout(() => {
        try {
          if (process.platform === "win32") child.kill("SIGKILL");
          else if (child.pid) process.kill(-child.pid, "SIGKILL");
        } catch { /* It already exited. */ }
      }, 5000);
      killTimer.unref();
    } catch { /* The process may have exited between the signal and this call. */ }
  }
}
const onInterrupt = () => interrupt("SIGINT");
const onTerminate = () => interrupt("SIGTERM");
process.on("SIGINT", onInterrupt);
process.on("SIGTERM", onTerminate);

function postgresBin() {
  if (process.env.PG_BIN) return process.env.PG_BIN;
  for (const directory of (process.env.PATH ?? "").split(delimiter)) {
    const path = join(directory, "postgres");
    if (existsSync(path)) return dirname(realpathSync(path));
  }
  throw new Error("Install PostgreSQL server tools or set PG_BIN to their bin directory; the test runner never falls back to the app database.");
}

function run(command: string, args: string[], env: NodeJS.ProcessEnv, visible = false, phase: "normal" | "startup" | "cleanup" = "normal") {
  if (interrupted && phase !== "cleanup") return Promise.reject(new Error("Database acceptance interrupted."));
  return new Promise<void>((resolve, reject) => {
    const child = spawn(command, args, { cwd: project, env, detached: process.platform !== "win32", stdio: visible ? "inherit" : ["ignore", "pipe", "pipe"] });
    activeChild = { child, interruptible: phase === "normal" };
    let diagnostic = "";
    // Hidden bootstrap commands receive only generated local paths/identifiers
    // and no credentials. Retain bounded stderr to diagnose OS/port failures.
    child.on("error", () => reject(new Error("A database acceptance subprocess could not start.")));
    child.on("close", (code) => {
      if (activeChild?.child === child) activeChild = undefined;
      if (killTimer) clearTimeout(killTimer);
      killTimer = undefined;
      if (interrupted && phase !== "cleanup") reject(new Error("Database acceptance interrupted."));
      else if (code === 0) resolve();
      else reject(new Error(`${basename(command)} exited with code ${code ?? "unknown"}.${visible ? "" : ` ${diagnostic.slice(-1200)}`}`));
    });
    child.stdout?.resume(); child.stderr?.on("data", (bytes) => { diagnostic = (diagnostic + String(bytes)).slice(-1200); });
  });
}

async function availablePort() {
  const server = createServer();
  await new Promise<void>((resolve, reject) => { server.once("error", reject); server.listen(0, "127.0.0.1", resolve); });
  const address = server.address();
  if (!address || typeof address === "string") throw new Error("Unable to allocate a local test port.");
  const port = address.port;
  await new Promise<void>((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
  return port;
}

// Do not pass inherited production credentials to Prisma, Vitest, or Postgres.
const isolatedEnv: NodeJS.ProcessEnv = {
  PATH: process.env.PATH, HOME: workspace, TMPDIR: workspace, LC_ALL: "C", LANG: "C",
  NODE_ENV: "test", NEXT_TELEMETRY_DISABLED: "1",
  NEXT_PUBLIC_SUPABASE_URL: "http://127.0.0.1:54321",
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "integration-public-placeholder",
  NEXT_PUBLIC_APP_URL: "https://academy.test",
  SUPABASE_SERVICE_ROLE_KEY: "", SERVICE_ROLE: "", SUPABASE_ACCESS_TOKEN: "",
  OPENAI_API_KEY: "", OPENROUTER_API_KEY: "", GOOGLE_CLIENT_SECRET: "", GITHUB_CLIENT_SECRET: "",
};

function cleanup() {
  // Signals only cancel normal work; finally owns one awaited teardown, even
  // when a second signal arrives during pg_ctl stop.
  return teardown ??= (async () => {
    let safeToRemove = !startAttempted;
    if (startAttempted && postgresDirectory) {
      try {
        await run(join(postgresDirectory, "pg_ctl"), ["-D", join(workspace, "cluster"), "-m", "fast", "-t", "10", "-w", "stop"], isolatedEnv, false, "cleanup");
        running = false;
        safeToRemove = true;
        console.log("Stopped the disposable Postgres cluster.");
      } catch {
        // Startup may have forked a server even when its client was interrupted
        // or failed. Keep the cluster unless pg_ctl confirms a successful stop.
        console.error("The test cluster could not be stopped; its workspace has been retained for cleanup.");
        if (!interrupted) process.exitCode = 1;
      }
    }
    if (safeToRemove) rmSync(workspace, { recursive: true, force: true });
  })();
}

try {
  let databaseUrl = process.env.ACADEMY_TEST_DATABASE_URL;
  if (!databaseUrl) {
    postgresDirectory = postgresBin();
    const cluster = join(workspace, "cluster");
    const port = await availablePort();
    const name = `learnlikeadev_test_${randomBytes(6).toString("hex")}`;
    await run(join(postgresDirectory, "initdb"), ["-D", cluster, "--username=academy_test", "--encoding=UTF8", "--no-locale", "--auth-local=trust", "--auth-host=trust"], isolatedEnv);
    startAttempted = true;
    await run(join(postgresDirectory, "pg_ctl"), ["-D", cluster, "-l", join(workspace, "postgres.log"), "-o", `-h 127.0.0.1 -p ${port} -k '' -c fsync=on -c max_connections=50`, "-t", "10", "-w", "start"], isolatedEnv, false, "startup");
    running = true;
    await run(join(postgresDirectory, "createdb"), ["-h", "127.0.0.1", "-p", String(port), "-U", "academy_test", name], isolatedEnv);
    databaseUrl = `postgresql://academy_test@127.0.0.1:${port}/${name}`;
    console.log("Started a disposable loopback Postgres cluster; no production credentials loaded.");
  }
  const target = requireIntegrationDatabaseUrl({ ACADEMY_TEST_DATABASE_URL: databaseUrl });
  const env = { ...isolatedEnv, ACADEMY_TEST_DATABASE_URL: target, DATABASE_URL: target, DIRECT_URL: target };
  await run(process.execPath, [join(project, "node_modules/prisma/build/index.js"), "migrate", "deploy", "--config", "prisma/integration.config.ts"], env, true);
  await run(process.execPath, [join(project, "node_modules/vitest/vitest.mjs"), "run", "--config", "vitest.integration.config.ts", ...process.argv.slice(2)], env, true);
} catch (error) {
  console.error(error instanceof Error ? error.message : "Database acceptance failed.");
  const bootstrapLog = join(workspace, "postgres.log");
  if (!running && existsSync(bootstrapLog)) console.error(readFileSync(bootstrapLog, "utf8").slice(-1600));
  if (!interrupted) process.exitCode = 1;
} finally {
  await cleanup();
  process.off("SIGINT", onInterrupt);
  process.off("SIGTERM", onTerminate);
}
