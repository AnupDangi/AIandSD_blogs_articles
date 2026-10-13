# Day 52 — LLM serving architecture + Discord: indexing trillions of messages

!!! tip "Daily reps (~60–90 min)"
    Do both cards. Run each DO THIS lab, answer each checkpoint aloud before rereading.

## AI card — LLM serving architecture

**What to learn, in order:** Integrate scheduler, batching, KV cache, GPU memory, request queue, and streaming into one serving mental model.

```mermaid
flowchart LR
    A["Requests"]
    B["Scheduler"]
    C["KV cache"]
    D["GPU"]
    E["Streams"]
    A --> B --> C --> D --> E
```

**Linear learning path**

1. Admission queue
2. Continuous batch scheduler
3. KV allocation
4. Streaming decode

!!! example "DO THIS"
    Draw an inference server and label which resource limits prompt-heavy vs generation-heavy workloads.

!!! question "Mid-senior checkpoint"
    What metric should admission control use when requests have wildly different token lengths?

**Sources**

- Required: [vLLM: PagedAttention and High-throughput LLM Serving](https://arxiv.org/abs/2309.06180) — Explains KV-cache memory pressure, PagedAttention, and why serving throughput is a scheduling and memory problem.
- Official / deep: [vLLM - Open-source LLM inference and serving engine](https://github.com/vllm-project/vllm) — Implementation reference for continuous batching, paged KV cache, OpenAI-compatible serving, and benchmarks.

---

## System Design card — Discord: indexing trillions of messages

**What to learn, in order:** Study why the source-of-truth database and search index need separate architectures and consistency expectations.

```mermaid
flowchart LR
    A["DB/event source"]
    B["Index queue"]
    C["Index workers"]
    D["Search shards"]
    E["Query"]
    A --> B --> C --> D --> E
```

**Linear learning path**

1. Indexing pipeline
2. Sharding/index ownership
3. Index lag
4. Rebuild/migration strategy

!!! example "DO THIS"
    Pause an indexing worker for 5 minutes and define what search consistency the user should expect.

!!! question "Mid-senior checkpoint"
    How do you rebuild a search index without taking search offline?

**Sources**

- Required: [How Discord Indexes Trillions of Messages](https://discord.com/blog/how-discord-indexes-trillions-of-messages) — Separates source-of-truth storage from search indexing and shows indexing pipelines, sharding, and migration pressures.
- Official / deep: [Apache Kafka Design](https://kafka.apache.org/design/) — Official explanation of partitions, persistence, batching, consumer offsets, replication, and delivery guarantees.

---
*Source: `60_Days_AI_Engineering_System_Design_Roadmap_Anup_Dangi.pdf`, Day 52 cards. [Suggest a correction](https://github.com/AnupDangi/learnlikeadev/issues/new)*
