import { createCipheriv, createDecipheriv, createHash, randomBytes, scryptSync, timingSafeEqual } from "node:crypto";
import { readFile } from "node:fs/promises";

export interface BundleFileEntry {
  path: string;
  sha256: string;
  bytes: number;
}

export interface BundleManifest {
  createdUtc: string;
  files: BundleFileEntry[];
  bundleSha256: string;
}

export interface Envelope {
  version: 1;
  kdf: "scrypt";
  salt: string;
  scrypt: { N: number; r: number; p: number };
  iv: string;
  tag: string;
  ciphertext: string;
  manifest: BundleManifest;
}

export interface DecryptedBundle {
  manifest: BundleManifest;
  contents: { path: string; bytes: Buffer }[];
}

export const SCRYPT_PARAMS = { N: 2 ** 15, r: 8, p: 1 } as const;

export const PASSPHRASE_ENV = "ACADEMY_REVIEW_PASSPHRASE";

const KEY_LENGTH = 32;
const MAX_SCRYPT_MEM = 128 * 1024 * 1024;

export function requirePassphrase(source: NodeJS.ProcessEnv = process.env): string {
  const value = source[PASSPHRASE_ENV];
  if (typeof value !== "string" || value.length === 0) {
    throw new Error(`Missing required environment variable ${PASSPHRASE_ENV}. Set it to the review bundle passphrase before running this command.`);
  }
  return value;
}

function canonicalManifestJson(manifest: Omit<BundleManifest, "bundleSha256">): string {
  return JSON.stringify({ createdUtc: manifest.createdUtc, files: manifest.files }) + "\n";
}

function canonicalArchiveJson(contents: { path: string; bytes: Buffer }[]): string {
  return JSON.stringify({ files: contents.map(({ path, bytes }) => ({ path, content: bytes.toString("base64") })) }) + "\n";
}

export function computeBundleSha256(manifest: Omit<BundleManifest, "bundleSha256">): string {
  return createHash("sha256").update(canonicalManifestJson(manifest), "utf8").digest("hex");
}

export function sha256Hex(bytes: Buffer): string {
  return createHash("sha256").update(bytes).digest("hex");
}

export function sortEntries(entries: { path: string; bytes: Buffer }[]): { path: string; bytes: Buffer }[] {
  return [...entries].sort((a, b) => a.path.localeCompare(b.path));
}

export function buildManifest(files: { path: string; bytes: Buffer }[], now = new Date()): BundleManifest {
  if (files.length === 0) throw new Error("Cannot build a bundle manifest from an empty file list.");
  const entries: BundleFileEntry[] = sortEntries(files).map(({ path, bytes }) => ({ path, sha256: sha256Hex(bytes), bytes: bytes.byteLength }));
  const base = { createdUtc: now.toISOString(), files: entries };
  return { ...base, bundleSha256: computeBundleSha256(base) };
}

export function encryptBundle(manifest: BundleManifest, files: { path: string; bytes: Buffer }[], passphrase: string): Envelope {
  const payload = Buffer.from(canonicalArchiveJson(sortEntries(files)), "utf8");
  const iv = randomBytes(12);
  const salt = randomBytes(32);
  const key = scryptSync(passphrase, salt, KEY_LENGTH, { ...SCRYPT_PARAMS, maxmem: MAX_SCRYPT_MEM });
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const ciphertext = Buffer.concat([cipher.update(payload), cipher.final()]);
  return {
    version: 1,
    kdf: "scrypt",
    salt: salt.toString("hex"),
    scrypt: { ...SCRYPT_PARAMS },
    iv: iv.toString("hex"),
    tag: cipher.getAuthTag().toString("hex"),
    ciphertext: ciphertext.toString("hex"),
    manifest,
  };
}

export function decryptBundle(envelope: Envelope, passphrase: string): DecryptedBundle {
  if (envelope.version !== 1 || envelope.kdf !== "scrypt") throw new Error("Unsupported bundle envelope version or KDF.");
  const manifest = envelope.manifest;
  if (!manifest || !Array.isArray(manifest.files)) throw new Error("Bundle envelope is missing its manifest.");
  if (manifest.bundleSha256 !== computeBundleSha256({ createdUtc: manifest.createdUtc, files: manifest.files })) {
    throw new Error("Bundle manifest hash mismatch: bundle metadata has been tampered with.");
  }
  const key = scryptSync(passphrase, Buffer.from(envelope.salt, "hex"), KEY_LENGTH, { ...envelope.scrypt, maxmem: MAX_SCRYPT_MEM });
  const decipher = createDecipheriv("aes-256-gcm", key, Buffer.from(envelope.iv, "hex"));
  decipher.setAuthTag(Buffer.from(envelope.tag, "hex"));
  let plaintext: Buffer;
  try {
    plaintext = Buffer.concat([decipher.update(Buffer.from(envelope.ciphertext, "hex")), decipher.final()]);
  } catch {
    throw new Error("Bundle decryption failed: wrong passphrase or tampered bundle.");
  }
  const parsed = JSON.parse(plaintext.toString("utf8")) as { files: { path: string; content: string }[] };
  const contents = parsed.files.map(({ path, content }) => ({ path, bytes: Buffer.from(content, "base64") }));
  return { manifest, contents };
}

export function verifyFileBytes(entry: BundleFileEntry, bytes: Buffer): "OK" | "MISMATCH" {
  if (bytes.byteLength !== entry.bytes) return "MISMATCH";
  return timingSafeEqual(Buffer.from(entry.sha256, "hex"), Buffer.from(sha256Hex(bytes), "hex")) ? "OK" : "MISMATCH";
}

export async function readEnvelope(path: string): Promise<Envelope> {
  const raw = JSON.parse(await readFile(path, "utf8")) as Envelope;
  if (!raw || raw.version !== 1 || typeof raw.manifest !== "object" || !Array.isArray(raw.manifest.files)) {
    throw new Error(`Not a valid bundle envelope: ${path}`);
  }
  return raw;
}
