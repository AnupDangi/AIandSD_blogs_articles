# Chapter 2 — DNS: Naming, Caching, and Failure

*Practical_System_Design_Anup_Dangi.pdf, Chapter 2*

Why this exists. DNS is a distributed, cached naming system. Its scalability comes from delegation and caching; its failure modes come from stale caches, misconfiguration, propagation delays, and dependency on resolvers.

## Three concepts to retain

- Recursive resolvers cache answers according to TTL. - Authoritative servers own zones; registrars and registries form the delegation chain. - Negative caching and multiple record types affect failover behavior.

## Senior engineer lens

Identify the invariant, the bottleneck, and the failure boundary before choosing technology. The same product can legitimately use different mechanisms for different data paths.

## Mechanics

## Mechanics

Start from the request or state transition, then identify which component owns each decision. Be explicit about synchronous boundaries: every synchronous hop extends the critical path and can propagate failure upstream. Be equally explicit about state: local memory, shared cache, replicated database, queue, and object store have different durability and consistency contracts. A robust design also defines identifiers and replay behavior. Request IDs, event IDs, shard keys, transaction IDs, trace IDs, and idempotency keys are not bookkeeping details; they are the handles that let the system detect duplicates, correlate work, route state, and recover safely. TTL trade-off A 300-second TTL allows faster endpoint changes than 24 hours, but causes more resolver traffic.

## Trade-offs to reason through

- Latency vs coordination - Availability vs consistency - Throughput vs per-request isolation - Operational simplicity vs horizontal scale - Freshness vs caching - Cost vs headroom

## Design-review prompt

If DNS becomes the dominant bottleneck at 10x traffic, which metric would reveal it first, and what change would increase capacity without silently weakening correctness? Failure analysis

## Failure scenario

You change an A record during an outage but many clients keep using the old address because the prior TTL was one day.

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

Use dig +trace on a domain, inspect NS/A/AAAA/CNAME records, and change a test record with two TTLs to observe propagation.

## What to measure

- correctness/invariant violations - throughput - p50/p95/p99 latency - error rate - saturation/queue depth - recovery time after injected failure

## Official and primary references

- [Cloudflare DNS learning center](https://www.cloudflare.com/learning/dns/what-is-dns/) - [RFC 1034](https://www.rfc-editor.org/rfc/rfc1034)

## Recall checklist

- Why does DNS exist? - What does the simplest correct architecture look like? - Which failure mode is most dangerous? - Which metric tells you it is saturating? - What would you build to prove you understand it?

---
*Source: `Practical_System_Design_Anup_Dangi.pdf`. [Suggest a correction](https://github.com/AnupDangi/learnlikeadev/issues/new)*
