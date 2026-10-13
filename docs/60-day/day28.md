# Day 28 — Single-agent vs multi-agent systems + Kafka topics, partitions, and offsets

!!! tip "Daily reps (~60–90 min)"
    Do both cards. Run each DO THIS lab, answer each checkpoint aloud before rereading.

## AI card — Single-agent vs multi-agent systems

**What to learn, in order:** Parallel agents help when work can truly be decomposed; otherwise they add coordination cost and inconsistency.

```mermaid
flowchart LR
    A["Orchestrator"]
    B["Agent A"]
    C["Agent B"]
    D["Agent C"]
    E["Synthesis"]
    A --> B --> C --> D --> E
```

**Linear learning path**

1. Parallel independent subtasks
2. Specialized context
3. Coordinator/synthesizer
4. Shared-state hazards

!!! example "DO THIS"
    Run one research task with one agent and with 3 parallel subagents; compare cost, latency, and answer quality.

!!! question "Mid-senior checkpoint"
    Which dependencies make parallel agents unsafe or wasteful?

**Sources**

- Required: [How We Built Our Multi-Agent Research System - Anthropic](https://www.anthropic.com/engineering/multi-agent-research-system) — Production lessons on parallel agents, orchestration, coordination, evaluation, and reliability.
- Official / deep: [Building Effective Agents - Anthropic](https://www.anthropic.com/engineering/building-effective-agents) — Defines workflows versus agents and argues for simple composable patterns before complex frameworks.

---

## System Design card — Kafka topics, partitions, and offsets

**What to learn, in order:** Understand Kafka as a replicated ordered log, not a magical message bus.

```mermaid
flowchart LR
    A["Producer"]
    B["Topic"]
    C["Partitions"]
    D["Offsets"]
    E["Consumers"]
    A --> B --> C --> D --> E
```

**Linear learning path**

1. Partition is the ordering unit
2. Offsets identify positions
3. Producer partitioning
4. Replication and durability

!!! example "DO THIS"
    Produce keyed events to a 3-partition topic and observe ordering and offsets.

!!! question "Mid-senior checkpoint"
    Why can Kafka preserve per-user ordering but not global ordering at high scale?

**Sources**

- Required: [Apache Kafka Design](https://kafka.apache.org/design/) — Official explanation of partitions, persistence, batching, consumer offsets, replication, and delivery guarantees.
- Official / deep: [Apache Kafka Documentation](https://kafka.apache.org/documentation/) — Operational reference for consumer groups, producers, brokers, configuration, and ecosystem behavior.

---
*Source: `60_Days_AI_Engineering_System_Design_Roadmap_Anup_Dangi.pdf`, Day 28 cards. [Suggest a correction](https://github.com/AnupDangi/learnlikeadev/issues/new)*
