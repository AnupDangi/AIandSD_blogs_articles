# Chapter 27 — Distributed IDs and Snowflake

*Practical_System_Design_Anup_Dangi.pdf, Chapter 27*

Why this exists. Distributed IDs must remain unique without a central bottleneck. Time-based schemes can also preserve rough ordering while encoding worker identity and a per-time-unit sequence.

## Three concepts to retain

- A Snowflake-style ID combines timestamp, worker, and sequence bits. - Clock rollback and worker-ID allocation are correctness concerns. - Random UUIDs avoid coordination but have different locality/index behavior.

## Senior engineer lens

Identify the invariant, the bottleneck, and the failure boundary before choosing technology. The same product can legitimately use different mechanisms for different data paths.

## Mechanics

## Mechanics

Start from the request or state transition, then identify which component owns each decision. Be explicit about synchronous boundaries: every synchronous hop extends the critical path and can propagate failure upstream. Be equally explicit about state: local memory, shared cache, replicated database, queue, and object store have different durability and consistency contracts. A robust design also defines identifiers and replay behavior. Request IDs, event IDs, shard keys, transaction IDs, trace IDs, and idempotency keys are not bookkeeping details; they are the handles that let the system detect duplicates, correlate work, route state, and recover safely. Bit budget 41 timestamp bits, 10 worker bits, and 12 sequence bits imply 1024 workers and 4096 IDs per millisecond per worker.

## Trade-offs to reason through

- Latency vs coordination - Availability vs consistency - Throughput vs per-request isolation - Operational simplicity vs horizontal scale - Freshness vs caching - Cost vs headroom

## Design-review prompt

If distributed IDs becomes the dominant bottleneck at 10x traffic, which metric would reveal it first, and what change would increase capacity without silently weakening correctness? Failure analysis

## Failure scenario

Two machines accidentally receive the same worker ID and generate duplicate IDs during the same millisecond.

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

Write one sentence that must remain true during this failure. Examples: “A payment is never charged twice,” “committed file metadata never points to a nonexistent blob,” or “critical checkout traffic retains capacity even if analytics is shed.” Build, inspect, and read deeper

## Small implementation / lab

Implement a 64-bit Snowflake generator, force >4096 IDs/ms and a simulated clock rollback, and define the policy.

## What to measure

- correctness/invariant violations - throughput - p50/p95/p99 latency - error rate - saturation/queue depth - recovery time after injected failure

## Official and primary references

- [Twitter Snowflake repository](https://github.com/twitter-archive/snowflake)

## Recall checklist

- Why does distributed IDs exist? - What does the simplest correct architecture look like? - Which failure mode is most dangerous? - Which metric tells you it is saturating? - What would you build to prove you understand it?

---
*Source: `Practical_System_Design_Anup_Dangi.pdf`. [Suggest a correction](https://github.com/AnupDangi/learnlikeadev/issues/new)*
