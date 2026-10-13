export type ImportTarget = "staging" | "production";

const PRISMA_DATABASE_COMMANDS = new Set(["migrate", "db", "studio"]);
const MIGRATE_SUBCOMMANDS = new Set(["dev", "deploy", "status", "diff", "resolve", "reset"]);

export function isPrismaDatabaseCommand(argv: string[]): boolean {
  return argv.some((arg) => PRISMA_DATABASE_COMMANDS.has(arg));
}

export function assertPrismaCommandAllowed(argv: string[], target: ImportTarget): void {
  const commandIndex = argv.findIndex((arg) => PRISMA_DATABASE_COMMANDS.has(arg));
  if (commandIndex < 0) return;

  const command = argv[commandIndex];
  const subcommand = argv[commandIndex + 1] ?? "";
  if (command === "studio") {
    throw new Error("Prisma studio is blocked for configured Supabase targets; use reviewed, owner-scoped application views.");
  }
  if (command === "db") {
    if (subcommand === "pull") return;
    throw new Error(`Prisma db ${subcommand || "command"} is blocked; schema changes must use reviewed migration files.`);
  }
  if (!MIGRATE_SUBCOMMANDS.has(subcommand)) {
    throw new Error(`Prisma migrate ${subcommand || "command"} is not an approved database operation.`);
  }
  if (subcommand === "reset") {
    throw new Error("Prisma migrate reset is blocked for configured Supabase targets because it drops application data.");
  }
  if (target === "production" && (subcommand === "dev" || subcommand === "resolve")) {
    throw new Error(`Prisma migrate ${subcommand} is blocked for production; use reviewed migrate deploy releases.`);
  }
}

export function requireDirectUrl(env: Record<string, string | undefined>): string {
  const directUrl = env.DIRECT_URL?.trim();
  if (!directUrl) throw new Error("DIRECT_URL is required for Prisma migrations.");
  if (directUrl.toLowerCase().includes("placeholder")) throw new Error("DIRECT_URL cannot use the Prisma generate placeholder.");
  return directUrl;
}

export function supabaseProjectRef(supabaseUrl: string): string {
  let hostname: string;
  try {
    hostname = new URL(supabaseUrl).hostname.toLowerCase();
  } catch {
    throw new Error("NEXT_PUBLIC_SUPABASE_URL must be a valid Supabase project URL.");
  }
  const match = /^([a-z0-9]{20})\.supabase\.co$/.exec(hostname);
  if (!match) throw new Error("NEXT_PUBLIC_SUPABASE_URL must identify a standard Supabase project ref.");
  return match[1];
}

const DISPOSABLE_TEST_DATABASE_PATH = /^\/learnlikeadev_test_[a-z0-9]+$/;

export function isDisposableLocalTestDatabaseUrl(connectionString: string): boolean {
  let databaseUrl: URL;
  try {
    databaseUrl = new URL(connectionString);
  } catch {
    return false;
  }
  if (databaseUrl.protocol !== "postgres:" && databaseUrl.protocol !== "postgresql:") return false;
  const hostname = databaseUrl.hostname.toLowerCase();
  if (hostname !== "127.0.0.1" && hostname !== "localhost") return false;
  if (!databaseUrl.port || Number(databaseUrl.port) < 1 || Number(databaseUrl.port) > 65535) return false;
  if (databaseUrl.search || databaseUrl.hash) return false;
  return DISPOSABLE_TEST_DATABASE_PATH.test(databaseUrl.pathname);
}

export function databaseProjectRef(connectionString: string): string {
  let databaseUrl: URL;
  try {
    databaseUrl = new URL(connectionString);
  } catch {
    throw new Error("The database URL must be a valid PostgreSQL connection URL.");
  }
  if (databaseUrl.protocol !== "postgres:" && databaseUrl.protocol !== "postgresql:") {
    throw new Error("The database URL must use PostgreSQL.");
  }

  const directMatch = /^db\.([a-z0-9]{20})\.supabase\.co$/.exec(databaseUrl.hostname.toLowerCase());
  if (directMatch) return directMatch[1];

  if (databaseUrl.hostname.toLowerCase().endsWith(".pooler.supabase.com")) {
    const username = decodeURIComponent(databaseUrl.username);
    const poolerMatch = /^postgres\.([a-z0-9]{20})$/.exec(username);
    if (poolerMatch) return poolerMatch[1];
  }
  throw new Error("The database URL must identify a Supabase project through db.<ref>.supabase.co or a project-qualified pooler username.");
}

export function assertImportTargetIdentity(input: {
  target: ImportTarget;
  supabaseUrl: string | undefined;
  databaseUrl: string | undefined;
  stagingProjectRef: string | undefined;
  productionProjectRef: string | undefined;
  testTargetEnv?: string | undefined;
}): string {
  const testEscape = input.testTargetEnv?.trim();
  if (testEscape) {
    if (testEscape !== "disposable") {
      throw new Error("ACADEMY_IMPORT_TEST_TARGET only accepts the value \"disposable\" for local disposable import tests.");
    }
    if (input.target !== "staging") {
      throw new Error(`The disposable import-test escape is limited to the staging import target, not ${input.target}.`);
    }
    if (!input.databaseUrl || !isDisposableLocalTestDatabaseUrl(input.databaseUrl)) {
      throw new Error("The disposable import-test escape requires a local PostgreSQL URL on 127.0.0.1 or localhost with an explicit port and a learnlikeadev_test_<suffix> database.");
    }
    return "disposable";
  }
  const expectedRef = input.target === "staging" ? input.stagingProjectRef : input.productionProjectRef;
  if (!expectedRef || !/^[a-z0-9]{20}$/.test(expectedRef)) {
    throw new Error(`CURRICULUM_${input.target.toUpperCase()}_PROJECT_REF must identify the intended ${input.target} Supabase project.`);
  }
  if (input.target === "staging" && (!input.productionProjectRef || !/^[a-z0-9]{20}$/.test(input.productionProjectRef))) {
    throw new Error("CURRICULUM_PRODUCTION_PROJECT_REF must be a valid project ref to protect the staging target.");
  }
  if (input.target === "production" && input.stagingProjectRef && !/^[a-z0-9]{20}$/.test(input.stagingProjectRef)) {
    throw new Error("CURRICULUM_STAGING_PROJECT_REF must be a valid Supabase project ref when configured.");
  }
  if (input.stagingProjectRef && input.productionProjectRef && input.stagingProjectRef === input.productionProjectRef) {
    throw new Error("Staging and production project refs must be different.");
  }
  if (!input.supabaseUrl || !input.databaseUrl) {
    throw new Error("NEXT_PUBLIC_SUPABASE_URL and DIRECT_URL are both required to identify the import target.");
  }

  const appRef = supabaseProjectRef(input.supabaseUrl);
  const dbRef = databaseProjectRef(input.databaseUrl);
  if (appRef !== expectedRef || dbRef !== expectedRef) {
    throw new Error(`The ${input.target} import target does not match its configured Supabase project ref.`);
  }
  return expectedRef;
}
