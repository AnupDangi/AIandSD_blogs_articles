# Chapter 52 — Google: Dapper and Distributed Tracing

*Practical_System_Design_Anup_Dangi.pdf, Chapter 52*

## The production problem

Dapper demonstrated that low-overhead tracing can reconstruct requests across thousands of services. Modern OpenTelemetry follows the same core abstraction: traces contain spans connected by parent/child context.

## Architecture lesson

Common RPC libraries propagate trace context. Sampling controls cost. The trace lets operators identify which dependency dominated latency or failed. Copy the reasoning: workload shape, invariant, bottleneck, migration strategy, and operational control. Do not copy the company's database or queue merely because the scale story is impressive. Failure / stress case Sampling means traces are not a complete accounting system; high-cardinality metrics/logs and traces answer different questions.

## Operational questions

- How is load distributed? - Where can one hot tenant/key/shard dominate? - How is bad state detected? - Can the system be upgraded without full downtime? - What is the rollback or replay path? - Which component has the highest operational toil?

## Rebuild the idea yourself

Instrument a five-service toy request, sample 10%, then create a latency incident in one leaf service and locate it from trace waterfalls.

## Primary engineering source

- [Google Research - Dapper](https://research.google/pubs/dapper-a-large-scale-distributed-systems-tracing-) infrastructure/ - [OpenTelemetry traces](https://opentelemetry.io/docs/concepts/signals/traces/)

## Transferable mental model

Translate the architecture into three statements: (1) what state/work was becoming expensive, (2) what partitioning/routing/coordination choice changed the cost curve, and (3) what new failure mode the redesign introduced. This translation is the part that should survive after you forget the exact vendor technology.

## Architecture interview drill

Assume you inherit a smaller version of this system at 1/1000th the traffic. Which mechanisms would you keep, which would you remove, and what signals would tell you when to introduce them later? PRACTICALLY STRONG These projects are intentionally from different system categories. The goal is not to finish five CRUD apps; it is to repeatedly design, measure, break, recover, and explain trade-offs. Build a production URL shortener that starts on one PostgreSQL instance and evolves to cached reads, generated IDs, abuse controls, partitioning, analytics events, and multi-region redirect serving. Architecture milestones - REST API + idempotent create - Base62/Snowflake ID strategy - PostgreSQL schema + indexes - Redis cache-aside - Click event Kafka pipeline - Rate limits + abuse prevention - Load test and SLO Required experiment Establish a baseline, run a load test, inject at least two failures, capture traces/metrics, then redesign one bottleneck. Write a one-page incident review explaining the before/after architecture and evidence. Definition of done You can draw the architecture from memory, calculate its expected capacity, explain its consistency model, demonstrate a controlled failure, and justify why each major component exists. Senior design review

1. What is the source of truth?
2. What is partitioned, and by what key?
3. Which path is synchronous?
4. What can be eventually consistent?
5. What happens at 10x traffic?
6. What happens when the queue or cache is unavailable?
7. How are duplicate requests/events handled?
8. What SLO would you publish?
9. How would you deploy v2 safely?
10. What would you remove if traffic were 100x smaller?
Build a real-time chat backend with websocket gateways, presence, partitioned message storage, read receipts, notifications, search indexing, and retryable background jobs. Architecture milestones - WebSocket gateway - Message IDs and channel partitioning - Kafka events - Presence state - Search index lag - Hot-channel handling - DLQ + replay tooling Required experiment Establish a baseline, run a load test, inject at least two failures, capture traces/metrics, then redesign one bottleneck. Write a one-page incident review explaining the before/after architecture and evidence. Definition of done You can draw the architecture from memory, calculate its expected capacity, explain its consistency model, demonstrate a controlled failure, and justify why each major component exists. Senior design review

1. What is the source of truth?
2. What is partitioned, and by what key?
3. Which path is synchronous?
4. What can be eventually consistent?
5. What happens at 10x traffic?
6. What happens when the queue or cache is unavailable?
7. How are duplicate requests/events handled?
8. What SLO would you publish?
9. How would you deploy v2 safely?
10. What would you remove if traffic were 100x smaller?
**Platform**

Build video upload and delivery architecture with direct-to-object-storage upload, resumable chunks, transcoding queues, metadata DB, CDN distribution, and asynchronous moderation/analytics. Architecture milestones - Multipart upload - Object storage - Transcoding workers - Queue/backpressure - Metadata DB - CDN cache policy - Failure recovery Required experiment Establish a baseline, run a load test, inject at least two failures, capture traces/metrics, then redesign one bottleneck. Write a one-page incident review explaining the before/after architecture and evidence. Definition of done You can draw the architecture from memory, calculate its expected capacity, explain its consistency model, demonstrate a controlled failure, and justify why each major component exists.

1. What is the source of truth?
2. What is partitioned, and by what key?
3. Which path is synchronous?
4. What can be eventually consistent?
5. What happens at 10x traffic?
6. What happens when the queue or cache is unavailable?
7. How are duplicate requests/events handled?
8. What SLO would you publish?
9. How would you deploy v2 safely?
10. What would you remove if traffic were 100x smaller?
**Clone**

Build a file-sync system with chunking, content hashes, delta upload, object storage, version metadata, notifications, offline reconciliation, and conflict handling. Architecture milestones - Chunk manifest - Content-addressed blocks - Version graph - Strong metadata transactions - Long-poll/WebSocket notification - Offline sync - Recovery from partial upload Required experiment Establish a baseline, run a load test, inject at least two failures, capture traces/metrics, then redesign one bottleneck. Write a one-page incident review explaining the before/after architecture and evidence. Definition of done You can draw the architecture from memory, calculate its expected capacity, explain its consistency model, demonstrate a controlled failure, and justify why each major component exists.

1. What is the source of truth?
2. What is partitioned, and by what key?
3. Which path is synchronous?
4. What can be eventually consistent?
5. What happens at 10x traffic?
6. What happens when the queue or cache is unavailable?
7. How are duplicate requests/events handled?
8. What SLO would you publish?
9. How would you deploy v2 safely?
10. What would you remove if traffic were 100x smaller?
Combine both books: collaborative rooms, PDF uploads, AI jobs, vector indexing, billing, notifications, analytics, Kafka, Postgres, Redis, object storage, SLOs, tracing, canaries, and overload controls. Architecture milestones - Capacity estimation - API gateway + auth - Postgres + Redis + object storage - Kafka event backbone - Search/vector indexes - Durable AI jobs - SLO/error budgets - Canary releases + DR Required experiment Establish a baseline, run a load test, inject at least two failures, capture traces/metrics, then redesign one bottleneck. Write a one-page incident review explaining the before/after architecture and evidence. Definition of done You can draw the architecture from memory, calculate its expected capacity, explain its consistency model, demonstrate a controlled failure, and justify why each major component exists.

- Senior design review
1. What is the source of truth?
2. What is partitioned, and by what key?
3. Which path is synchronous?
4. What can be eventually consistent?
5. What happens at 10x traffic?
6. What happens when the queue or cache is unavailable?
7. How are duplicate requests/events handled?
8. What SLO would you publish?
9. How would you deploy v2 safely?
10. What would you remove if traffic were 100x smaller?
**Interview / Design-Review**

**Framework**

- 1. Clarify functional requirements and non-functional constraints. - 2. Estimate traffic, storage, bandwidth, concurrency, and growth. - 3. Define external API and important data entities. - 4. Draw the minimal end-to-end request path. - 5. Identify source of truth and consistency requirements. - 6. Add scaling mechanisms only where estimates demand them. - 7. Define failure behavior, retry policy, overload controls, and recovery. - 8. Define telemetry and SLOs. - 9. Explain migration/deployment and rollback. - 10. State explicit trade-offs and rejected alternatives. Memorizing - L = lambda * W (Little's Law). - Average QPS = requests/day / 86,400. - Peak QPS = average QPS * peak factor. - Burn rate = observed error rate / allowed error rate. - Quorum overlap heuristic: R + W > N. - Independent fan-out: P(all within threshold)=p^n. - Risk ≈ P(failure) * blast radius. Checklist - Kill one API replica. - Pause one Kafka consumer. - Introduce 500 ms DB latency. - Make cache unavailable. - Expire a hot key simultaneously. - Drop 10% of dependency calls. - Return 429/503 from an external service. - Create one poison event. - Promote a lagging replica in staging. - Deploy an intentionally slower canary. - Fill a worker pool with background traffic. - Delay indexing by five minutes. Checklist - Ownership and on-call are defined. - SLIs/SLOs exist for user journeys. - Timeouts and deadlines are explicit. - Retries are bounded and jittered. - Side effects are idempotent. - Queues have backlog/age alerts and DLQ policy. - Caches have miss-storm protection. - Database backups and restore are tested. - Schema changes are backward compatible. - Canary + rollback are practiced. - Metrics/logs/traces correlate by stable IDs. - Capacity and load-shedding thresholds are documented. PostgreSQL: <https://www.postgresql.org/docs/current/> Kafka: <https://kafka.apache.org/documentation/> Redis: <https://redis.io/docs/latest/> OpenTelemetry: <https://opentelemetry.io/docs/> Google SRE: <https://sre.google/> Raft: <https://raft.github.io/> Stripe Engineering: <https://stripe.com/blog/engineering> GitHub Engineering: <https://github.blog/engineering/> Discord Engineering: <https://discord.com/category/engineering> Meta Engineering: <https://engineering.fb.com/> Uber Engineering: <https://www.uber.com/blog/engineering/> Cloudflare Engineering: <https://blog.cloudflare.com/tag/engineering/> Not Diagrams A strong system designer can start from a user journey, estimate the workload, choose where truth lives, define consistency, identify the saturation boundary, control overload, and explain how the system fails and recovers. Technology names are secondary. The durable skill is reasoning from constraints to trade-offs and validating those trade-offs with measurements. The permanent questions Where does truth live? What can be stale? What must never become false? What is the critical path? What happens at 10x traffic? What happens when one dependency disappears? How does overload propagate? How is the incident observed? How is a change rolled back?

---
*Source: `Practical_System_Design_Anup_Dangi.pdf`. [Suggest a correction](https://github.com/AnupDangi/learnlikeadev/issues/new)*
