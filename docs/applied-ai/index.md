# Roadmap 3 — Practical Applied AI Engineering (40 chapters)

Source: `Practical_AI_Engineering_Anup_Dangi.pdf` · 209 pages · Parts I–V + Project Track + Appendices.

Study rule per chapter: *Why? How? What fails? What trade-off? What would I build to test it?*

!!! info "How to use this track"
    Each future lesson: Why → Figure → 3 concepts → How-it-works + worked example + ENGINEERING LENS → Implementation sketch → What to measure → 4 failure modes + FAILURE-FIRST Q → design review → lab → recall.

## Part I — Foundations (01–07)

| Ch | Topic | Lab |
|----|-------|-----|
| 01 | AI engineering stack (model = 20% of product) | Minimal /answer + latency/cost accounting |
| 02 | Tokens, decoding, generation | Tokenizer counts; temperature sweep |
| 03 | Transformer attention for engineers | NumPy QKᵀ/√dₖ toy |
| 04 | Inference: KV cache + continuous batching | Static vs continuous sim; KV memory math |
| 05 | Structured outputs / typed interfaces | Pydantic 100-output parse-rate |
| 06 | Prompt engineering as software engineering | 40-example eval; slice regressions |
| 07 | Model selection, routing, cascades | 2-model router + escalation |

## Part II — Retrieval / RAG (08–13)

08 embeddings + cosine · 09 exact/HNSW/IVF (recall@k) · 10 chunking/contextual retrieval · 11 hybrid BM25 + rank fusion · 12 rerank + context assembly · 13 production RAG (ingestion/query planes, permissions, freshness, citations).

## Part III — Agents / Durable Execution (14–21)

14 retrieval eval (recall@k/MRR/NDCG) · 15 agent fundamentals (workflow vs agent loop) · 16 tool/ACI design · 17 ReAct/planning/decomposition · 18 context engineering (budgets, compaction) · 19 memory/state/artifacts · 20 multi-agent (orchestrator-worker) · 21 durable long-running (checkpoints, ledgers, handoff).

## Part IV — Evals / Observability (22–26)

22 eval datasets + failure taxonomy · 23 LLM-judge calibration (confusion matrix) · 24 trajectory eval (right answer, wrong reason) · 25 observability/tracing · 26 cost per successful task.

## Part V — Production Reliability / Security / Release (27–40)

27 latency (TTFT/TPOT) · 28 SLOs/budgets · 29 retries/fallbacks/degrade · 30 canary + AI regression gates · 31 security/sandbox/containment · 32 human approval/risk-tiered autonomy · 33 verification/provenance/evidence-bearing · 34 improvement/repair loops · 35 prompt caching · 36 model/provider failures · 37 prompt injection/untrusted context · 38 background jobs/resumable · 39 checklists/readiness · 40 complete production agent architecture.

## Project Track (5)

1. Document intelligence + RAG engine (cited answers) · 2. Autonomous coding agent · 3. Deep-research agent · 4. Customer-support platform (route/tools/escalate) · 5. SRE/incident-response agent.

Appendices: A equations · B release checklist · C source index (~40 links) · D glossary + 9 master recall Qs.
