# Chapter 23 — Object Storage, Content Addressing, and Large Blobs

*Practical_System_Design_Anup_Dangi.pdf, Chapter 23*

Why this exists. Large immutable blobs have different economics and access patterns from transactional rows. Object storage separates object identity, metadata, and durable blob placement.

## Three concepts to retain

- Object stores are optimized for large durable objects, not low-latency row updates. - Content hashes enable deduplication and integrity checks. - Metadata usually belongs in a separate indexed database.

## Senior engineer lens

Identify the invariant, the bottleneck, and the failure boundary before choosing technology. The same product can legitimately use different mechanisms for different data paths.

## Worked example

## Mechanics

Start from the request or state transition, then identify which component owns each decision. Be explicit about synchronous boundaries: every synchronous hop extends the critical path and can propagate failure upstream. Be equally explicit about state: local memory, shared cache, replicated database, queue, and object store have different durability and consistency contracts. A robust design also defines identifiers and replay behavior. Request IDs, event IDs, shard keys, transaction IDs, trace IDs, and idempotency keys are not bookkeeping details; they are the handles that let the system detect duplicates, correlate work, route state, and recover safely. Bandwidth A 4 GB video uploaded twice is 8 GB of ingress unless deduplication/chunking prevents duplication.

## Trade-offs to reason through

- Latency vs coordination - Availability vs consistency - Throughput vs per-request isolation - Operational simplicity vs horizontal scale - Freshness vs caching - Cost vs headroom

## Design-review prompt

If object storage becomes the dominant bottleneck at 10x traffic, which metric would reveal it first, and what change would increase capacity without silently weakening correctness?

## Failure scenario

A team stores multi-megabyte videos directly in relational rows; backups, replication, and query I/O become painfully expensive.

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

Build a mini blob store: content hash -> file/object path, metadata in Postgres, and deduplicate repeated uploads.

## What to measure

- correctness/invariant violations - throughput - p50/p95/p99 latency - error rate - saturation/queue depth - recovery time after injected failure

## Official and primary references

- [Amazon S3 concepts](https://docs.aws.amazon.com/AmazonS3/latest/userguide/Welcome.html) - [Meta Haystack](https://engineering.fb.com/2009/04/30/core-infra/needle-in-a-haystack-efficient-storage-of-) billions-of-photos/

## Recall checklist

- What does the simplest correct architecture look like? - Which failure mode is most dangerous? - Which metric tells you it is saturating? - What would you build to prove you understand it? DRIVEN SYSTEMS The goal of this part is to build a reusable mental model, not memorize a product stack. Every mechanism is tied to an invariant, a bottleneck, or a failure mode.

---
*Source: `Practical_System_Design_Anup_Dangi.pdf`. [Suggest a correction](https://github.com/AnupDangi/learnlikeadev/issues/new)*
