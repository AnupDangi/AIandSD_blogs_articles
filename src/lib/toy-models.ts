export type Vector2 = readonly [number, number];

const QUERY_VECTORS: Vector2[] = Array.from({ length: 12 }, (_, i) => [
  Math.cos((i + 1) * 0.61),
  Math.sin((i + 1) * 0.61),
]);
const KEY_VECTORS: Vector2[] = Array.from({ length: 12 }, (_, i) => [
  Math.cos((i + 1) * 0.47),
  Math.sin((i + 1) * 0.47),
]);
export const TOY_VALUE_VECTORS: Vector2[] = Array.from({ length: 12 }, (_, i) => [
  Number((i / 11).toFixed(2)),
  Number((1 - i / 11).toFixed(2)),
]);

export function toyAttention(queryIndex: number, causalMask: boolean) {
  const query = QUERY_VECTORS[queryIndex];
  if (!query) throw new RangeError("queryIndex must identify a token position");
  const scores = KEY_VECTORS.map((key, index) => {
    if (causalMask && index > queryIndex) return Number.NEGATIVE_INFINITY;
    return (query[0] * key[0] + query[1] * key[1]) / Math.sqrt(query.length);
  });
  const maximum = Math.max(...scores.filter(Number.isFinite));
  const exponentials = scores.map((score) => Number.isFinite(score) ? Math.exp(score - maximum) : 0);
  const total = exponentials.reduce((sum, value) => sum + value, 0);
  const weights = exponentials.map((value) => value / total);
  const context: Vector2 = [
    weights.reduce((sum, weight, index) => sum + weight * TOY_VALUE_VECTORS[index][0], 0),
    weights.reduce((sum, weight, index) => sum + weight * TOY_VALUE_VECTORS[index][1], 0),
  ];
  return { scores, weights, context };
}

export function tokenizeToy(text: string): string[] {
  return text.match(/[A-Za-z]+|[0-9]+|[^\sA-Za-z0-9]/g) ?? [];
}

export const NEXT_TOKEN_CANDIDATES = [
  { token: "carefully", logit: 2.4 },
  { token: "quickly", logit: 1.8 },
  { token: "today", logit: 0.7 },
  { token: ".", logit: -0.2 },
] as const;

export function softmax(logits: readonly number[], temperature = 1): number[] {
  if (temperature <= 0) throw new RangeError("temperature must be positive");
  if (logits.length === 0 || logits.some((value) => !Number.isFinite(value))) throw new TypeError("logits must be a non-empty finite list");
  const scaled = logits.map((value) => value / temperature);
  const maximum = Math.max(...scaled);
  const exponentials = scaled.map((value) => Math.exp(value - maximum));
  const total = exponentials.reduce((sum, value) => sum + value, 0);
  return exponentials.map((value) => value / total);
}

export function truncateTopP(probabilities: readonly number[], topP: number): number[] {
  if (topP <= 0 || topP > 1) throw new RangeError("topP must be greater than zero and at most one");
  if (probabilities.length === 0 || probabilities.some((value) => value < 0 || !Number.isFinite(value))) {
    throw new TypeError("probabilities must be a non-empty list of finite non-negative values");
  }
  const total = probabilities.reduce((sum, value) => sum + value, 0);
  if (total <= 0) throw new RangeError("probabilities must have a positive sum");
  const normalized = probabilities.map((value) => value / total);
  const order = normalized.map((probability, index) => ({ probability, index })).sort((a, b) => b.probability - a.probability);
  const included = new Set<number>();
  let cumulative = 0;
  for (const item of order) {
    included.add(item.index);
    cumulative += item.probability;
    if (cumulative >= topP) break;
  }
  const retainedTotal = normalized.reduce((sum, value, index) => sum + (included.has(index) ? value : 0), 0);
  return normalized.map((value, index) => included.has(index) ? value / retainedTotal : 0);
}

export function chooseByProbability(probabilities: readonly number[], draw: number): number {
  if (draw < 0 || draw >= 1) throw new RangeError("draw must be in [0, 1)");
  let cumulative = 0;
  let lastPositiveIndex = -1;
  for (let index = 0; index < probabilities.length; index += 1) {
    if (probabilities[index] > 0) lastPositiveIndex = index;
    cumulative += probabilities[index];
    if (draw < cumulative) return index;
  }
  if (lastPositiveIndex < 0) throw new RangeError("probabilities must have a positive sum");
  return lastPositiveIndex;
}
