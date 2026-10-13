import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import nextEnv from "@next/env";
import { configuredSecretNeedles, leakedSecretNames, redactConfiguredSecrets } from "./public-secret-scan";

nextEnv.loadEnvConfig(process.cwd());
const secretNeedles = configuredSecretNeedles(process.env);

const publicAssetRoots = [
  join(process.cwd(), ".next", "static"),
  join(process.cwd(), ".next", "server", "app"),
  join(process.cwd(), "public"),
];
const forbiddenMarkers = [
  "private-grading-fixture",
  "assessment-keys.json",
  "correctChoiceId",
  "curriculum/private",
];
const failures: string[] = [];

function walk(directory: string) {
  let entries;
  try { entries = readdirSync(directory); } catch {
    failures.push(`Required asset directory is missing or unreadable: ${redactConfiguredSecrets(directory, secretNeedles)}. Build the application before running this check.`);
    return;
  }
  for (const entry of entries) {
    const path = join(directory, entry);
    for (const name of leakedSecretNames(path, secretNeedles)) {
      failures.push(`Asset path contains a configured server credential (${name}): ${redactConfiguredSecrets(path, secretNeedles)}.`);
    }
    let stat;
    try { stat = statSync(path); } catch {
      failures.push(`Cannot inspect asset: ${redactConfiguredSecrets(path, secretNeedles)}.`);
      continue;
    }
    if (stat.isDirectory()) {
      walk(path);
      continue;
    }
    let bytes;
    try { bytes = readFileSync(path); } catch {
      failures.push(`Cannot read asset: ${redactConfiguredSecrets(path, secretNeedles)}.`);
      continue;
    }
    const text = bytes.toString("utf8");
    for (const marker of forbiddenMarkers) {
      if (text.includes(marker)) failures.push(`${path} contains a private-content marker (${marker}).`);
    }
    for (const name of leakedSecretNames(text, secretNeedles)) {
      failures.push(`${path} contains a configured server credential (${name}); value redacted.`);
    }
  }
}

for (const root of publicAssetRoots) walk(root);

if (failures.length > 0) {
  console.error(`Public asset privacy check failed (${failures.length} issue${failures.length === 1 ? "" : "s"}):`);
  for (const failure of failures) console.error(`- ${redactConfiguredSecrets(failure, secretNeedles)}`);
  process.exitCode = 1;
} else {
  console.log("Public assets contain no private answer-bundle markers or exact matches for configured server credentials. This is not a comprehensive secret audit.");
}
