# Applied AI course appendices

This appendix preserves the project briefs, formulas, glossary, release checklist, and course-wide recall questions that were interleaved into the source PDF’s final production-architecture chapter. Chapter 40 now focuses on the architecture lesson.

## Project briefs

These are alternative portfolio projects from the source material. They are project ideas, not additional required chapters or promised course deliverables. For each project, build one subsystem at a time and establish a measurable baseline before expanding it.

### 1. Document Intelligence and RAG Engine

**Objective:** Build a source-aware technical-document assistant that answers with inspectable evidence.

**Suggested stack:** Python/FastAPI, PostgreSQL with pgvector, BM25/Elasticsearch or Tantivy, object storage, and OpenTelemetry.

**Milestones:** ingest PDFs and HTML with page/source metadata; measure lexical and vector retrieval baselines; add hybrid retrieval and reranking; return claim-level citations; build retrieval and answer eval suites; add permissions, reindexing, and stale-source handling.

**Failure exercises:** duplicate a source, mismatch a citation, trigger runaway retrieval, time out the provider, and provide conflicting evidence. Record the user-visible effect, trace evidence, recovery path, and design change.

### 2. Autonomous Coding Agent

**Objective:** Build a repository agent that can inspect code, edit files, run tests, and make bounded progress across sessions.

**Suggested stack:** Python or TypeScript runtime, Git, container sandbox, test runner, SQLite/Postgres run state, and OpenTelemetry.

**Milestones:** expose narrow file/search/test tools; add task ledger and checkpoints; require tests before completion; add a bounded repair loop; sandbox filesystem and network; convert failed tasks into regressions.

**Failure exercises:** terminate between checkpoint and status update, provide malicious repository instructions, exhaust the repair budget, and fail the test runner. Preserve the minimum bar: no silent data loss, unbounded retry loop, unapproved side effect, or untraceable failure.

### 3. Deep Research Agent

**Objective:** Discover sources, assign parallel investigations, and produce an evidence-bearing synthesis that can resume after interruption.

**Suggested stack:** search connectors, queue/job runtime, structured citations, vector store, and trace/eval pipeline.

**Milestones:** establish a single-agent baseline; score source quality and deduplicate; add parallel workers with distinct scopes; persist and resume job state; verify citations/evidence; enforce cost and latency budgets and canary releases.

**Failure exercises:** duplicate a source, introduce citation mismatch, trigger runaway search, time out a provider, and make workers disagree. Record the user-visible effect, telemetry, recovery, and whether the design needs to change.

### 4. AI Customer Support Platform

**Objective:** Route simple questions, use account tools safely, and escalate uncertain or consequential cases to people.

**Suggested stack:** API service, retrieval, account tools, Postgres, event queue, tracing, and human-review dashboard.

**Milestones:** FAQ/RAG baseline; typed intent and routing; read-only account tools; approval for sensitive side effects; human handoff with evidence; SLOs, degradation, and per-tenant cost controls.

**Failure exercises:** wrong-account access, duplicate refund, stale policy, tool outage, and unsafe automatic action. Every side effect needs idempotency or approval; every failure should be visible in a trace or operational event.

### 5. AI SRE / Incident Response Agent

**Objective:** Correlate metrics, logs, traces, and deployment events to produce evidence-backed incident hypotheses.

**Suggested stack:** OpenTelemetry, Prometheus-compatible metrics, log store, deployment metadata, runbooks, and sandboxed tools.

**Milestones:** read-only telemetry tools; incident timeline builder; hypothesis/evidence schema; runbook retrieval; human-approved reversible remediation; post-incident evals from reviewed traces.

**Failure exercises:** missing telemetry, misleading correlation, stale runbook, tool outage, and a proposed unsafe remediation. Begin read-only; require human approval for actions that change production state.

## Shared project evidence and release exercise

Collect an architecture and data-flow diagram, baseline load/eval results, a successful and failed trace, and a short decision record for each major technology choice. Review source of truth, derived data, capacity bottlenecks, unsafe retries, tenant boundaries, degraded behavior, and migration strategy. Deliver a README with trade-offs, one-page runbook, eval/load results, failure-injection report, and recorded architecture walkthrough.

For a release exercise, run offline regressions, route 5% of synthetic traffic to a candidate, and write an automatic rollback threshold before inspecting results. Consider stretch constraints such as multi-region operation, multi-tenancy, provider/database outage, a cost ceiling, or replacement of a core dependency.

## Formula and concept recall

| Concept | Expression or meaning |
|---|---|
| Next-token prediction | `P(x_t \mid x_<t)`: probability of the next token conditioned on preceding tokens. |
| Softmax | `p_i = exp(z_i) / sum_j exp(z_j)`: converts logits into probabilities. |
| Scaled attention | `softmax(QK^T / sqrt(d_k))V`: weights values by query-key compatibility. |
| Cosine similarity | `(a · b) / (||a|| ||b||)`: angle-based vector similarity. |
| Recall@k | Relevant items retrieved in the top *k* divided by all relevant items. |
| Precision | `TP / (TP + FP)`: fraction of predicted positives that are correct. |
| Recall | `TP / (TP + FN)`: fraction of actual positives found. |
| Little’s Law | `L = λW`: average work in a system equals arrival rate times average time. |
| Error budget | The allowed fraction of bad events under an SLO. |
| Burn rate | Observed error rate divided by the allowed error rate. |
| Risk heuristic | `P(failure) × blast radius`: a rough aid for comparing action risk. |
| Cost per success | Total run cost divided by the number of successful tasks. |

## Compact glossary

- **Agent:** A model-driven runtime that can select actions or tools based on observations.
- **ANN:** Approximate nearest-neighbor search.
- **Chunk:** A retrieval unit derived from a larger source.
- **Context:** Information visible to one model invocation.
- **Eval:** A repeatable test of application behavior.
- **HNSW:** A graph-based approximate-nearest-neighbor index.
- **Idempotency:** Repeating an operation has one effective business outcome.
- **KV cache:** Stored attention keys/values reused during token decoding.
- **RAG:** Retrieval-augmented generation.
- **Reranker:** A model that rescores a candidate retrieval set for relevance.
- **Run state:** Durable machine state required to resume a workflow.
- **SLI/SLO:** Measured service indicator and its reliability target.
- **Span:** One timed operation inside a distributed trace.
- **Tool:** A typed capability exposed to an agent.
- **Trajectory:** A sequence of actions and observations in an agent run.

## Production release checklist

- [ ] User journey and success criteria are defined.
- [ ] Human fallback/escalation exists where needed.
- [ ] Verification surface matches the risk of the output.
- [ ] Core and regression evals pass; critical slices meet thresholds.
- [ ] Any LLM judge is calibrated against human labels.
- [ ] Run state is durable; deadlines and budgets are enforced.
- [ ] Retries are bounded and classified; side effects have idempotency or approval.
- [ ] Least-privilege identity and sandbox/network policy have been tested.
- [ ] Prompt-injection surfaces are identified; high-risk actions require approval.
- [ ] Trace IDs correlate model, tool, and retrieval work; SLOs and alerts are defined.
- [ ] Degraded modes and canary/rollback path have been exercised.
- [ ] Cost/run and cost/success are measured; model routing is justified by evals.
- [ ] Context and tool-result waste have been reviewed.

## Master recall questions

1. When should I not use an LLM?
2. Where does truth live?
3. What context should the model see right now?
4. How do I know retrieval found the required evidence?
5. What prevents one bad agent run from causing broad damage?
6. After a timeout, how do I know whether a side effect occurred?
7. How will this run resume after a process crash?
8. What metric could reveal a regression hidden by the average?
9. How does the system degrade under overload rather than collapse?
10. What evidence lets a human verify the output quickly?

## Source references carried from the course material

Use provider and framework documentation for current behavior; the implementation details and product APIs can change.

- [Chip Huyen: Building LLM applications for production](https://huyenchip.com/2023/04/11/llm-engineering.html)
- [Chip Huyen: AI engineering pitfalls](https://huyenchip.com/2025/01/16/ai-engineering-pitfalls.html)
- [Hugging Face LLM Course](https://huggingface.co/learn/llm-course/chapter1/8)
- [Chip Huyen: Generation configurations](https://huyenchip.com/2024/01/16/sampling.html)
- [Attention Is All You Need](https://arxiv.org/abs/1706.03762)
- [The Annotated Transformer](https://nlp.seas.harvard.edu/annotated-transformer/)
- [vLLM](https://github.com/vllm-project/vllm)
- [PagedAttention paper](https://arxiv.org/abs/2309.06180)
- [OpenAI Structured Outputs](https://developers.openai.com/api/docs/guides/structured-outputs)
- [Pydantic documentation](https://docs.pydantic.dev/latest/)
- [Lilian Weng: Prompt Engineering](https://lilianweng.github.io/posts/2023-03-15-prompt-engineering/)
- [Anthropic prompt engineering](https://docs.anthropic.com/en/docs/build-with-claude/prompt-engineering/overview)
- [Predictive Human Preference](https://huyenchip.com/2024/02/28/predictive-human-preference.html)
- [OpenAI model guidance](https://developers.openai.com/api/docs/guides/latest-model)
- [OpenAI embeddings guide](https://developers.openai.com/api/docs/guides/embeddings)
- [Sentence Transformers](https://www.sbert.net/)
- [FAISS wiki](https://github.com/facebookresearch/faiss/wiki/)
- [FAISS index selection](https://github.com/facebookresearch/faiss/wiki/Guidelines-to-choose-an-index)
- [pgvector](https://github.com/pgvector/pgvector)
- [Anthropic: Contextual Retrieval](https://www.anthropic.com/engineering/contextual-retrieval)
- [LangChain text splitters](https://python.langchain.com/docs/concepts/text_splitters/)
- [Elasticsearch BM25 similarity](https://www.elastic.co/guide/en/elasticsearch/reference/current/index-modules-similarity.html)
- [Sentence Transformers cross-encoder applications](https://www.sbert.net/examples/cross_encoder/applications/README.html)
- [Eugene Yan: LLM patterns](https://eugeneyan.com/writing/llm-patterns/)
- [BEIR benchmark paper](https://arxiv.org/abs/2104.08663)
- [Stanford: Evaluation of ranked retrieval results](https://nlp.stanford.edu/IR-book/html/htmledition/evaluation-of-ranked-retrieval-results-1.html)
- [Anthropic: Building effective agents](https://www.anthropic.com/engineering/building-effective-agents)
- [OpenAI Agents SDK guide](https://developers.openai.com/api/docs/guides/agents/sdk)
- [Anthropic: Writing effective tools for agents](https://www.anthropic.com/engineering/writing-tools-for-agents)
- [ReAct paper](https://arxiv.org/abs/2210.03629)
- [Anthropic: Effective context engineering for AI agents](https://www.anthropic.com/engineering/effective-context-engineering-for-ai-agents)
- [Anthropic: Code execution with MCP](https://www.anthropic.com/engineering/code-execution-with-mcp)
- [Anthropic: Effective harnesses for long-running agents](https://www.anthropic.com/engineering/effective-harnesses-for-long-running-agents)
- [Anthropic: Multi-agent research system](https://www.anthropic.com/engineering/multi-agent-research-system)
- [Anthropic: Building a C compiler](https://www.anthropic.com/engineering/building-c-compiler)
- [Hamel Husain: Evals in production](https://hamel.dev/notes/llm/ai-product-engineering/evals-production.html)
- [Anthropic: Demystifying evals for AI agents](https://www.anthropic.com/engineering/demystifying-evals-for-ai-agents)
- [OpenAI agent evals guide](https://developers.openai.com/api/docs/guides/agent-evals)
- [OpenTelemetry](https://opentelemetry.io/docs/)
- [OpenAI tracing guide](https://developers.openai.com/api/docs/guides/agents-api/tracing)
- [OpenAI API pricing](https://openai.com/api/pricing/)
- [OpenAI latency optimization](https://developers.openai.com/api/docs/guides/latency-optimization)
- [Google SRE Workbook: Alerting on SLOs](https://sre.google/workbook/alerting-on-slos/)
- [AWS Builders’ Library: Timeouts, retries, and backoff with jitter](https://aws.amazon.com/builders-library/timeouts-retries-and-backoff-with-jitter/)
- [Martin Fowler: Feature toggles](https://martinfowler.com/articles/feature-toggles.html)
- [Anthropic: How we contain Claude across products](https://www.anthropic.com/engineering/how-we-contain-claude)
- [OWASP LLM01: Prompt Injection](https://genai.owasp.org/llmrisk/llm01-prompt-injection/)
- [OpenAI guardrails and approvals](https://developers.openai.com/api/docs/guides/agents/guardrails-approvals)
- [Hamel Husain: AI Product Engineering notes](https://hamel.dev/notes/llm/ai-product-engineering/)
- [OpenAI prompt caching guide](https://developers.openai.com/api/docs/guides/prompt-caching)
- [OpenAI rate limits](https://developers.openai.com/api/docs/guides/rate-limits)
- [OpenAI background mode](https://developers.openai.com/api/docs/guides/background)
- [OpenAI production best practices](https://developers.openai.com/api/docs/guides/production-best-practices)

---
*Source: `Practical_AI_Engineering_Anup_Dangi.pdf`. References were carried forward from the source material; verify availability and current guidance before relying on time-sensitive implementation details.*
