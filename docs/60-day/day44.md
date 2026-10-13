# Day 44 — Provider failover and graceful degradation + Circuit breakers and bulkheads

!!! tip "Daily reps (~60–90 min)"
    Do both cards. Run each DO THIS lab, answer each checkpoint aloud before rereading.

## AI card — Provider failover and graceful degradation

**What to learn, in order:** Define what the product does when the preferred model/provider is slow, unavailable, or over budget.

```mermaid
flowchart LR
    A["Preferred path"]
    B["Failure/timeout"]
    C["Fallback"]
    D["Degraded result"]
    E["User"]
    A --> B --> C --> D --> E
```

**Linear learning path**

1. Deadline-aware execution
2. Fallback model/provider
3. Reduced feature mode
4. Never violate the same safety/eval contract

!!! example "DO THIS"
    Create a degradation ladder: full agent -> reduced tools -> smaller model -> partial result.

!!! question "Mid-senior checkpoint"
    When is returning a partial verified result better than switching to a weaker model?

**Sources**

- Required: [Production Best Practices - OpenAI](https://developers.openai.com/api/docs/guides/production-best-practices) — Production checklist for reliability, latency, usage limits, and operational safeguards.
- Official / deep: [Latency Optimization - OpenAI](https://developers.openai.com/api/docs/guides/latency-optimization) — Explains how model choice, token count, request count, parallelism, and UI design affect end-to-end latency.

---

## System Design card — Circuit breakers and bulkheads

**What to learn, in order:** Stop repeated calls to a failing dependency and isolate resources so one dependency cannot consume the whole fleet.

```mermaid
flowchart LR
    A["Caller"]
    B["Circuit breaker"]
    C["Dependency"]
    D["Open state"]
    E["Probe"]
    A --> B --> C --> D --> E
```

**Linear learning path**

1. Closed/open/half-open
2. Failure threshold
3. Probe recovery
4. Pool/resource isolation

!!! example "DO THIS"
    Wrap one unstable HTTP dependency with a circuit breaker and separate concurrency pool.

!!! question "Mid-senior checkpoint"
    How can a circuit breaker make recovery slower if thresholds are poorly chosen?

**Sources**

- Required: [Circuit Breaker Pattern - Microsoft](https://learn.microsoft.com/en-us/azure/architecture/patterns/circuit-breaker) — Explains closed/open/half-open states and how clients stop hammering failing dependencies.
- Official / deep: [Addressing Cascading Failures - Google SRE](https://sre.google/sre-book/addressing-cascading-failures/) — Explains overload, retry storms, load shedding, capacity planning, and preventing failure propagation.

---
*Source: `60_Days_AI_Engineering_System_Design_Roadmap_Anup_Dangi.pdf`, Day 44 cards. [Suggest a correction](https://github.com/AnupDangi/learnlikeadev/issues/new)*
