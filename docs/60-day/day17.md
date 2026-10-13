# Day 17 — Sparse retrieval and BM25 + Cache stampede and hot keys

!!! tip "Daily reps (~60–90 min)"
    Do both cards. Run each DO THIS lab, answer each checkpoint aloud before rereading.

## AI card — Sparse retrieval and BM25

**What to learn, in order:** Understand why exact terms, identifiers, names, and rare tokens often require lexical retrieval alongside embeddings.

```mermaid
flowchart LR
    A["Query terms"]
    B["Inverted index"]
    C["BM25 score"]
    D["Ranked docs"]
    E["Retriever"]
    A --> B --> C --> D --> E
```

**Linear learning path**

1. Term frequency
2. Inverse document frequency intuition
3. BM25 scoring
4. Failure cases for dense-only search

!!! example "DO THIS"
    Index technical docs and test queries containing error codes, product IDs, and exact names.

!!! question "Mid-senior checkpoint"
    Which query classes should bypass or heavily weight lexical search?

**Sources**

- Required: [BM25 Similarity - Elasticsearch](https://www.elastic.co/guide/en/elasticsearch/reference/current/index-modules-similarity.html) — Official implementation reference for lexical ranking and BM25-style scoring.
- Official / deep: [Patterns for Building LLM-based Systems - Eugene Yan](https://eugeneyan.com/writing/llm-patterns/) — Connects retrieval, routing, generation, validation, caching, and evaluation into reusable system patterns.

---

## System Design card — Cache stampede and hot keys

**What to learn, in order:** Learn why a cache can protect a database during normal operation and overload it during coordinated misses.

```mermaid
flowchart LR
    A["Many clients"]
    B["Hot key"]
    C["Cache miss"]
    D["DB spike"]
    E["Mitigation"]
    A --> B --> C --> D --> E
```

**Linear learning path**

1. Thundering herd
2. Request coalescing
3. TTL jitter
4. Hot-key replication/local caches

!!! example "DO THIS"
    Expire one popular cached key while generating high concurrency and measure DB fan-in.

!!! question "Mid-senior checkpoint"
    How do you keep one popular key from becoming one machine's capacity limit?

**Sources**

- Required: [Redis Key Eviction](https://redis.io/docs/latest/develop/reference/eviction/) — Explains memory limits and eviction policies such as LRU and LFU.
- Official / deep: [Redis Documentation](https://redis.io/docs/latest/) — Reference for in-memory data structures, caching, persistence, replication, clustering, and operational behavior.

---
*Source: `60_Days_AI_Engineering_System_Design_Roadmap_Anup_Dangi.pdf`, Day 17 cards. [Suggest a correction](https://github.com/AnupDangi/learnlikeadev/issues/new)*
