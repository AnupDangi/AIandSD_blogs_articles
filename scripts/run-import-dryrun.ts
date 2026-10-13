import { spawn, type ChildProcess } from "node:child_process";
import { existsSync, mkdtempSync, readFileSync, realpathSync, rmSync } from "node:fs";
import { createServer } from "node:net";
import { tmpdir } from "node:os";
import { basename, delimiter, dirname, join } from "node:path";
import { randomBytes } from "node:crypto";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";
import { requireIntegrationDatabaseUrl } from "./integration-database";
import { assertImportTargetIdentity } from "../prisma/target-guards";

const project = process.cwd();
const workspace = mkdtempSync(join(tmpdir(), "academy-import-"));
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
  if (activeChild?.interruptible && activeChild.child.pid) {
    try {
      process.kill(-activeChild.child.pid, "SIGTERM");
      const child = activeChild.child;
      killTimer = setTimeout(() => {
        try {
          if (child.pid) process.kill(-child.pid, "SIGKILL");
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
  throw new Error("Install PostgreSQL server tools or set PG_BIN to their bin directory; the import dry-run never falls back to the app database.");
}

function run(command: string, args: string[], env: NodeJS.ProcessEnv, visible = false, phase: "normal" | "startup" | "cleanup" = "normal") {
  if (interrupted && phase !== "cleanup") return Promise.reject(new Error("Import dry-run interrupted."));
  return new Promise<{ code: number; output: string }>((resolve, reject) => {
    const child = spawn(command, args, { cwd: project, env, detached: true, stdio: visible ? ["ignore", "inherit", "inherit"] : ["ignore", "pipe", "pipe"] });
    activeChild = { child, interruptible: phase === "normal" };
    let diagnostic = "";
    child.on("error", () => reject(new Error("An import dry-run subprocess could not start.")));
    child.on("close", (code) => {
      if (activeChild?.child === child) activeChild = undefined;
      if (killTimer) clearTimeout(killTimer);
      killTimer = undefined;
      const captured = diagnostic;
      if (interrupted && phase !== "cleanup") reject(new Error("Import dry-run interrupted."));
      else if (code === 0) resolve({ code, output: captured });
      else {
        const failure = new Error(`${basename(command)} exited with code ${code ?? "unknown"}.`) as Error & { code?: number; output?: string };
        failure.code = code ?? undefined;
        failure.output = captured;
        reject(failure);
      }
    });
    child.stdout?.on("data", (bytes) => { diagnostic = (diagnostic + String(bytes)).slice(-4000); });
    child.stderr?.on("data", (bytes) => { diagnostic = (diagnostic + String(bytes)).slice(-4000); });
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

const isolatedEnv: NodeJS.ProcessEnv = {
  PATH: process.env.PATH, HOME: workspace, TMPDIR: workspace, LC_ALL: "C", LANG: "C",
  NODE_ENV: "test", NEXT_TELEMETRY_DISABLED: "1",
  NEXT_PUBLIC_SUPABASE_URL: "http://127.0.0.1:54321",
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "import-dryrun-public-placeholder",
  NEXT_PUBLIC_APP_URL: "https://academy.test",
  SUPABASE_SERVICE_ROLE_KEY: "", SERVICE_ROLE: "", SUPABASE_ACCESS_TOKEN: "",
  OPENAI_API_KEY: "", OPENROUTER_API_KEY: "", GOOGLE_CLIENT_SECRET: "", GITHUB_CLIENT_SECRET: "",
};

function cleanup() {
  return teardown ??= (async () => {
    let safeToRemove = !startAttempted;
    if (startAttempted && postgresDirectory) {
      try {
        await run(join(postgresDirectory, "pg_ctl"), ["-D", join(workspace, "cluster"), "-m", "fast", "-t", "10", "-w", "stop"], isolatedEnv, false, "cleanup");
        running = false;
        safeToRemove = true;
        console.log("Stopped the disposable Postgres cluster.");
      } catch {
        console.error("The dry-run cluster could not be stopped; its workspace has been retained for cleanup.");
        if (!interrupted) process.exitCode = 1;
      }
    }
    if (safeToRemove) rmSync(workspace, { recursive: true, force: true });
  })();
}

function expectCount(actual: number, expected: number, label: string) {
  if (actual !== expected) throw new Error(`${label} count mismatch: expected ${expected}, found ${actual}.`);
  console.log(`${label}: ${actual}`);
}

try {
  postgresDirectory = postgresBin();
  const cluster = join(workspace, "cluster");
  const port = await availablePort();
  const name = `learnlikeadev_test_${randomBytes(6).toString("hex")}`;
  await run(join(postgresDirectory, "initdb"), ["-D", cluster, "--username=academy_test", "--encoding=UTF8", "--no-locale", "--auth-local=trust", "--auth-host=trust"], isolatedEnv);
  startAttempted = true;
  await run(join(postgresDirectory, "pg_ctl"), ["-D", cluster, "-l", join(workspace, "postgres.log"), "-o", `-h 127.0.0.1 -p ${port} -k '' -c fsync=on -c max_connections=50`, "-t", "10", "-w", "start"], isolatedEnv, false, "startup");
  running = true;
  await run(join(postgresDirectory, "createdb"), ["-h", "127.0.0.1", "-p", String(port), "-U", "academy_test", name], isolatedEnv);
  const databaseUrl = requireIntegrationDatabaseUrl({ ACADEMY_TEST_DATABASE_URL: `postgresql://academy_test@127.0.0.1:${port}/${name}` });
  console.log(`Started disposable loopback Postgres: 127.0.0.1:${port}/${name}`);

  const migrateEnv = { ...isolatedEnv, ACADEMY_TEST_DATABASE_URL: databaseUrl, DATABASE_URL: databaseUrl, DIRECT_URL: databaseUrl };
  await run(process.execPath, [join(project, "node_modules/prisma/build/index.js"), "migrate", "deploy", "--config", "prisma/integration.config.ts"], migrateEnv, true);

  const importEnv = {
    ...isolatedEnv,
    CURRICULUM_IMPORT_TARGET: "staging",
    ACADEMY_IMPORT_TEST_TARGET: "disposable",
    DATABASE_URL: databaseUrl,
    DIRECT_URL: databaseUrl,
  };
  await run(process.execPath, ["--import", "tsx", join(project, "prisma/import-curriculum.ts")], importEnv, true);

  const client = new PrismaClient({ adapter: new PrismaPg({ connectionString: databaseUrl }) });
  try {
    const courseVersions = await client.courseVersion.count();
    const publishedCourseVersions = await client.courseVersion.count({ where: { publishedAt: { not: null } } });
    const lessons = await client.lessonSnapshot.count();
    const assessments = await client.assessment.count();
    const questions = await client.assessmentQuestion.count();
    const hintPacks = await client.hintPack.count();
    const projects = await client.project.count();
    console.log("--- Dry-run import counts ---");
    expectCount(courseVersions, 1, "CourseVersion");
    expectCount(publishedCourseVersions, 0, "CourseVersion (published)");
    expectCount(lessons, 40, "LessonSnapshot");
    expectCount(assessments, 49, "Assessment");
    expectCount(questions, 310, "AssessmentQuestion");
    expectCount(hintPacks, 40, "HintPack");
    expectCount(projects, 8, "Project (milestones)");
  } finally {
    await client.$disconnect();
  }

  console.log("--- Verifying production rejection against the disposable database ---");
  try {
    assertImportTargetIdentity({
      target: "production",
      supabaseUrl: isolatedEnv.NEXT_PUBLIC_SUPABASE_URL,
      databaseUrl,
      stagingProjectRef: undefined,
      productionProjectRef: undefined,
      testTargetEnv: "disposable",
    });
    throw new Error("The production guard unexpectedly accepted the disposable database.");
  } catch (error) {
    if (error instanceof Error && error.message.includes("unexpectedly accepted")) throw error;
    console.log(`Guard rejection: ${error instanceof Error ? error.message : String(error)}`);
  }
  const productionEnv = { ...importEnv, CURRICULUM_IMPORT_TARGET: "production" };
  try {
    await run(process.execPath, ["--import", "tsx", join(project, "prisma/import-curriculum.ts")], productionEnv);
    throw new Error("The production import unexpectedly succeeded against the disposable staging database.");
  } catch (error) {
    if (error instanceof Error && error.message.includes("unexpectedly succeeded")) throw error;
    const failure = error as { code?: number; output?: string };
    console.log(`Production import rejected as expected (exit ${failure.code ?? "unknown"}):`);
    console.log((failure.output ?? "").trim().split("\n").filter(Boolean).map((line) => `  ${line}`).join("\n") || "  (no captured output)");
  }
} catch (error) {
  console.error(error instanceof Error ? error.message : "Import dry-run failed.");
  const bootstrapLog = join(workspace, "postgres.log");
  if (!running && existsSync(bootstrapLog)) console.error(readFileSync(bootstrapLog, "utf8").slice(-1600));
  if (!interrupted) process.exitCode = 1;
} finally {
  await cleanup();
  process.off("SIGINT", onInterrupt);
  process.off("SIGTERM", onTerminate);
}
