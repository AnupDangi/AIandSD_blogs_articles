# Chapter 6 — Capacity Estimation and Back-of-the-Envelope Math

*Practical_System_Design_Anup_Dangi.pdf, Chapter 6*

Why this exists. System design gets concrete when requirements become numbers. QPS, storage growth, bandwidth, concurrency, and peak multipliers expose bottlenecks before architecture diagrams do.

## Three concepts to retain

- Average QPS must be converted to realistic peak QPS. - Storage planning includes indexes, replicas, metadata, and retention. - Concurrency depends on arrival rate and service time.

## Senior engineer lens

Identify the invariant, the bottleneck, and the failure boundary before choosing technology. The same product can legitimately use different mechanisms for different data paths.

## Worked example

## Mechanics

Start from the request or state transition, then identify which component owns each decision. Be explicit about synchronous boundaries: every synchronous hop extends the critical path and can propagate failure upstream. Be equally explicit about state: local memory, shared cache, replicated database, queue, and object store have different durability and consistency contracts. A robust design also defines identifiers and replay behavior. Request IDs, event IDs, shard keys, transaction IDs, trace IDs, and idempotency keys are not bookkeeping details; they are the handles that let the system detect duplicates, correlate work, route state, and recover safely. Example 10M DAU * 20 requests/day = 200M requests/day = about 2,315 average QPS; with a 5x peak, design around 11,600 QPS.

## Trade-offs to reason through

- Latency vs coordination - Availability vs consistency - Throughput vs per-request isolation - Operational simplicity vs horizontal scale - Freshness vs caching - Cost vs headroom

## Design-review prompt

If capacity planning becomes the dominant bottleneck at 10x traffic, which metric would reveal it first, and what change would increase capacity without silently weakening correctness?

## Failure scenario

A design estimates only average traffic and collapses during a two-hour launch peak.

## Reason through the incident

1. What fails first?
2. What user-visible symptom appears?
3. Which retries or queues amplify the problem?
4. What stale or partial state can appear?
5. What telemetry proves the hypothesis?
6. What should degrade, reject, or fail over?
7. How do you recover without making the incident worse?
## Failure-path mental model

Do not stop at “component X is down.” Ask how callers behave while it is down. Timeouts occupy resources. Retries add traffic. Queues turn overload into stored waiting. Caches can convert failure into database load. Failover can expose stale replicas. A local defect becomes an outage through these feedback loops.

## Invariant check

Write one sentence that must remain true during this failure. Examples: “A payment is never charged twice,” “committed file metadata never points to a nonexistent blob,” or “critical checkout traffic retains capacity even if analytics is shed.” read deeper

## Small implementation / lab

Estimate QPS, egress, storage/year, cache size, DB write rate, and worker count for a chat app with 1M DAU.

## What to measure

- correctness/invariant violations - throughput - p50/p95/p99 latency - error rate - saturation/queue depth - recovery time after injected failure

## Official and primary references

- [Alex Xu companion site](https://bytebytego.com/) - [AWS Architecture Center](https://aws.amazon.com/architecture/)

## Recall checklist

- Why does capacity planning exist? - What does the simplest correct architecture look like? - Which failure mode is most dangerous? - Which metric tells you it is saturating? - What would you build to prove you understand it? The goal of this part is to build a reusable mental model, not memorize a product stack. Every mechanism is tied to an invariant, a bottleneck, or a failure mode.

---
*Source: `Practical_System_Design_Anup_Dangi.pdf`. [Suggest a correction](https://github.com/AnupDangi/learnlikeadev/issues/new)*
