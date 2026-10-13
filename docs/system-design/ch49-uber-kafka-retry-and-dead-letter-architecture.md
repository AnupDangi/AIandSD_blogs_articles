# Chapter 49 — Uber: Kafka Retry and Dead-Letter Architecture

*Practical_System_Design_Anup_Dangi.pdf, Chapter 49*

## The production problem

Uber separated failed processing from live traffic using retry topics with delays and a DLQ. This avoids head-of- line blocking and makes failure handling observable and operable.

## Architecture lesson

A failed event moves to a delayed retry topic; after several tiers it lands in a DLQ. Operators need list/purge/replay workflows, not just storage. Copy the reasoning: workload shape, invariant, bottleneck, migration strategy, and operational control. Do not copy the company's database or queue merely because the scale story is impressive. Failure / stress case If every failure is retried immediately, a downstream outage becomes a self-generated traffic attack.

## Operational questions

- How is load distributed? - Where can one hot tenant/key/shard dominate? - How is bad state detected? - Can the system be upgraded without full downtime? - What is the rollback or replay path? - Which component has the highest operational toil?

## Rebuild the idea yourself

Implement main/retry/DLQ topics and a CLI that lists, patches, and replays DLQ events. transfer

## Primary engineering source

- [Uber - Reliable Reprocessing and DLQs](https://www.uber.com/in/en/blog/reliable-reprocessing/)

## Transferable mental model

Translate the architecture into three statements: (1) what state/work was becoming expensive, (2) what partitioning/routing/coordination choice changed the cost curve, and (3) what new failure mode the redesign introduced. This translation is the part that should survive after you forget the exact vendor technology.

## Architecture interview drill

Assume you inherit a smaller version of this system at 1/1000th the traffic. Which mechanisms would you keep, which would you remove, and what signals would tell you when to introduce them later?

---
*Source: `Practical_System_Design_Anup_Dangi.pdf`. [Suggest a correction](https://github.com/AnupDangi/learnlikeadev/issues/new)*
