# Day 57 — AI incident debugging and root-cause analysis + Uber: Kafka retry and DLQ architecture

!!! tip "Daily reps (~60–90 min)"
    Do both cards. Run each DO THIS lab, answer each checkpoint aloud before rereading.

## AI card — AI incident debugging and root-cause analysis

**What to learn, in order:** Use traces, metrics, release metadata, and eval failures together to debug probabilistic systems.

```mermaid
flowchart LR
    A["Alert"]
    B["Timeline"]
    C["Telemetry"]
    D["Hypotheses"]
    E["RCA/fix"]
    A --> B --> C --> D --> E
```

**Linear learning path**

1. Establish timeline
2. Separate model/provider/app changes
3. Compare healthy vs failing traces
4. Preserve evidence before changing prompts

!!! example "DO THIS"
    Create a synthetic incident where latency spikes after a release and write a structured RCA.

!!! question "Mid-senior checkpoint"
    How do you avoid "the model changed" becoming a catch-all explanation?

**Sources**

- Required: [Agent Tracing - OpenAI](https://developers.openai.com/api/docs/guides/agents-api/tracing) — Shows how to inspect agent runs as traces composed of model, tool, and orchestration spans.
- Official / deep: [Production Best Practices - OpenAI](https://developers.openai.com/api/docs/guides/production-best-practices) — Production checklist for reliability, latency, usage limits, and operational safeguards.

---

## System Design card — Uber: Kafka retry and DLQ architecture

**What to learn, in order:** Study a real production retry topology and how delayed failures are isolated from healthy traffic.

```mermaid
flowchart LR
    A["Main topic"]
    B["Failure"]
    C["Retry tiers"]
    D["DLQ"]
    E["Replay"]
    A --> B --> C --> D --> E
```

**Linear learning path**

1. Retry queue/topic
2. Backoff tiers
3. DLQ
4. Replay tooling

!!! example "DO THIS"
    Classify 5 consumer failures as retry, DLQ, or immediate discard and justify each.

!!! question "Mid-senior checkpoint"
    How do you stop a DLQ from becoming permanent forgotten data?

**Sources**

- Required: [Reliable Reprocessing and Dead Letter Queues with Kafka - Uber](https://www.uber.com/in/en/blog/reliable-reprocessing/) — Shows how retry topics and DLQs prevent poison messages from blocking real-time consumption.
- Official / deep: [Apache Kafka Design](https://kafka.apache.org/design/) — Official explanation of partitions, persistence, batching, consumer offsets, replication, and delivery guarantees.

---
*Source: `60_Days_AI_Engineering_System_Design_Roadmap_Anup_Dangi.pdf`, Day 57 cards. [Suggest a correction](https://github.com/AnupDangi/learnlikeadev/issues/new)*
