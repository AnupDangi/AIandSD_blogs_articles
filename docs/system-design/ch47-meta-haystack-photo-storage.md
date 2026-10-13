# Chapter 47 — Meta: Haystack Photo Storage

*Practical_System_Design_Anup_Dangi.pdf, Chapter 47*

## The production problem

Haystack was designed because storing billions of small image files made filesystem metadata operations a dominant cost. The system packs many objects into larger append-oriented files and uses a compact in-memory index for direct location.

## Architecture lesson

Object ID maps to store file, offset, and length. Large sequential store files reduce expensive filesystem metadata lookups. CDN/cache layers serve hot content while Haystack handles durable origin reads. Copy the reasoning: workload shape, invariant, bottleneck, migration strategy, and operational control. Do not copy the company's database or queue merely because the scale story is impressive. Failure and operations Failure / stress case The lesson generalizes: metadata can cost more than payload when object counts become enormous.

## Operational questions

- How is load distributed? - Where can one hot tenant/key/shard dominate? - How is bad state detected? - Can the system be upgraded without full downtime? - What is the rollback or replay path? - Which component has the highest operational toil?

## Rebuild the idea yourself

Build two stores for 100k small blobs: one-file-per-object and one append-only data file + SQLite offset index; compare inode count and random read overhead. Source notes and transfer

## Primary engineering source

- [Meta - Needle in a Haystack](https://engineering.fb.com/2009/04/30/core-infra/needle-in-a-haystack-efficient-)

## Transferable mental model

Translate the architecture into three statements: (1) what state/work was becoming expensive, (2) what partitioning/routing/coordination choice changed the cost curve, and (3) what new failure mode the redesign introduced. This translation is the part that should survive after you forget the exact vendor technology.

## Architecture interview drill

Assume you inherit a smaller version of this system at 1/1000th the traffic. Which mechanisms would you keep, which would you remove, and what signals would tell you when to introduce them later?

---
*Source: `Practical_System_Design_Anup_Dangi.pdf`. [Suggest a correction](https://github.com/AnupDangi/learnlikeadev/issues/new)*
