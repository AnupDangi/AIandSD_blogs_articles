# Chapter 43 — Discord: Storing Trillions of Messages

*Practical_System_Design_Anup_Dangi.pdf, Chapter 43*

## The production problem

Discord moved from MongoDB to Cassandra and later to ScyllaDB as operational toil and tail latency became unacceptable. The critical design lesson is not “use ScyllaDB”; it is to connect partition-key design, workload skew, operational cost, and migration strategy.

## Architecture lesson

Channel ID + time bucket preserves locality while bounding partition size. Snowflake IDs provide sortable message identity. Rust-based data services isolate clients from database-specific behavior. Copy the reasoning: workload shape, invariant, bottleneck, migration strategy, and operational control. Do not copy the company's database or queue merely because the scale story is impressive.

- Failure and operations
**Failure / stress case**

During the World Cup, a few huge communities created extreme message spikes; a good partition model and a storage engine with predictable tail behavior mattered more than average throughput.

## Operational questions

- How is load distributed? - Where can one hot tenant/key/shard dominate? - How is bad state detected? - Can the system be upgraded without full downtime? - What is the rollback or replay path? - Which component has the highest operational toil?

## Rebuild the idea yourself

Recreate a message table partitioned by channel and month, generate a Zipf-distributed workload, then identify hot channels and test alternate bucket widths.

- Source notes and transfer
## Primary engineering source

- [Discord - How Discord Stores Trillions of Messages](https://discord.com/blog/how-discord-stores-trillions-of-) messages

## Transferable mental model

Translate the architecture into three statements: (1) what state/work was becoming expensive, (2) what partitioning/routing/coordination choice changed the cost curve, and (3) what new failure mode the redesign introduced. This translation is the part that should survive after you forget the exact vendor technology.

## Architecture interview drill

Assume you inherit a smaller version of this system at 1/1000th the traffic. Which mechanisms would you keep, which would you remove, and what signals would tell you when to introduce them later?

---
*Source: `Practical_System_Design_Anup_Dangi.pdf`. [Suggest a correction](https://github.com/AnupDangi/learnlikeadev/issues/new)*
