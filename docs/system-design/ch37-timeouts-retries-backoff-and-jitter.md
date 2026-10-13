# Chapter 37 — Timeouts, Retries, Backoff, and Jitter

*Practical_System_Design_Anup_Dangi.pdf, Chapter 37*

Why this exists. A retry is extra load sent to a system that may already be unhealthy. Reliable clients bound retry count, propagate deadlines, back off, add jitter, and retry only potentially transient failures.

## Three concepts to retain

- Timeouts bound one operation; deadlines bound the whole request. - Exponential backoff spaces repeated attempts. - Jitter prevents synchronized clients from retrying at the same moments.

## Senior engineer lens

Identify the invariant, the bottleneck, and the failure boundary before choosing technology. The same product can legitimately use different mechanisms for different data paths.

- Mechanics and worked example
## Mechanics

Start from the request or state transition, then identify which component owns each decision. Be explicit about synchronous boundaries: every synchronous hop extends the critical path and can propagate failure upstream. Be equally explicit about state: local memory, shared cache, replicated database, queue, and object store have different durability and consistency contracts. A robust design also defines identifiers and replay behavior. Request IDs, event IDs, shard keys, transaction IDs, trace IDs, and idempotency keys are not bookkeeping details; they are the handles that let the system detect duplicates, correlate work, route state, and recover safely. Deadline A 2-second end-to-end deadline cannot safely contain three independent 2-second dependency timeouts.

## Trade-offs to reason through

- Latency vs coordination - Availability vs consistency - Throughput vs per-request isolation - Operational simplicity vs horizontal scale - Freshness vs caching - Cost vs headroom

## Design-review prompt

If retries becomes the dominant bottleneck at 10x traffic, which metric would reveal it first, and what change would increase capacity without silently weakening correctness?

- Failure analysis
## Failure scenario

Thousands of clients retry every 1 second after a regional dependency failure, creating synchronized traffic spikes that prevent recovery.

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

Write one sentence that must remain true during this failure. Examples: “A payment is never charged twice,” “committed file metadata never points to a nonexistent blob,” or “critical checkout traffic retains capacity even if analytics is shed.”

- Build, inspect, and read deeper
## Small implementation / lab

Simulate 1000 clients with fixed retry vs exponential backoff+jitter; compare peak retry traffic.

## What to measure

- correctness/invariant violations - throughput - p50/p95/p99 latency - error rate - saturation/queue depth - recovery time after injected failure

## Official and primary references

<https://aws.amazon.com/builders-library/timeouts-retries-and-backoff-with-jitter/>

## Recall checklist

- Why does retries exist? - What does the simplest correct architecture look like? - Which failure mode is most dangerous? - Which metric tells you it is saturating? - What would you build to prove you understand it?

---
*Source: `Practical_System_Design_Anup_Dangi.pdf`. [Suggest a correction](https://github.com/AnupDangi/learnlikeadev/issues/new)*
