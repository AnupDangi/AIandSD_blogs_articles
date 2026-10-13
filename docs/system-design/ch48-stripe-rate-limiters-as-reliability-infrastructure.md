# Chapter 48 — Stripe: Rate Limiters as Reliability Infrastructure

*Practical_System_Design_Anup_Dangi.pdf, Chapter 48*

## The production problem

Stripe uses multiple limiters because “too much traffic” has several meanings: one user can spike QPS, one endpoint can consume concurrency, the whole fleet can saturate, or worker utilization can indicate overload.

## Architecture lesson

Requests encounter limiters before expensive work. Different limiters protect tenant fairness, endpoint concurrency, and fleet capacity. Rejections are intentional load shedding. Copy the reasoning: workload shape, invariant, bottleneck, migration strategy, and operational control. Do not copy the company's database or queue merely because the scale story is impressive. operations Failure / stress case Correct 429/503 semantics and Retry-After behavior matter; bad clients can convert rejection into retry amplification.

## Operational questions

- How is load distributed? - Where can one hot tenant/key/shard dominate? - How is bad state detected? - Can the system be upgraded without full downtime? - What is the rollback or replay path? - Which component has the highest operational toil?

## Rebuild the idea yourself

Build a small API with per-user token bucket + global concurrency limiter + priority reservation; overload it and measure accepted p95 latency. transfer

## Primary engineering source

- [Stripe - Scaling your API with rate limiters](https://stripe.com/blog/rate-limiters)

## Transferable mental model

Translate the architecture into three statements: (1) what state/work was becoming expensive, (2) what partitioning/routing/coordination choice changed the cost curve, and (3) what new failure mode the redesign introduced. This translation is the part that should survive after you forget the exact vendor technology.

## Architecture interview drill

Assume you inherit a smaller version of this system at 1/1000th the traffic. Which mechanisms would you keep, which would you remove, and what signals would tell you when to introduce them later?

---
*Source: `Practical_System_Design_Anup_Dangi.pdf`. [Suggest a correction](https://github.com/AnupDangi/learnlikeadev/issues/new)*
