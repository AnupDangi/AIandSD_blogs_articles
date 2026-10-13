/** Convert the authoring manifest's fractional threshold (0–1) to the database's 0–100 score scale. */
export function thresholdToPercent(threshold: unknown): number {
  if (typeof threshold !== "number" || !Number.isFinite(threshold) || threshold < 0 || threshold > 1) {
    throw new Error("Assessment passThreshold must be a fraction between 0 and 1.");
  }
  return Math.round(threshold * 100);
}
