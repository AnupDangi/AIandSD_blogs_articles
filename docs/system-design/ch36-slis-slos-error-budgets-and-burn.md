# Chapter 36 — SLIs, SLOs, Error Budgets, and Burn Rate

*Practical_System_Design_Anup_Dangi.pdf, Chapter 36*

Why this exists. SLOs convert “reliable enough” into a measurable contract. Error budgets make reliability an explicit trade-off; burn rate determines how urgently current failures threaten that budget.

## Three concepts to retain

- SLIs measure user-visible good events over valid events. - SLOs define acceptable reliability over a time window. - Multi-window burn-rate alerts detect both fast outages and slow persistent degradation.

## Senior engineer lens

Identify the invariant, the bottleneck, and the failure boundary before choosing technology. The same product can legitimately use different mechanisms for different data paths. example

## Mechanics

Start from the request or state transition, then identify which component owns each decision. Be explicit about synchronous boundaries: every synchronous hop extends the critical path and can propagate failure upstream. Be equally explicit about state: local memory, shared cache, replicated database, queue, and object store have different durability and consistency contracts. A robust design also defines identifiers and replay behavior. Request IDs, event IDs, shard keys, transaction IDs, trace IDs, and idempotency keys are not bookkeeping details; they are the handles that let the system detect duplicates, correlate work, route state, and recover safely. Burn rate For 99.9% SLO, allowed error rate is 0.1%. Observed 1.4% errors means 14x burn rate.

## Trade-offs to reason through

- Latency vs coordination - Availability vs consistency - Throughput vs per-request isolation - Operational simplicity vs horizontal scale - Freshness vs caching - Cost vs headroom

## Design-review prompt

If SRE becomes the dominant bottleneck at 10x traffic, which metric would reveal it first, and what change would increase capacity without silently weakening correctness?

## Failure scenario

A team pages on CPU >80% even while users are fine, but misses a severe correctness failure that returns HTTP 200.

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

## Small implementation / lab

Generate synthetic request data, define good-event criteria, calculate 28-day error budget and fast/slow burn alerts.

## What to measure

- correctness/invariant violations - throughput - p50/p95/p99 latency - error rate - saturation/queue depth - recovery time after injected failure

## Official and primary references

- [Google SRE - Alerting on SLOs](https://sre.google/workbook/alerting-on-slos/) - [Google SRE - Monitoring distributed systems](https://sre.google/sre-book/monitoring-distributed-systems/)

## Recall checklist

- Why does SRE exist? - What does the simplest correct architecture look like? - Which failure mode is most dangerous? - Which metric tells you it is saturating? - What would you build to prove you understand it?

---
*Source: `Practical_System_Design_Anup_Dangi.pdf`. [Suggest a correction](https://github.com/AnupDangi/learnlikeadev/issues/new)*
