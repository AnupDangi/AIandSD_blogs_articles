import { execFileSync } from "node:child_process";
import { cpSync, existsSync, mkdirSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { randomBytes } from "node:crypto";
import { beforeAll, describe, expect, it } from "vitest";

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const privateSource = join(repoRoot, "curriculum", "private");
const tempRoot = join(tmpdir(), `review-bundle-test-${process.pid}`);
const privateCopy = join(tempRoot, "curriculum", "private");
const bundlePath = join(tempRoot, "bundle.json");
const restoreTarget = join(tempRoot, "restored", "curriculum", "private");
const tsxLoader = pathToFileURL(join(repoRoot, "node_modules", "tsx", "dist", "loader.mjs")).href;
const exportScript = join(repoRoot, "scripts", "export-review-bundles.ts");
const restoreScript = join(repoRoot, "scripts", "restore-review-bundles.ts");

const hasPrivateBundle = existsSync(privateSource);

function collectRelativeFiles(root: string): string[] {
  const collected: string[] = [];
  for (const entry of readdirSync(root, { withFileTypes: true })) {
    if (entry.isDirectory()) {
      for (const child of collectRelativeFiles(join(root, entry.name))) {
        collected.push(`${entry.name}/${child}`);
      }
    } else if (entry.isFile()) {
      collected.push(entry.name);
    }
  }
  return collected.sort();
}

function runScript(script: string, args: string[], passphrase?: string): { stdout: string; stderr: string; status: number } {
  try {
    const stdout = execFileSync(process.execPath, ["--import", tsxLoader, script, ...args], {
      cwd: tempRoot,
      encoding: "utf8",
      env: { ...process.env, ACADEMY_REVIEW_PASSPHRASE: passphrase ?? "" },
    });
    return { stdout, stderr: "", status: 0 };
  } catch (error) {
    const failure = error as { stdout?: string; stderr?: string; status?: number };
    return { stdout: failure.stdout ?? "", stderr: failure.stderr ?? "", status: failure.status ?? 1 };
  }
}

const passphrase = `test-pass-${randomBytes(16).toString("hex")}`;

describe.skipIf(!hasPrivateBundle)("review bundle round-trip", () => {
  beforeAll(() => {
    rmSync(tempRoot, { recursive: true, force: true });
    mkdirSync(tempRoot, { recursive: true });
    cpSync(privateSource, privateCopy, { recursive: true });
  });

  it("exports the private bundle and reports only the output path, file count, and bundle sha256", () => {
    const result = runScript(exportScript, ["--out", bundlePath], passphrase);
    expect(result.status).toBe(0);
    const lines = result.stdout.trim().split("\n");
    expect(lines[0].startsWith("Wrote bundle: ")).toBe(true);
    expect(lines[1]).toMatch(/^Files: \d+$/);
    expect(lines[2]).toMatch(/^Bundle sha256: [0-9a-f]{64}$/);
    expect(existsSync(bundlePath)).toBe(true);
    expect(Number(lines[1].split(": ")[1])).toBe(collectRelativeFiles(privateSource).length);
    expect(result.stdout).not.toContain(passphrase);
  });

  it("restores a deleted private directory and every byte matches the source", () => {
    rmSync(privateCopy, { recursive: true, force: true });
    const result = runScript(restoreScript, ["--from", bundlePath, "--into", "restored/curriculum/private"], passphrase);
    expect(result.status).toBe(0);
    expect(collectRelativeFiles(restoreTarget)).toEqual(collectRelativeFiles(privateSource));
    for (const relative of collectRelativeFiles(privateSource)) {
      expect(readFileSync(join(restoreTarget, relative)).equals(readFileSync(join(privateSource, relative)))).toBe(true);
    }
    expect(result.stdout).not.toContain(passphrase);
    cpSync(privateSource, privateCopy, { recursive: true });
  });

  it("dry-run reports OK for every restored file without writing", () => {
    const result = runScript(restoreScript, ["--from", bundlePath, "--into", "restored/curriculum/private", "--dry-run"], passphrase);
    expect(result.status).toBe(0);
    for (const relative of collectRelativeFiles(privateSource)) {
      expect(result.stdout).toContain(`${relative}  sha256:`);
      expect(result.stdout).toContain("OK");
    }
    expect(result.stdout).toContain("no files written");
  });

  it("fails with a nonzero exit when the bundle ciphertext is tampered with", () => {
    const tamperedPath = join(tempRoot, "tampered.json");
    const envelope = JSON.parse(readFileSync(bundlePath, "utf8")) as { ciphertext: string };
    const ciphertext = envelope.ciphertext;
    const position = Math.floor(ciphertext.length / 2);
    const flipped = ciphertext[position] === "a" ? "b" : "a";
    writeFileSync(tamperedPath, JSON.stringify({ ...envelope, ciphertext: ciphertext.slice(0, position) + flipped + ciphertext.slice(position + 1) }));
    const result = runScript(restoreScript, ["--from", tamperedPath], passphrase);
    expect(result.status).not.toBe(0);
    expect(result.stdout).not.toContain("Verified and wrote");
  });

  it("fails with a nonzero exit when the passphrase is wrong", () => {
    const result = runScript(restoreScript, ["--from", bundlePath], `wrong-pass-${randomBytes(8).toString("hex")}`);
    expect(result.status).not.toBe(0);
    expect(result.stdout).not.toContain("Verified and wrote");
  });

  it("fails with a clear error when the passphrase environment variable is missing", () => {
    const result = runScript(restoreScript, ["--from", bundlePath]);
    expect(result.status).not.toBe(0);
    expect(result.stderr).toContain("ACADEMY_REVIEW_PASSPHRASE");
    expect(result.stderr).not.toContain(passphrase);
  });

  it("leaves no restore temp files behind", () => {
    const leftovers: string[] = [];
    for (const relative of collectRelativeFiles(restoreTarget)) {
      if (relative.includes(".restore-tmp")) leftovers.push(relative);
      expect(statSync(join(restoreTarget, relative)).isFile()).toBe(true);
    }
    expect(leftovers).toEqual([]);
  });

  it("exports fail when the passphrase is missing", () => {
    const result = runScript(exportScript, ["--out", join(tempRoot, "unused.json")]);
    expect(result.status).not.toBe(0);
    expect(result.stderr).toContain("ACADEMY_REVIEW_PASSPHRASE");
    expect(result.stderr).not.toContain(passphrase);
  });

  it("exports fail when curriculum/private is missing", () => {
    rmSync(privateCopy, { recursive: true, force: true });
    const result = runScript(exportScript, ["--out", join(tempRoot, "unused2.json")], passphrase);
    expect(result.status).not.toBe(0);
    expect(result.stderr).toContain("curriculum/private");
  });
});
