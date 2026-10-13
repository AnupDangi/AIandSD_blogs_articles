# Roadmap 4 — 60-Day AI Engineering + System Design Sprint

Source: `60_Days_AI_Engineering_System_Design_Roadmap_Anup_Dangi.pdf` · 120 pages = 60 days × 2 cards/day (1 AI + 1 SD).

!!! info "Card format (every one of the 120)"
    Title → WHAT TO LEARN → 5-box flow diagram → LINEAR LEARNING PATH (4 steps) → DO THIS (1 hands-on) → MID-SENIOR CHECKPOINT (1 Q) → REQUIRED READING + OFFICIAL/DEEP REFERENCE (clickable).

## How to run it

- **Daily:** 1 AI card + 1 SD card (~60–90 min). Do the DO THIS lab; answer checkpoint aloud.
- **Weekly:** redo 6 checkpoints from memory; one failure drill from the deep tracks.
- **Capstone (Days 51–60):** serving/GPU/economics + autopsies + full-platform builds.

## Day-by-day map (AI / SD)

| Days | AI focus | SD focus |
|------|----------|----------|
| 01–10 | Stack, tokens, Transformer, attention math, prefill/decode, KV cache, batching, structured outputs, prompts, model selection | URL path, DNS, TCP, TLS, HTTP, API contracts, BoTE, scale-up vs out, LB+health, stateless sessions |
| 11–20 | Embeddings, cosine, exact vs ANN, HNSW/IVF, chunking, contextual retrieval, BM25, hybrid, rerank, prod RAG + eval | Relational modeling, indexes, ACID, MVCC, replication, cache-aside, stampede, CDN, sharding, consistent hashing |
| 21–30 | Workflow vs agent, tool design, ReAct loop, planning, context/state/memory, agent memory, idempotent tools, single vs multi-agent, durable runs, guardrails | Time/ordering, Lamport, quorums, Raft election, Raft log, distributed IDs, queues, Kafka topics, consumer groups, delivery semantics |
| 31–40 | Eval datasets, LLM-judge, trajectory evals, statistical evals, prod flywheel, tracing, cost/success, latency waterfall, AI SLOs, reliability budgets | Retry+DLQ, outbox, sagas, CDC, strong vs eventual, CRDT, metrics/logs/traces, OTel, SLI/SLO, burn-rate |
| 41–50 | Context budgets, prompt caching, routing/cascades, failover/degrade, background jobs, injection, sandboxing, verification, canary gates, improvement loops | Little's law, backpressure, retry/jitter, breakers/bulkheads, rate limits, shedding, tail latency, schema evolution, flags/canary, multi-region DR |
| 51–60 | Memory compaction, serving arch, GPU throughput, inference bottlenecks, long-tail economics, threat model, incident debugging, readiness review, full prod platform, AI capstone | Discord storing/indexing, GitHub partitioning, Memcache, Haystack, Stripe limiters, Uber DLQ, Durable Objects, Dapper+SRE, SD capstone |

*Day pages (day01→day60) expand one-by-one in Phase 1+, each bundling its AI + SD cards with readings.*
