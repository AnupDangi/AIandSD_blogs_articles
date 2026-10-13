# Chapter 50 — Cloudflare: Durable Objects and Stateful Coordination

*Practical_System_Design_Anup_Dangi.pdf, Chapter 50*

## The production problem

Durable Objects place one globally unique stateful coordinator for a logical key such as a chat room, game, document, or rate limiter. The important idea is to align state scope with coordination scope.

## Architecture lesson

Stateless edge workers route a key to one durable state owner. Each object serializes access to its own state, reducing distributed locking complexity within that key. Copy the reasoning: workload shape, invariant, bottleneck, migration strategy, and operational control. Do not copy the company's database or queue merely because the scale story is impressive. operations Failure / stress case A single object that owns an entire global workload becomes a bottleneck; the object key must partition coordination appropriately.

## Operational questions

- How is load distributed? - Where can one hot tenant/key/shard dominate? - How is bad state detected? - Can the system be upgraded without full downtime? - What is the rollback or replay path? - Which component has the highest operational toil?

## Rebuild the idea yourself

Model collaborative study rooms as one object per room and define which state stays local versus global identity/billing/search services. and transfer

## Primary engineering source

- [Cloudflare - Rules of Durable Objects](https://developers.cloudflare.com/durable-objects/best-practices/rules-of-)

## Transferable mental model

Translate the architecture into three statements: (1) what state/work was becoming expensive, (2) what partitioning/routing/coordination choice changed the cost curve, and (3) what new failure mode the redesign introduced. This translation is the part that should survive after you forget the exact vendor technology.

## Architecture interview drill

Assume you inherit a smaller version of this system at 1/1000th the traffic. Which mechanisms would you keep, which would you remove, and what signals would tell you when to introduce them later?

---
*Source: `Practical_System_Design_Anup_Dangi.pdf`. [Suggest a correction](https://github.com/AnupDangi/learnlikeadev/issues/new)*
