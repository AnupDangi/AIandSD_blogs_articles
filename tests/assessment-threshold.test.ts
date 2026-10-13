import { describe, expect, it } from "vitest";
import { thresholdToPercent } from "../prisma/assessment-threshold";

describe("assessment threshold import", () => {
  it("converts the authored fraction to the stored score scale", () => {
    expect(thresholdToPercent(0.8)).toBe(80);
  });

  it.each([-0.1, 1.01, Number.NaN, "0.8", null])("rejects an invalid threshold: %s", (threshold) => {
    expect(() => thresholdToPercent(threshold)).toThrow("between 0 and 1");
  });
});
