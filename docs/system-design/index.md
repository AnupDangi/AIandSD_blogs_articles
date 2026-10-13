# Roadmap 2 — Practical System Design (52 chapters)

Source: `Practical_System_Design_Anup_Dangi.pdf` · 232 pages · Parts I–VII + Appendices A–F.

!!! info "How to use this track"
    Foundation chapters 1–42 share one format (Why → Figure → 3 concepts → Mechanics + latency/invariant → Trade-offs → Failure + 7Qs). Autopsies 43–52 share another (Problem → Lesson → Copy/Not-copy → Stress case → 6 ops Qs → Rebuild lab → Interview drill).

## Part I — Request Path (Ch 1–6)

| Ch | Topic | Anchor lab |
|----|-------|------------|
| 1 | What happens when you type a URL (195ms budget) | curl -v stage map |
| 2 | DNS: recursive vs authoritative, TTL | dig +trace |
| 3 | TCP/QUIC/TLS handshakes, pooling, H2/H3 | RTT math |
| 4 | HTTP APIs: idempotency keys, cursor pagination, versioning | POST /orders idempotent |
| 5 | CDNs/edge: cache keys, purge vs expire | Hit-ratio origin math |
| 6 | Capacity estimation: QPS avg→peak 5x, storage, bandwidth | 10M DAU estimate |

## Part II — Scaling Backend (Ch 7–12)

| Ch | Topic |
|----|-------|
| 7 | Vertical vs horizontal; stateful dep bounds |
| 8 | Load balancing/health: RR vs least-conn vs weighted; draining |
| 9 | Stateless/sessions: sticky vs Redis vs signed cookie |
| 10 | Rate limiting: token bucket + concurrency limits |
| 11 | Autoscaling/saturation: feedback, warmup, oscillation |
| 12 | Tail/fan-out: max(n) amplification, hedging |

## Part III — Data Systems (Ch 13–23)

13 relational modeling · 14 ACID · 15 isolation/MVCC · 16 indexes (B-tree/Hash/GIN/BRIN) · 17 replication/failover · 18 caching/TTL/stampede · 19 Redis persistence/eviction · 20 sharding · 21 consistent hashing/vnodes · 22 NoSQL · 23 object storage/content-addressing.

## Part IV — Distributed / Event-Driven (Ch 24–34)

24 Lamport time · 25 quorums (R+W>N) · 26 Raft · 27 Snowflake IDs · 28 queues/backpressure (λ vs μ) · 29 Kafka logs/partitions/groups · 30 delivery semantics · 31 retry/poison/DLQ · 32 outbox · 33 sagas · 34 consistency/convergence (linearizable, session, CRDT).

## Part V — Reliability / Prod Ops (Ch 35–42)

35 observability · 36 SLI/SLO/burn · 37 timeout/retry/backoff/jitter · 38 breakers/bulkheads · 39 shedding/admission · 40 canary/flags/rollback · 41 multi-region/DR (RPO/RTO) · 42 zero-downtime schema (expand-contract).

## Part VI — Architecture Autopsies (Ch 43–52)

43 Discord storing trillions · 44 Discord indexing · 45 GitHub partitioning · 46 Meta Memcache · 47 Meta Haystack · 48 Stripe limiters · 49 Uber Kafka retry/DLQ · 50 Cloudflare Durable Objects · 51 Worker warmth · 52 Google Dapper.

## Part VII — Projects + Appendices

Projects: URL shortener · Discord/Slack chat · YouTube video · Drive/Dropbox · Large AI learning platform (each: milestones + required experiment + 10 senior review Qs).
Appendices: A interview framework · B equations · C 12 failure-injection drills · D 12 readiness checks · E glossary · F source index.
