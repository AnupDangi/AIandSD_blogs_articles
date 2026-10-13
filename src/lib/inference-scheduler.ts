import type { InferenceSchedulerScenario } from "@/content/visual-scenario-types";

export function estimateKvCacheBytesPerToken(scenario: InferenceSchedulerScenario): number {
  return 2 * scenario.layers * scenario.kvHeads * scenario.headDimension * scenario.bytesPerValue;
}

export function estimateKvCacheBytes(scenario: InferenceSchedulerScenario, sequenceTokens: number, activeSequences: number): number {
  if (!Number.isInteger(sequenceTokens) || sequenceTokens < 1) throw new RangeError("sequenceTokens must be a positive integer");
  if (!Number.isInteger(activeSequences) || activeSequences < 1) throw new RangeError("activeSequences must be a positive integer");
  return estimateKvCacheBytesPerToken(scenario) * sequenceTokens * activeSequences;
}

export function formatBinaryMemory(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes < 0) throw new RangeError("bytes must be finite and non-negative");
  const gibibytes = bytes / 1_073_741_824;
  if (gibibytes >= 1) return `${gibibytes.toFixed(2)} GiB`;
  const kibibytes = bytes / 1024;
  if (kibibytes >= 1) return `${kibibytes.toFixed(0)} KiB`;
  return `${bytes.toFixed(0)} B`;
}
