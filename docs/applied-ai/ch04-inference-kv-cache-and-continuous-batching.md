# Chapter 04 — Inference, KV Cache, and Continuous Batching

*Why serving many users is a scheduling problem*

*Source chapter: `Practical_AI_Engineering_Anup_Dangi.pdf`, Chapter 04.*

## Learning outcomes

- Distinguish prompt prefill from autoregressive decoding.
- Estimate KV-cache memory from model dimensions.
- Compare scheduling choices using throughput and tail latency.

## Before you begin

Chapters 2–3; basic tensor dimensions and bytes-per-value arithmetic.

## Why this matters

A model that is fast for one request can perform poorly under concurrency. Production serving is constrained by memory, KV-cache allocation, batching, and scheduler behavior as well as compute.

## Visual model

The lesson illustration sequences prompt prefill, concurrent decode steps, completion, and a new request joining the active batch. Its shared cache rail is schematic; use the inference-scheduler simulation to inspect its separate toy estimates, not a real serving trace.

## Try the simulation

Open lesson `ai-04`; its active visual engine is `inference-scheduler`. Before moving a control, predict how increasing concurrency changes the toy queue-delay and relative-throughput outputs. Then change tokens per sequence and active sequences to compare the dimension-based KV-cache estimate. The initial 8,192-token example uses the chapter's 32-layer, 8-KV-head, 128-wide, FP16 assumptions and estimates 1 GiB for one sequence. Batch size, concurrency, and prefix-reuse effects on scheduler outputs remain simplified estimates; this visual does not simulate completed-token counts or a production serving trace.

## Concepts to retain

### Prefill

Process the prompt and populate attention cache.

### Decode

Generate tokens iteratively.

### KV cache

Store prior key/value tensors so earlier tokens need not be recomputed.

### Continuous batching

Insert and remove requests during decoding instead of waiting for a fixed batch.

## How it works

1. Estimate model-weight memory: parameters × bytes per value (for example, 7B parameters at 2 bytes per half-precision value ≈ 14 GB).
2. Budget remaining accelerator memory for KV cache.
3. Admit sequences according to token footprint.
4. Batch decode steps across active requests.
5. Remove finished requests and admit new ones.

## Worked example

For an illustrative 32-layer model with 8 KV heads, head dimension 128, and FP16 cache, the simplified estimate is `2 × 32 × 8 × 128 × 2 bytes = 131,072 bytes` (128 KiB) per token. An 8k-token sequence is about 1 GiB of KV state under these assumptions; architecture details and allocation overhead can change the actual figure.

## Implementation sketch (pseudocode)

```python
kv_bytes_per_token = 2 * layers * kv_heads * head_dim * bytes_per_value
sequence_bytes = kv_bytes_per_token * sequence_tokens
```

This is an illustrative pseudocode sketch, not a runnable command from the course starter. Placeholder APIs or model operations are conceptual; the required project path below uses only deterministic local fixtures and the Python standard library.

## What to measure

- Active tokens and sequences over time.
- Throughput alongside p95 latency.
- Memory headroom and admission/rejection counts.

## Failure modes to reason about

- Sizing concurrency only by request count, not token footprint.
- Allowing one long sequence to consume cache headroom.
- Static batching that idles as short requests finish.
- Optimizing throughput while violating interactive latency targets.

## Practice lab

**Goal:** Produce a small artifact that demonstrates the chapter’s core idea using local fixtures or toy values. No paid provider is required.

- Use the `inference-scheduler` simulation to vary batch size and concurrency, then toggle shared-prefix reuse.
- Change tokens per sequence and active sequence count to reproduce the KV-cache estimate. Record the toy queue-delay and relative-throughput outputs separately; they are not measured performance.
- Explain that these are toy scheduler estimates; the project CLI does not run an inference server or measure GPU memory.
- Do not install a serving engine or claim the fixture project reproduces production scheduling.

## Course project — milestone 1: Model boundary

**Task:** Inspect `DocumentIntelligence.top_k` in `pipeline.py` and run the fixture query. Treat `top_k` as a retrieval-result limit; this starter has no GPU, KV cache, inference scheduler, queue, or serving benchmark.

**Run these commands from `projects/document-intelligence/` (Python 3.12):**

```bash
python -m unittest discover -s tests -p "test_course_project.py" -k "fixture_question_returns_only_cited_allowed_evidence" -v
python -m document_intelligence "How can the previous index roll back?"
```

**Expected observation:** The test passes and the CLI cites `ops-02`. No scheduler latency or GPU-memory metric is produced.

**Acceptance check:** Your milestone note distinguishes retrieval `top_k` from inference concurrency and identifies the scheduler simulation as a separate toy model.

This check uses the checked-in deterministic fixtures; it does not require an API key or claim model-generated quality.

### Recall without notes

- Differentiate prefill and decode.
- Reproduce the simplified KV bytes-per-token formula.
- Explain why request count alone is a weak capacity measure.

### Completion check

Explain the trade-off in your own words, show the lab artifact, and identify one failure case your experiment exposed.

## Further reading

- [vLLM project](https://github.com/vllm-project/vllm)
- [PagedAttention paper](https://arxiv.org/abs/2309.06180)

---
*Original source: `Practical_AI_Engineering_Anup_Dangi.pdf`. References above are retained from its chapter source list; verify version-sensitive documentation before implementation. [Suggest a correction](https://github.com/AnupDangi/learnlikeadev/issues/new)*
