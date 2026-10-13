# Day 31 — Designing an AI eval dataset + Retry topology and dead-letter queues

!!! tip "Daily reps (~60–90 min)"
    Do both cards. Run each DO THIS lab, answer each checkpoint aloud before rereading.

## AI card — Designing an AI eval dataset

**What to learn, in order:** An eval set is a product specification expressed as examples and measurements.

```mermaid
flowchart LR
    A["Production tasks"]
    B["Curate dataset"]
    C["Run candidate"]
    D["Score slices"]
    E["Release"]
    A --> B --> C --> D --> E
```

**Linear learning path**

1. Core/common cases
2. Historical failures
3. Edge/adversarial cases
4. Slice results instead of one average

!!! example "DO THIS"
    Create 50 eval cases for one feature and tag each by failure category and importance.

!!! question "Mid-senior checkpoint"
    What important user behavior is absent from your test set?

**Sources**

- Required: [Demystifying Evals for AI Agents - Anthropic](https://www.anthropic.com/engineering/demystifying-evals-for-ai-agents) — Explains why multi-turn tool-using agents require richer evals than single-response models.
- Official / deep: [AI Product Engineering Notes - Hamel Husain](https://hamel.dev/notes/llm/ai-product-engineering/) — Practical guidance on error analysis, eval design, human review, and building AI products around real failures.

---

## System Design card — Retry topology and dead-letter queues

**What to learn, in order:** Prevent poison messages from blocking healthy real-time traffic.

```mermaid
flowchart LR
    A["Main topic"]
    B["Consumer failure"]
    C["Retry topic"]
    D["DLQ"]
    E["Replay"]
    A --> B --> C --> D --> E
```

**Linear learning path**

1. Transient vs permanent errors
2. Delayed retry topics
3. Max attempt policy
4. DLQ triage/replay

!!! example "DO THIS"
    Create main, retry, and DLQ topics and force one poison message through the full path.

!!! question "Mid-senior checkpoint"
    What information must a DLQ record preserve for safe reprocessing?

**Sources**

- Required: [Reliable Reprocessing and Dead Letter Queues with Kafka - Uber](https://www.uber.com/in/en/blog/reliable-reprocessing/) — Shows how retry topics and DLQs prevent poison messages from blocking real-time consumption.
- Official / deep: [Apache Kafka Design](https://kafka.apache.org/design/) — Official explanation of partitions, persistence, batching, consumer offsets, replication, and delivery guarantees.

---
*Source: `60_Days_AI_Engineering_System_Design_Roadmap_Anup_Dangi.pdf`, Day 31 cards. [Suggest a correction](https://github.com/AnupDangi/learnlikeadev/issues/new)*
