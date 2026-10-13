# Chapter 3 — TCP, QUIC, TLS, and Connection Cost

*Practical_System_Design_Anup_Dangi.pdf, Chapter 3*

Why this exists. Application latency starts below HTTP. Handshakes, congestion control, packet loss, and connection reuse materially affect user-perceived response time.

## Three concepts to retain

- TCP requires connection establishment; TLS adds cryptographic negotiation. - HTTP/2 multiplexes streams over a connection; HTTP/3 uses QUIC over UDP. - Connection pooling and keep-alive avoid repeated handshake cost.

## Senior engineer lens

Identify the invariant, the bottleneck, and the failure boundary before choosing technology. The same product can legitimately use different mechanisms for different data paths. TCP, QUIC, TLS, and Connection Cost -

## Mechanics

## Mechanics

Start from the request or state transition, then identify which component owns each decision. Be explicit about synchronous boundaries: every synchronous hop extends the critical path and can propagate failure upstream. Be equally explicit about state: local memory, shared cache, replicated database, queue, and object store have different durability and consistency contracts. A robust design also defines identifiers and replay behavior. Request IDs, event IDs, shard keys, transaction IDs, trace IDs, and idempotency keys are not bookkeeping details; they are the handles that let the system detect duplicates, correlate work, route state, and recover safely. Round trips On a 120 ms RTT path, two additional round trips cost roughly 240 ms before application work.

## Trade-offs to reason through

- Latency vs coordination - Availability vs consistency - Throughput vs per-request isolation - Operational simplicity vs horizontal scale - Freshness vs caching - Cost vs headroom

## Design-review prompt

If transport security becomes the dominant bottleneck at 10x traffic, which metric would reveal it first, and what change would increase capacity without silently weakening correctness? TCP, QUIC, TLS, and Connection Cost - Failure analysis

## Failure scenario

A service looks fast in-region but slow globally because every request opens a fresh connection and performs full TLS negotiation.

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

Write one sentence that must remain true during this failure. Examples: “A payment is never charged twice,” “committed file metadata never points to a nonexistent blob,” or “critical checkout traffic retains capacity even if analytics is shed.” TCP, QUIC, TLS, and Connection Cost - Build, inspect, and read deeper

## Small implementation / lab

Benchmark the same endpoint with connection reuse enabled and disabled; compare handshake count and p95 latency.

## What to measure

- correctness/invariant violations - throughput - p50/p95/p99 latency - error rate - saturation/queue depth - recovery time after injected failure

## Official and primary references

- [Cloudflare TLS handshake](https://www.cloudflare.com/learning/ssl/what-happens-in-a-tls-handshake/) - [MDN HTTP/3](https://developer.mozilla.org/en-US/docs/Glossary/HTTP_3)

## Recall checklist

- Why does transport security exist? - What does the simplest correct architecture look like? - Which failure mode is most dangerous? - Which metric tells you it is saturating? - What would you build to prove you understand it?

---
*Source: `Practical_System_Design_Anup_Dangi.pdf`. [Suggest a correction](https://github.com/AnupDangi/learnlikeadev/issues/new)*
