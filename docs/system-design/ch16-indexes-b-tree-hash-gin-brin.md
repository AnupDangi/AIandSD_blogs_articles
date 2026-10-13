# Chapter 16 — Indexes: B-Tree, Hash, GIN, BRIN

*Practical_System_Design_Anup_Dangi.pdf, Chapter 16*

Why this exists. An index trades extra storage and write cost for faster access paths. The correct index follows the query shape, not the column that “looks important.”

## Three concepts to retain

- B-tree supports equality and ordered range queries. - GIN is effective for composite values such as arrays/full text. - BRIN summarizes physical ranges and can be tiny for naturally ordered large tables.

## Senior engineer lens

Identify the invariant, the bottleneck, and the failure boundary before choosing technology. The same product can legitimately use different mechanisms for different data paths. Indexes: B-Tree, Hash, GIN, BRIN -

## Mechanics

## Mechanics

Start from the request or state transition, then identify which component owns each decision. Be explicit about synchronous boundaries: every synchronous hop extends the critical path and can propagate failure upstream. Be equally explicit about state: local memory, shared cache, replicated database, queue, and object store have different durability and consistency contracts. A robust design also defines identifiers and replay behavior. Request IDs, event IDs, shard keys, transaction IDs, trace IDs, and idempotency keys are not bookkeeping details; they are the handles that let the system detect duplicates, correlate work, route state, and recover safely. Complexity intuition An indexed lookup may avoid scanning millions of rows, but every additional index increases write amplification.

## Trade-offs to reason through

- Latency vs coordination - Availability vs consistency - Throughput vs per-request isolation - Operational simplicity vs horizontal scale - Freshness vs caching - Cost vs headroom

## Design-review prompt

If database indexes becomes the dominant bottleneck at 10x traffic, which metric would reveal it first, and what change would increase capacity without silently weakening correctness? Indexes: B-Tree, Hash, GIN, BRIN - Failure analysis

## Failure scenario

A table has six indexes “just in case”; write throughput collapses and most indexes are never used.

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

Write one sentence that must remain true during this failure. Examples: “A payment is never charged twice,” “committed file metadata never points to a nonexistent blob,” or “critical checkout traffic retains capacity even if analytics is shed.” Indexes: B-Tree, Hash, GIN, BRIN - Build, inspect, and read deeper

## Small implementation / lab

Create a 1M-row Postgres table; compare EXPLAIN ANALYZE before/after indexes on equality, range, and text- search queries.

## What to measure

- correctness/invariant violations - throughput - p50/p95/p99 latency - error rate - saturation/queue depth - recovery time after injected failure

## Official and primary references

- [PostgreSQL index types](https://www.postgresql.org/docs/current/indexes-types.html) - [PostgreSQL EXPLAIN](https://www.postgresql.org/docs/current/using-explain.html)

## Recall checklist

- Why does database indexes exist? - What does the simplest correct architecture look like? - Which failure mode is most dangerous? - Which metric tells you it is saturating? - What would you build to prove you understand it?

---
*Source: `Practical_System_Design_Anup_Dangi.pdf`. [Suggest a correction](https://github.com/AnupDangi/learnlikeadev/issues/new)*
