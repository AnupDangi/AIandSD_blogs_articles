# Chapter 1 — What Happens When You Type a URL?

*Practical_System_Design_Anup_Dangi.pdf, Chapter 1*

Why this exists. A web request is a chain of independent systems. Senior engineers reason about the entire path, because DNS, transport, TLS, proxies, applications, caches, and databases can each add latency or fail independently.

## Three concepts to retain

- DNS resolves a name to a routable endpoint. - TCP/QUIC creates transport; TLS establishes identity and encryption. - HTTP flows through edge, load balancer, application, cache, and database layers.

## Senior engineer lens

Identify the invariant, the bottleneck, and the failure boundary before choosing technology. The same product can legitimately use different mechanisms for different data paths. What Happens When You Type a example

## Mechanics

Start from the request or state transition, then identify which component owns each decision. Be explicit about synchronous boundaries: every synchronous hop extends the critical path and can propagate failure upstream. Be equally explicit about state: local memory, shared cache, replicated database, queue, and object store have different durability and consistency contracts. A robust design also defines identifiers and replay behavior. Request IDs, event IDs, shard keys, transaction IDs, trace IDs, and idempotency keys are not bookkeeping details; they are the handles that let the system detect duplicates, correlate work, route state, and recover safely.

## Latency budget

If DNS takes 30 ms, TCP+TLS 80 ms, edge 20 ms, API 40 ms, and DB 25 ms, the request is already 195 ms before rendering.

## Trade-offs to reason through

- Latency vs coordination - Availability vs consistency - Throughput vs per-request isolation - Operational simplicity vs horizontal scale - Freshness vs caching - Cost vs headroom

## Design-review prompt

If web request path becomes the dominant bottleneck at 10x traffic, which metric would reveal it first, and what change would increase capacity without silently weakening correctness? What Happens When You Type a

## Failure scenario

A user in Bengaluru reports a 2-second page while the API dashboard shows 80 ms. Trace every network and browser stage before blaming the application.

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

Write one sentence that must remain true during this failure. Examples: “A payment is never charged twice,” “committed file metadata never points to a nonexistent blob,” or “critical checkout traffic retains capacity even if analytics is shed.” What Happens When You Type a deeper

## Small implementation / lab

Use curl -v, dig, traceroute/mtr, and browser DevTools to document one real request from DNS lookup to response body.

## What to measure

- correctness/invariant violations - throughput - p50/p95/p99 latency - error rate - saturation/queue depth - recovery time after injected failure

## Official and primary references

- [MDN HTTP overview](https://developer.mozilla.org/en-US/docs/Web/HTTP/Guides/Overview) - [Cloudflare TLS handshake](https://www.cloudflare.com/learning/ssl/what-happens-in-a-tls-handshake/)

## Recall checklist

- Why does web request path exist? - What does the simplest correct architecture look like? - Which failure mode is most dangerous? - Which metric tells you it is saturating? - What would you build to prove you understand it?

---
*Source: `Practical_System_Design_Anup_Dangi.pdf`. [Suggest a correction](https://github.com/AnupDangi/learnlikeadev/issues/new)*
