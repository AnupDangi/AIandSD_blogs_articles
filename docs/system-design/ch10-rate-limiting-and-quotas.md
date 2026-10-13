# Chapter 10 — Rate Limiting and Quotas

*Practical_System_Design_Anup_Dangi.pdf, Chapter 10*

Why this exists. Rate limits protect shared systems from abuse, accidents, retry storms, and unfair tenants. A production limiter must define scope, algorithm, distributed state, and client feedback.

## Three concepts to retain

- Token bucket permits bursts while bounding long-term rate. - Concurrency limits protect expensive long-duration operations that QPS limits miss. - Rate-limit scope can be per user, API key, endpoint, tenant, region, or fleet.

## Senior engineer lens

Identify the invariant, the bottleneck, and the failure boundary before choosing technology. The same product can legitimately use different mechanisms for different data paths.

## Mechanics

## Mechanics

Start from the request or state transition, then identify which component owns each decision. Be explicit about synchronous boundaries: every synchronous hop extends the critical path and can propagate failure upstream. Be equally explicit about state: local memory, shared cache, replicated database, queue, and object store have different durability and consistency contracts. A robust design also defines identifiers and replay behavior. Request IDs, event IDs, shard keys, transaction IDs, trace IDs, and idempotency keys are not bookkeeping details; they are the handles that let the system detect duplicates, correlate work, route state, and recover safely. Little’s Law connection 100 requests/s * 5 s service time = about 500 concurrent in-flight requests.

## Trade-offs to reason through

- Latency vs coordination - Availability vs consistency - Throughput vs per-request isolation - Operational simplicity vs horizontal scale - Freshness vs caching - Cost vs headroom

## Design-review prompt

If rate limiting becomes the dominant bottleneck at 10x traffic, which metric would reveal it first, and what change would increase capacity without silently weakening correctness? analysis

## Failure scenario

An endpoint accepts only 20 RPS but each request takes 60 seconds, exhausting all worker slots despite a seemingly low rate.

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

Implement token-bucket and concurrency limiters; load-test them with short and long requests.

## What to measure

- correctness/invariant violations - throughput - p50/p95/p99 latency - error rate - saturation/queue depth - recovery time after injected failure

## Official and primary references

- [Stripe rate limiters](https://stripe.com/blog/rate-limiters) - [NGINX request limiting](https://nginx.org/en/docs/http/ngx_http_limit_req_module.html)

## Recall checklist

- Why does rate limiting exist? - What does the simplest correct architecture look like? - Which failure mode is most dangerous? - Which metric tells you it is saturating? - What would you build to prove you understand it?

---
*Source: `Practical_System_Design_Anup_Dangi.pdf`. [Suggest a correction](https://github.com/AnupDangi/learnlikeadev/issues/new)*
