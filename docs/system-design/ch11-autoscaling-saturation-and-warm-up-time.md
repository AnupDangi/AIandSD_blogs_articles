# Chapter 11 — Autoscaling, Saturation, and Warm-Up Time

*Practical_System_Design_Anup_Dangi.pdf, Chapter 11*

Why this exists. Autoscaling is a feedback-control problem. Reactive metrics, delayed capacity, workload heterogeneity, and startup time can create oscillation or persistent overload.

## Three concepts to retain

- CPU is useful only if it tracks the constrained resource. - Scale-out delay must be shorter than the time-to-overload or predictive scaling is needed. - Scale-in requires draining and stabilization windows to avoid thrashing.

## Senior engineer lens

Identify the invariant, the bottleneck, and the failure boundary before choosing technology. The same product can legitimately use different mechanisms for different data paths. example

## Mechanics

Start from the request or state transition, then identify which component owns each decision. Be explicit about synchronous boundaries: every synchronous hop extends the critical path and can propagate failure upstream. Be equally explicit about state: local memory, shared cache, replicated database, queue, and object store have different durability and consistency contracts. A robust design also defines identifiers and replay behavior. Request IDs, event IDs, shard keys, transaction IDs, trace IDs, and idempotency keys are not bookkeeping details; they are the handles that let the system detect duplicates, correlate work, route state, and recover safely. Headroom If instances take 4 minutes to warm and traffic can double in 1 minute, reactive autoscaling alone cannot prevent an overload window.

## Trade-offs to reason through

- Latency vs coordination - Availability vs consistency - Throughput vs per-request isolation - Operational simplicity vs horizontal scale - Freshness vs caching - Cost vs headroom

## Design-review prompt

If autoscaling becomes the dominant bottleneck at 10x traffic, which metric would reveal it first, and what change would increase capacity without silently weakening correctness?

## Failure scenario

Autoscaler targets 70% average CPU while 5% of hosts are already saturated due to uneven request placement.

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

Write one sentence that must remain true during this failure. Examples: “A payment is never charged twice,” “committed file metadata never points to a nonexistent blob,” or “critical checkout traffic retains capacity even if analytics is shed.” deeper

## Small implementation / lab

Create a toy autoscaler around queue depth; introduce a 30-second startup delay and observe overshoot/undershoot.

## What to measure

- correctness/invariant violations - throughput - p50/p95/p99 latency - error rate - saturation/queue depth - recovery time after injected failure

## Official and primary references

- [Google Cloud autoscaling concepts](https://cloud.google.com/compute/docs/autoscaler) - [Meta tail utilization](https://engineering.fb.com/2024/07/10/production-engineering/tail-utilization-ads-) inference-meta/

## Recall checklist

- Why does autoscaling exist? - What does the simplest correct architecture look like? - Which failure mode is most dangerous? - Which metric tells you it is saturating? - What would you build to prove you understand it?

---
*Source: `Practical_System_Design_Anup_Dangi.pdf`. [Suggest a correction](https://github.com/AnupDangi/learnlikeadev/issues/new)*
