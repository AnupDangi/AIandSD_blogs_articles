# Chapter 02 — Tokens, Decoding, and Generation

*What happens after you send a prompt*

*Source chapter: `Practical_AI_Engineering_Anup_Dangi.pdf`, Chapter 02.*

## Learning outcomes

- Explain the token-to-logit-to-token generation loop.
- Distinguish toy tokens, lexical terms, and model token IDs; inspect sampled toy outputs.
- Choose decoding settings appropriate to a task’s reliability needs.

## Before you begin

Chapter 1; basic Python and probability vocabulary.

## Why this matters

Latency, cost, truncation, and output variability make more sense when generation is understood as repeated next-token prediction rather than a single response operation.

## Visual model

> **Source figure description retained:** Autoregressive loop: tokenize prompt → forward pass/logits → probability distribution → select token → append and repeat until stop condition.

**Authored instructional mechanism map — one toy decoding step.** The values come from this chapter's worked example, not a measured model trace.

| Step | Inspectable state | What happens next |
|---|---|---|
| 1. Encode current text | Model-specific token IDs in a real implementation | Pass the current sequence to the model; the visual uses a toy text split |
| 2. Score candidates | `carefully: 2.4`, `quickly: 1.8`, `today: 0.7`, `.: -0.2` | Apply temperature, then softmax |
| 3. Normalize at temperature 1 | Approximately `0.554`, `0.304`, `0.101`, `0.041` | Apply the selected decoding rule |
| 4. Apply top-p 0.80 | First two candidates total about `0.858` | Retain those two and renormalize to approximately `0.646` and `0.354` |
| 5. Select and append | One retained candidate becomes the next token | Continue with the longer sequence unless a stop token or output limit ends generation |

**Read the loop:** current sequence → logits → temperature/softmax → top-p filter → selected token → longer sequence → next step. The next step requires new logits; repeatedly sampling these fixed logits is only a toy exercise. Top-p is applied after the probabilities are calculated.

## Try the simulation

Open lesson `ai-02`; its visual engine starts on **Tokens & sampling**. Inspect the toy tokenizer output, then predict which candidate has the highest probability. Change temperature and top-p separately, observe the probabilities and retained nucleus, and sample a next token. These fixed logits and the whitespace-only split of the example prompt are an inspectable toy model, not a production tokenizer or language model.

## Concepts to retain

### Tokenization

Text is converted into model-specific token IDs.

### Next-token distribution

At each step the model scores possible next tokens.

### Decoding policy

Temperature, top-p, and stopping rules shape how a token is selected.

## How it works

1. Tokenize the prompt.
2. Run a forward pass to produce logits.
3. Convert logits to a probability distribution.
4. Select or sample the next token.
5. Append it and repeat until a stop condition.

## Worked example

The lab begins with logits `[2.4, 1.8, 0.7, -0.2]` for the candidates `carefully`, `quickly`, `today`, and `.`. At temperature `1.0`, softmax gives approximately `[0.554, 0.304, 0.101, 0.041]`. Lower temperature sharpens this distribution; higher temperature flattens it. Top-p then retains the smallest high-probability set reaching the selected cumulative mass and renormalizes it. These values illustrate the calculation; real outputs depend on model logits and decoding configuration.

## Implementation sketch (pseudocode)

```python
logits = [2.0, 1.0, 0.0]
probabilities = softmax(logits)  # approximately [0.665, 0.245, 0.090]
```

This is an illustrative pseudocode sketch, not a runnable command from the course starter. Placeholder APIs or model operations are conceptual; the required project path below uses only deterministic local fixtures and the Python standard library.

## What to measure

- Token count for prompt and completion.
- Output length and latency across repeated samples.
- Task success and schema-valid rate for each decoding configuration.

## Failure modes to reason about

- Assuming characters equal tokens.
- Generating verbose outputs when latency matters.
- Using high randomness for tasks that require exact schemas.
- Ignoring model-specific context limits.

## Practice lab

**Goal:** Produce a small artifact that demonstrates the chapter’s core idea using local fixtures or toy values. No paid provider is required.

- Use the token simulator’s displayed logits; calculate softmax with Python `math.exp` and compare the default probabilities.
- With a seeded `random.Random`, sample from the displayed toy distribution 20 times and record counts; label this as a toy sampling experiment, not model output.
- Run the project lexical-term count for `ops-02` and explain why it differs from model token IDs.
- No provider or downloaded tokenizer is required.

## Course project — milestone 1: Model boundary

**Task:** Inspect `retrieval.tokens` on fixture `ops-02`. Record that this is a lowercase lexical-term heuristic with stop-word removal, not a model tokenizer or an LLM token count. Then inspect `model_boundary.toy_token_estimate`, which uses `ceil(UTF-8 bytes / 4)` solely for a reproducible budget exercise. Predict whether a request one unit over its input, context, output, or total window limit will reach a future provider adapter.

**Run these commands from `projects/document-intelligence/` (Python 3.12):**

```bash
python -c 'from document_intelligence.pipeline import load_documents; from document_intelligence.retrieval import tokens; d=next(d for d in load_documents() if d.id=="ops-02"); print("chars:", len(d.text), "lexical_terms:", len(tokens(d.text)))'
python -m unittest discover -s tests -p "test_course_project.py" -k "fixture_data_has_stable_identifiers" -v
python -m unittest discover -s tests -p "test_course_project.py" -k "model_boundary" -v
```

**Expected observation:** The fixture prints `chars: 220 lexical_terms: 26`; the stable-ID and three model-boundary tests pass. The boundary rejects each limit breach before an optional adapter would run. The character, lexical-term, and toy-budget counts describe different measures; none predicts a provider tokenizer's output.

**Acceptance check:** Your note distinguishes character length, the starter's lexical terms, the toy budget estimate, and actual model token IDs. State that a live adapter must recalculate with its provider tokenizer and that the starter performs no generation.

This check uses the checked-in deterministic fixtures; it does not require an API key or claim model-generated quality.

### Recall without notes

- Explain why generation is iterative.
- Predict how temperature changes a distribution.
- Name a risk of treating token count as character count.

### Completion check

Explain the trade-off in your own words, show the lab artifact, and identify one failure case your experiment exposed.

## Further reading

- [Hugging Face LLM Course — Tokenizers](https://huggingface.co/learn/llm-course/chapter6/1)
- [Chip Huyen — Generation configurations](https://huyenchip.com/2024/01/16/sampling.html)

---
*Original source: `Practical_AI_Engineering_Anup_Dangi.pdf`. References above are retained from its chapter source list; verify version-sensitive documentation before implementation. [Suggest a correction](https://github.com/AnupDangi/learnlikeadev/issues/new)*
