# Chapter 35 — Prompt caching and reuse

*Practical_AI_Engineering_Anup_Dangi.pdf, Chapter 35*

## Learning outcomes

By the end of this lesson, you should be able to:

- Split a rendered model request into stable prefix, changing context, and output contract, and identify which edits invalidate prefix matching.
- Calculate a break-even comparison that includes cache-write cost, cache-hit cost, and the number of repeated requests.
- Design a quality-gated experiment using cache signals, latency, and cost per successful task rather than treating a cache-hit count as a win by itself.

**Prerequisite:** Chapter 25, observability and tracing. You need per-run token, latency, and cost data before judging an optimization.

## Figure walkthrough

Imagine a request made from three blocks: stable instructions and tool schemas, retrieved material for this request, then the user’s latest question. Reuse can apply only to an eligible unchanged prefix. If a timestamp is inserted near the beginning, the first differing token ends the reusable prefix, so everything after it loses any match. The diagram is conceptual: the exact matching rules and billing fields belong to the provider and model you are using.

**Authored instructional mechanism map — reusable prefix and toy accounting.** The cost units and hit assumptions are invented teaching inputs, not provider prices or evidence of cache eligibility.

| Request layout | Candidate prefix behavior | Boundary to preserve |
|---|---|---|
| Stable instructions → stable examples → changing evidence/question | Early unchanged material may be eligible for provider reuse | Keep request-private context isolated and continue output validation |
| Timestamp → stable instructions → changing evidence/question | Early timestamp changes can break later prefix matching | Do not infer a cache hit merely because most of the prompt looks similar |

| Twenty-request toy ledger | Calculation | Total cost units |
|---|---|---|
| No caching | `20 × 1,000` | `20,000` |
| All 19 later requests hit, no write charge | `1,000 + 19 × (200 + 0.25 × 800)` | `8,600` |
| Same hits plus first write charge | `1,120 + 19 × 400` | `8,720` |
| 12 later hits, 7 misses, first write charge | `1,120 + 12 × 400 + 7 × 1,000` | `12,920` |

**Decision path:** inspect eligible prefix → measure real read/write/miss usage → compute total cost and cost/success → compare the same held-out quality/privacy slices → accept only if the **release floor** holds — the minimum quality level a change must keep before cost savings can count. The hypothetical 800-unit prefix does not promise an OpenAI cache hit. Local `TTLCache` hit/miss counters describe an application cache, not provider prompt-cache billing.

## The idea

Applications often send the same system instructions, examples, and tool definitions on many calls. A provider may reuse processing for an eligible repeated prefix. That can reduce repeated work, but it does not make the answer correct, safe, or deterministic. Continue to validate structured output, enforce permissions, and evaluate task quality on every path.

Separate prompt construction into three named parts: a stable prefix, changing context, and an output contract. Keep request-specific data out of shared state; a cache key must not accidentally reuse one user’s private context for another. Cache eligibility, retention, token thresholds, and price treatment vary by provider and can change. Consult the current provider documentation before implementing provider-side caching.

## Worked numerical case

Use **abstract cost units**, not a provider price. Suppose a baseline sends 1,000 input-token-equivalent units on each of 20 requests. Its total is 20,000 units. A candidate has an 800-unit stable prefix and 200 changing units. For a deliberately simplified calculation, assume request one pays the full 1,000 units and each of the next 19 requests pays 200 changing units plus 25% of the cached prefix (200 units):

- Candidate total: `1,000 + 19 × (200 + 0.25 × 800) = 8,600` units.
- Apparent reduction: `(20,000 − 8,600) / 20,000 = 57%`.

This toy estimate excludes cache-write charges, minimum-prefix thresholds, misses, and provider-specific billing. Any of those can reduce or erase the apparent savings. If quality drops even slightly below the release floor, the candidate fails regardless of its cost result.

The 800-unit prefix is deliberately **below the minimum cacheable length currently described in OpenAI's guide**. The arithmetic teaches accounting, not a prediction that this particular prompt would receive an OpenAI cache hit. Before running an experiment, check the selected model's minimum length, retention, write/read pricing, and usage fields. Record the effective prompt layout and a non-sensitive prefix fingerprint so that an observed miss can be explained without logging the prompt itself.

To include a write charge in the same toy model, assume the first request has an additional 120-unit cache-write charge and all later requests hit. For `n` requests, baseline cost is `1,000n` and candidate cost is `1,120 + 400(n − 1)`. The candidate breaks even when `1,120 + 400(n − 1) < 1,000n`, which first holds at two requests. At 20 requests it costs `8,720` units. A miss would pay the full input cost again, so measure the real hit rate before using this estimate. These are invented accounting units, not a provider's price or cache policy.

### Vary the assumption before making a decision

With the same toy prices, suppose **only 12 of the 19 later requests hit**, and misses do not incur another write charge. The first request costs 1,120 units; each hit costs 400; each of seven misses costs 1,000. The candidate now costs `1,120 + 12 × 400 + 7 × 1,000 = 12,920` units, a 35.4% reduction from the 20,000-unit baseline. If the two cohorts solve 18 and 17 tasks respectively, cost per successful task is `20,000 / 18 ≈ 1,111` versus `12,920 / 17 = 760` units, but the lower success count may fail a predefined quality floor. A cost saving is not permission to trade away a critical citation or privacy requirement.

Measure first-request latency, p50/p95 latency, input/output token categories, cache-read and write charges, task success, and error slices on the **same held-out workload**. Compare like-for-like model, retrieval, output contract, and traffic pattern. A faster warm run sampled at an easier time is not evidence that caching caused the change.

## Practice lab

An **application-side in-process cache** (a small map in your own code, with a capacity and a time-to-live) is not provider prompt caching. Trace a capacity-one cache by hand with these operations: put `first`, get `first`, put `second`, get `first`, get `second`. The first get is a hit. Putting `second` evicts `first` to stay within capacity. The second get of `first` is then a miss, and the get of `second` is a hit. The expected counters are `hits=2 misses=1`.

If you build such a cache in TypeScript, a Vitest or `node:test` test can assert exactly this sequence: the hit and miss counters, and that `first` is gone after the second put. Use a long TTL in that test, so it demonstrates capacity eviction and counters, not expiration or provider cache behavior. In your notes, calculate the abstract 20-request example with the write charge, list two other costs the toy model omits, and write a release rule with a quality floor plus a cost-per-success or latency target.

Then draw two request layouts: `stable instructions → stable examples → retrieved context → user question` and `request timestamp → stable instructions → retrieved context → user question`. Predict which layout has a reusable prefix. Explain why moving the timestamp later changes matching but **does not** justify moving private retrieved content into a shared cache key. Submit your arithmetic and layout as evidence; do not label application cache counters as provider billing data.

## Failure review

A changed timestamp, reordered tool list, or rewritten history can make a supposedly stable prefix vary. An application cache can also return stale or cross-user data if keys and expiry are poorly scoped; never put private request context in a shared key without an explicit isolation design. A provider cache metric alone says nothing about answer quality. Re-run the same held-out cases and check privacy, correctness, and cost before shipping.

## Recall

- Which exact bytes or tokens make up the stable prefix in your request builder?
- What costs and quality checks are missing from the toy break-even calculation?
- Which assertion and counter values demonstrate an application TTL cache's behavior, and what do they not demonstrate?

## Sources

- [OpenAI prompt caching guide](https://developers.openai.com/api/docs/guides/prompt-caching) — provider-specific eligibility, usage signals, and current controls; re-check it when changing models.

## Try the simulation

Use the **`request-workbench`** visual engine. Before interacting, predict which requests share an exact stable prefix and which should remain cold. Process the sequence one request at a time: the second request reuses the same prefix, the reordered third request does not, and the fourth restores the original prefix. Compare matching-prefix tokens with the illustrative minimum, then reset and replay. This deterministic model does not reproduce a provider's cache implementation.

## Course project — milestone 7 — Efficiency & recovery

**Efficiency evidence task:** In your own TypeScript project, add a small bounded application cache (capacity, TTL, hit and miss counters) in front of one repeatable, deterministic step such as retrieval or a pure lookup. Key it so one user's private context can never be served to another. Write a Vitest or `node:test` test that asserts the hit and miss counters and the capacity eviction for a short sequence of puts and gets. Add a short note to your milestone report distinguishing application caching from provider-side prompt caching. Include the hit/miss counts your test asserts, the capacity eviction, and a quality-gated break-even calculation for a repeated request workload. Do not claim provider cache hits: an application cache makes no provider calls.

**Acceptance check:** Your report names the cache layer actually tested, explains one omitted cost in the toy estimate, and states a quality condition that would block release.

---
*Source: `Practical_AI_Engineering_Anup_Dangi.pdf`. [Suggest a correction](https://github.com/AnupDangi/learnlikeadev/issues/new)*
