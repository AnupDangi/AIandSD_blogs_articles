# Chapter 5 — CDNs and Edge Caching Why this exists. A CDN reduces distance, origin load, and tail latency by serving cached content from

*Practical_System_Design_Anup_Dangi.pdf, Chapter 5*

distributed edge locations. The difficult part is cache correctness and cache-key design.

## Three concepts to retain

- Cache keys determine which requests can safely share responses. - TTL and revalidation balance freshness against origin traffic. - Purges and invalidation are operationally different from natural expiration.

## Senior engineer lens

Identify the invariant, the bottleneck, and the failure boundary before choosing technology. The same product can legitimately use different mechanisms for different data paths. and worked example

## Mechanics

Start from the request or state transition, then identify which component owns each decision. Be explicit about synchronous boundaries: every synchronous hop extends the critical path and can propagate failure upstream. Be equally explicit about state: local memory, shared cache, replicated database, queue, and object store have different durability and consistency contracts. A robust design also defines identifiers and replay behavior. Request IDs, event IDs, shard keys, transaction IDs, trace IDs, and idempotency keys are not bookkeeping details; they are the handles that let the system detect duplicates, correlate work, route state, and recover safely. Hit ratio At 95% cache hit ratio, only 5 of every 100 requests reach the origin.

## Trade-offs to reason through

- Latency vs coordination - Availability vs consistency - Throughput vs per-request isolation - Operational simplicity vs horizontal scale - Freshness vs caching - Cost vs headroom

## Design-review prompt

If CDN becomes the dominant bottleneck at 10x traffic, which metric would reveal it first, and what change would increase capacity without silently weakening correctness? analysis

## Failure scenario

A cache key ignores the Authorization header and serves one user's private page to another user.

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

Write one sentence that must remain true during this failure. Examples: “A payment is never charged twice,” “committed file metadata never points to a nonexistent blob,” or “critical checkout traffic retains capacity even if analytics is shed.” inspect, and read deeper

## Small implementation / lab

Put a static asset behind a CDN; vary Cache-Control and observe Age, ETag, hit/miss behavior, and invalidation.

## What to measure

- correctness/invariant violations - throughput - p50/p95/p99 latency - error rate - saturation/queue depth - recovery time after injected failure

## Official and primary references

- [Cloudflare CDN overview](https://www.cloudflare.com/learning/cdn/what-is-a-cdn/) - [MDN HTTP caching](https://developer.mozilla.org/en-US/docs/Web/HTTP/Caching)

## Recall checklist

- Why does CDN exist? - What does the simplest correct architecture look like? - Which failure mode is most dangerous? - Which metric tells you it is saturating? - What would you build to prove you understand it?

---
*Source: `Practical_System_Design_Anup_Dangi.pdf`. [Suggest a correction](https://github.com/AnupDangi/learnlikeadev/issues/new)*
