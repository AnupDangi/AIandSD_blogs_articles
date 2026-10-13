import { mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { buildManifest, encryptBundle, requirePassphrase } from "./bundle-crypto";

const args = process.argv.slice(2);
const outIndex = args.indexOf("--out");
const outPath = outIndex !== -1 ? args[outIndex + 1] : undefined;

if (!outPath) {
  console.error("Usage: node --import tsx scripts/export-review-bundles.ts --out <path>");
  process.exit(1);
}

const privateRoot = resolve(process.cwd(), "curriculum", "private");

function collectFiles(directory: string, prefix: string): { path: string; bytes: Buffer }[] {
  const collected: { path: string; bytes: Buffer }[] = [];
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const relative = prefix ? `${prefix}/${entry.name}` : entry.name;
    if (entry.isDirectory()) collected.push(...collectFiles(join(directory, entry.name), relative));
    else if (entry.isFile()) collected.push({ path: relative, bytes: readFileSync(join(directory, entry.name)) });
  }
  return collected;
}

let files: { path: string; bytes: Buffer }[];
try {
  files = collectFiles(privateRoot, "");
} catch {
  console.error("Export failed: curriculum/private/ is missing or unreadable.");
  process.exit(1);
}

if (files.length === 0) {
  console.error("Export failed: curriculum/private/ contains no files.");
  process.exit(1);
}

const passphrase = requirePassphrase();
const manifest = buildManifest(files);
const envelope = encryptBundle(manifest, files, passphrase);
const output = resolve(process.cwd(), outPath);
mkdirSync(dirname(output), { recursive: true });
writeFileSync(output, JSON.stringify(envelope, null, 2) + "\n");

console.log(`Wrote bundle: ${output}`);
console.log(`Files: ${manifest.files.length}`);
console.log(`Bundle sha256: ${manifest.bundleSha256}`);
