# Day 11 — Embeddings and semantic representation + Relational data modeling and constraints

!!! tip "Daily reps (~60–90 min)"
    Do both cards. Run each DO THIS lab, answer each checkpoint aloud before rereading.

## AI card — Embeddings and semantic representation

**What to learn, in order:** Understand what embeddings encode, what distance means, and where semantic similarity is useful or misleading.

```mermaid
flowchart LR
    A["Text"]
    B["Embedding model"]
    C["Vector"]
    D["Similarity"]
    E["Neighbors"]
    A --> B --> C --> D --> E
```

**Linear learning path**

1. Embedding vector intuition
2. Cosine/dot-product similarity
3. Semantic search and clustering
4. Domain/model mismatch

!!! example "DO THIS"
    Embed 50 sentences and inspect nearest neighbors for 5 queries.

!!! question "Mid-senior checkpoint"
    Why does semantic similarity not guarantee factual relevance?

**Sources**

- Required: [Vector Embeddings - OpenAI](https://developers.openai.com/api/docs/guides/embeddings) — Introduces embeddings, similarity, and common semantic-search use cases.
- Official / deep: [Sentence Transformers Documentation](https://www.sbert.net/) — Practical reference for bi-encoders, semantic similarity, retrieval, and embedding evaluation.

---

## System Design card — Relational data modeling and constraints

**What to learn, in order:** Model invariants in the database so correctness does not depend entirely on application code.

```mermaid
flowchart LR
    A["Entities"]
    B["Relations"]
    C["Keys"]
    D["Constraints"]
    E["Queries"]
    A --> B --> C --> D --> E
```

**Linear learning path**

1. Primary and foreign keys
2. Unique/check constraints
3. Normalization intuition
4. Transaction boundaries around invariants

!!! example "DO THIS"
    Design users, organizations, projects, and memberships with keys and constraints.

!!! question "Mid-senior checkpoint"
    Which invariant should be enforced by the database rather than a service check?

**Sources**

- Required: [PostgreSQL Constraints](https://www.postgresql.org/docs/current/ddl-constraints.html) — Official reference for primary keys, foreign keys, unique constraints, and enforcing relational invariants.
- Official / deep: [PostgreSQL Transactions Tutorial](https://www.postgresql.org/docs/current/tutorial-transactions.html) — Canonical introduction to BEGIN, COMMIT, ROLLBACK, atomic multi-step operations, and savepoints.

---
*Source: `60_Days_AI_Engineering_System_Design_Roadmap_Anup_Dangi.pdf`, Day 11 cards. [Suggest a correction](https://github.com/AnupDangi/learnlikeadev/issues/new)*
