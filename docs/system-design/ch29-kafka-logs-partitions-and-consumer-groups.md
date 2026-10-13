# Chapter 29 — Kafka: Logs, Partitions, and Consumer Groups

*Practical_System_Design_Anup_Dangi.pdf, Chapter 29*

Why this exists. Kafka is a distributed append-only log. Partitioning provides scale and ordering boundaries; consumer groups divide partitions among workers and offsets represent processing position.

## Three concepts to retain

- Ordering is guaranteed within a partition, not across a topic. - A consumer group assigns each partition to at most one active consumer at a time. - Offsets make replay and recovery explicit.

## Senior engineer lens

Identify the invariant, the bottleneck, and the failure boundary before choosing technology. The same product can legitimately use different mechanisms for different data paths.

## Worked example

## Mechanics

Start from the request or state transition, then identify which component owns each decision. Be explicit about synchronous boundaries: every synchronous hop extends the critical path and can propagate failure upstream. Be equally explicit about state: local memory, shared cache, replicated database, queue, and object store have different durability and consistency contracts. A robust design also defines identifiers and replay behavior. Request IDs, event IDs, shard keys, transaction IDs, trace IDs, and idempotency keys are not bookkeeping details; they are the handles that let the system detect duplicates, correlate work, route state, and recover safely. Parallelism ceiling A topic with 12 partitions can actively feed at most 12 consumers in one group without idle members.

## Trade-offs to reason through

- Latency vs coordination - Availability vs consistency - Throughput vs per-request isolation - Operational simplicity vs horizontal scale - Freshness vs caching - Cost vs headroom

## Design-review prompt

If Kafka becomes the dominant bottleneck at 10x traffic, which metric would reveal it first, and what change would increase capacity without silently weakening correctness?

## Failure scenario

A team keys events randomly for throughput but later needs per-user ordering; related events are spread across partitions.

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

Write one sentence that must remain true during this failure. Examples: “A payment is never charged twice,” “committed file metadata never points to a nonexistent blob,” or “critical checkout traffic retains capacity even if analytics is shed.” and read deeper

## Small implementation / lab

Run Kafka/Redpanda locally with three partitions; produce keyed messages, add/remove consumers, and observe rebalances and offsets.

## What to measure

- correctness/invariant violations - throughput - p50/p95/p99 latency - error rate - saturation/queue depth - recovery time after injected failure

## Official and primary references

- [Apache Kafka design](https://kafka.apache.org/design/) - [Apache Kafka docs](https://kafka.apache.org/documentation/)

## Recall checklist

- Why does Kafka exist? - What does the simplest correct architecture look like? - Which failure mode is most dangerous? - Which metric tells you it is saturating? - What would you build to prove you understand it?

---
*Source: `Practical_System_Design_Anup_Dangi.pdf`. [Suggest a correction](https://github.com/AnupDangi/learnlikeadev/issues/new)*
