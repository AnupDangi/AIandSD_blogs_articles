import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { decryptBundle, readEnvelope, requirePassphrase, verifyFileBytes } from "./bundle-crypto";

const args = process.argv.slice(2);

function argValue(flag: string): string | undefined {
  const index = args.indexOf(flag);
  return index !== -1 ? args[index + 1] : undefined;
}

const fromPath = argValue("--from");
const intoArg = argValue("--into") ?? "curriculum/private";
const dryRun = args.includes("--dry-run");

if (!fromPath) {
  console.error("Usage: node --import tsx scripts/restore-review-bundles.ts --from <bundle> [--into curriculum/private] [--dry-run]");
  process.exit(1);
}

const bundlePath = resolve(process.cwd(), fromPath);
const intoRoot = resolve(process.cwd(), intoArg);

function fail(message: string): never {
  console.error(`Restore failed: ${message}`);
  process.exit(1);
}

if (!existsSync(bundlePath)) fail(`bundle not found at ${bundlePath}`);

let envelope;
try {
  envelope = await readEnvelope(bundlePath);
} catch (error) {
  fail(error instanceof Error ? error.message : String(error));
}

const passphrase = requirePassphrase();

let decrypted;
try {
  decrypted = decryptBundle(envelope, passphrase);
} catch (error) {
  fail(error instanceof Error ? error.message : String(error));
}

const { manifest, contents } = decrypted;
const contentsByPath = new Map(contents.map((item) => [item.path, item.bytes]));

for (const entry of manifest.files) {
  const bytes = contentsByPath.get(entry.path);
  if (!bytes || verifyFileBytes(entry, bytes) === "MISMATCH") {
    fail(`decrypted content does not match the manifest for file: ${entry.path}`);
  }
}

const results: { path: string; sha256: string; status: "OK" | "MISMATCH" | "MISSING" }[] = [];
for (const entry of manifest.files) {
  const target = join(intoRoot, entry.path);
  if (!existsSync(target)) {
    results.push({ path: entry.path, sha256: entry.sha256, status: "MISSING" });
    continue;
  }
  const bytes = readFileSync(target);
  results.push({ path: entry.path, sha256: entry.sha256, status: verifyFileBytes(entry, bytes) });
}

for (const result of results) {
  console.log(`${result.path}  sha256:${result.sha256}  ${result.status}`);
}

const drifted = results.filter((result) => result.status !== "OK");

if (dryRun) {
  if (drifted.length > 0) {
    console.error(`Dry run: ${drifted.length} file${drifted.length === 1 ? "" : "s"} do not match the bundle manifest; no files written.`);
    process.exit(1);
  }
  console.log("Dry run: every file matches the bundle manifest; no files written.");
  process.exit(0);
}

mkdirSync(intoRoot, { recursive: true });
for (const { path, bytes } of contents) {
  const target = join(intoRoot, path);
  mkdirSync(dirname(target), { recursive: true });
  const temp = `${target}.restore-tmp-${process.pid}`;
  writeFileSync(temp, bytes);
  renameSync(temp, target);
}

console.log(`Verified and wrote ${manifest.files.length} file${manifest.files.length === 1 ? "" : "s"} into ${intoRoot}.`);
