# Chapter 46 — Meta: Scaling Memcache

*Practical_System_Design_Anup_Dangi.pdf, Chapter 46*

## The production problem

Facebook/Meta used Memcache as a globally distributed cache layer with regional clusters, invalidation mechanisms, and careful handling of fan-out and hotspots. It demonstrates that caching at billion-user scale is a consistency and network problem, not just a hashmap.

## Architecture lesson

Web servers read from cache first; misses reach backing stores. Invalidations propagate after writes. Regional layers reduce cross-region dependency and protect the database. Copy the reasoning: workload shape, invariant, bottleneck, migration strategy, and operational control. Do not copy the company's database or queue merely because the scale story is impressive. and operations Failure / stress case A cache cluster failure can shift enormous load to the database; overprovisioning, staged recovery, and miss- rate control are part of the design.

## Operational questions

- How is load distributed? - Where can one hot tenant/key/shard dominate? - How is bad state detected? - Can the system be upgraded without full downtime? - What is the rollback or replay path? - Which component has the highest operational toil?

## Rebuild the idea yourself

Simulate 1M keys with Zipf popularity; compare LRU hit rate, hot-key concentration, and database load during a cold-cache restart. notes and transfer

## Primary engineering source

- [Meta - Scaling Memcache at Facebook](https://engineering.fb.com/2013/04/15/core-infra/scaling-memcache-at-) facebook/

## Transferable mental model

Translate the architecture into three statements: (1) what state/work was becoming expensive, (2) what partitioning/routing/coordination choice changed the cost curve, and (3) what new failure mode the redesign introduced. This translation is the part that should survive after you forget the exact vendor technology.

## Architecture interview drill

Assume you inherit a smaller version of this system at 1/1000th the traffic. Which mechanisms would you keep, which would you remove, and what signals would tell you when to introduce them later?

---
*Source: `Practical_System_Design_Anup_Dangi.pdf`. [Suggest a correction](https://github.com/AnupDangi/learnlikeadev/issues/new)*
