# Day 55 — Long-tail AI workload economics + Meta: Haystack object storage

!!! tip "Daily reps (~60–90 min)"
    Do both cards. Run each DO THIS lab, answer each checkpoint aloud before rereading.

## AI card — Long-tail AI workload economics

**What to learn, in order:** Optimize for the distribution of prompts, contexts, and task difficulty rather than an "average request" that rarely exists.

```mermaid
flowchart LR
    A["Request distribution"]
    B["Normal runs"]
    C["Expensive tail"]
    D["Policy/router"]
    E["Cost"]
    A --> B --> C --> D --> E
```

**Linear learning path**

1. Prompt/output length distribution
2. Rare expensive runs
3. Cost percentiles
4. Separate interactive vs batch workloads

!!! example "DO THIS"
    Compute p50/p95/p99 cost per run from a workload sample and identify the expensive tail.

!!! question "Mid-senior checkpoint"
    Which tail cases deserve product limits instead of more infrastructure?

**Sources**

- Required: [Common Pitfalls When Building Generative AI Applications - Chip Huyen](https://huyenchip.com/2025/01/16/ai-engineering-pitfalls.html) — Production lessons on premature complexity, evaluation, human review, and long-tail failures.
- Official / deep: [Cost Optimization - OpenAI](https://developers.openai.com/api/docs/guides/cost-optimization) — Explains reducing requests, tokens, model size, and using batch/flex processing for lower cost.

---

## System Design card — Meta: Haystack object storage

**What to learn, in order:** Learn why billions of tiny files can make metadata lookup the bottleneck and how storage layout follows access patterns.

```mermaid
flowchart LR
    A["Photo ID"]
    B["Index"]
    C["Large store file"]
    D["Offset read"]
    E["Object"]
    A --> B --> C --> D --> E
```

**Linear learning path**

1. Metadata overhead
2. Append large files
3. In-memory location index
4. Direct reads

!!! example "DO THIS"
    Compare 100k tiny files vs one append-only blob file plus offset index.

!!! question "Mid-senior checkpoint"
    When is the filesystem namespace more expensive than the actual payload?

**Sources**

- Required: [Needle in a Haystack - Meta](https://engineering.fb.com/2009/04/30/core-infra/needle-in-a-haystack-efficient-storage-of-billions-of-photos/) — Object-storage case study showing how metadata overhead can dominate when storing billions of small files.
- Official / deep: [Amazon S3 User Guide](https://docs.aws.amazon.com/AmazonS3/latest/userguide/Welcome.html) — Modern object-storage reference to compare against the specialized Haystack design.

---
*Source: `60_Days_AI_Engineering_System_Design_Roadmap_Anup_Dangi.pdf`, Day 55 cards. [Suggest a correction](https://github.com/AnupDangi/learnlikeadev/issues/new)*
