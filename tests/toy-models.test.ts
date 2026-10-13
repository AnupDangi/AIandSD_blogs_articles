import { describe, expect, it } from "vitest";
import { chooseByProbability, NEXT_TOKEN_CANDIDATES, softmax, tokenizeToy, toyAttention, truncateTopP } from "@/lib/toy-models";

describe("toy token and attention calculations", () => {
  it("tokenizes punctuation into inspectable toy tokens", () => {
    expect(tokenizeToy("An engineer builds tools.")).toEqual(["An", "engineer", "builds", "tools", "."]);
  });

  it("computes normalized attention and applies the causal mask before softmax", () => {
    const unmasked = toyAttention(9, false);
    const masked = toyAttention(9, true);
    expect(unmasked.weights.reduce((sum, value) => sum + value, 0)).toBeCloseTo(1);
    expect(masked.weights.reduce((sum, value) => sum + value, 0)).toBeCloseTo(1);
    expect(masked.weights.slice(10).every((value) => value === 0)).toBe(true);
    expect(unmasked.weights.slice(10).some((value) => value > 0)).toBe(true);
    expect(masked.context).not.toEqual(unmasked.context);
  });

  it("temperature sharpens or flattens the next-token distribution", () => {
    const logits = NEXT_TOKEN_CANDIDATES.map(({ logit }) => logit);
    const cool = softmax(logits, 0.5);
    const warm = softmax(logits, 2);
    expect(cool[0]).toBeGreaterThan(warm[0]);
    expect(cool.reduce((sum, value) => sum + value, 0)).toBeCloseTo(1);
    expect(() => softmax(logits, 0)).toThrow(RangeError);
  });

  it("keeps a renormalized nucleus and samples from that distribution", () => {
    const probabilities = softmax(NEXT_TOKEN_CANDIDATES.map(({ logit }) => logit));
    const nucleus = truncateTopP(probabilities, 0.7);
    expect(nucleus.filter((value) => value > 0).length).toBeLessThan(probabilities.length);
    expect(nucleus.reduce((sum, value) => sum + value, 0)).toBeCloseTo(1);
    expect(nucleus[chooseByProbability(nucleus, 0.99)]).toBeGreaterThan(0);
  });
});
