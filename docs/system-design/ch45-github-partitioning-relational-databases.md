# Chapter 45 — GitHub: Partitioning Relational Databases

*Practical_System_Design_Anup_Dangi.pdf, Chapter 45*

## The production problem

GitHub kept relational semantics while progressively decomposing a central MySQL cluster. The case demonstrates vertical partitioning, read replicas, routing layers, and gradual operational migration rather than an overnight rewrite.

## Architecture lesson

Start by moving domain tables to separate clusters, then introduce horizontal sharding where needed. Application tooling and linters must prevent accidental cross-partition access. Copy the reasoning: workload shape, invariant, bottleneck, migration strategy, and operational control. Do not copy the company's database or queue merely because the scale story is impressive. Failure / stress case Partitioning can reduce per-host load while making joins and transactions harder; the application architecture must make data ownership explicit.

## Operational questions

- How is load distributed? - Where can one hot tenant/key/shard dominate? - How is bad state detected? - Can the system be upgraded without full downtime? - What is the rollback or replay path? - Which component has the highest operational toil?

## Rebuild the idea yourself

Take a monolithic schema for users/repos/issues/PRs and propose vertical then horizontal partition boundaries; list every query that becomes cross-cluster. transfer

## Primary engineering source

- [GitHub - Partitioning relational databases](https://github.blog/engineering/infrastructure/partitioning-githubs-)

## Transferable mental model

Translate the architecture into three statements: (1) what state/work was becoming expensive, (2) what partitioning/routing/coordination choice changed the cost curve, and (3) what new failure mode the redesign introduced. This translation is the part that should survive after you forget the exact vendor technology.

## Architecture interview drill

Assume you inherit a smaller version of this system at 1/1000th the traffic. Which mechanisms would you keep, which would you remove, and what signals would tell you when to introduce them later?

---
*Source: `Practical_System_Design_Anup_Dangi.pdf`. [Suggest a correction](https://github.com/AnupDangi/learnlikeadev/issues/new)*
