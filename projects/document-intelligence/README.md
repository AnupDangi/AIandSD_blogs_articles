# Document intelligence starter

Build a local-first application that answers questions from a small document set and returns evidence with every answer. The starter uses only the Python standard library and deterministic fixtures; no provider key, network access, database, or paid account is required.

Requires Python 3.12.

Start with a fresh environment. With an installed Python 3.12 interpreter:

```bash
python3.12 -m venv .venv
source .venv/bin/activate
```

If your Python is managed by `uv`, use `uv venv --offline --python 3.12 .venv` instead, then activate it. Offline creation requires that Python 3.12 is already installed. No packages need to be installed for this starter. On Windows activate `.venv\Scripts\Activate.ps1` in PowerShell.

```bash
python -m unittest discover -s tests -v
python -m document_intelligence "What happens when a source is replaced?"
```

Run commands from this directory. The default CLI returns a short extractive answer and citation IDs. `--fixture-model` runs the typed request through a deterministic adapter that copies one retrieved passage verbatim, applies the labeled toy budget, parses the response as untrusted JSON, and validates allowed citations/source spans. This adapter is **not a language model** and is not evidence that a generated paraphrase is supported. The seam is ready for a separately reviewed optional provider adapter; the required course path remains offline and needs no API key. Keep any future credentials outside the repository.

To reproduce milestone 1 evidence end to end, run:

```bash
python -m document_intelligence --fixture-model "How can the previous index roll back?"
python -m unittest discover -s tests -p 'test_course_project.py' -k 'fixture_model_cli' -v
python -m unittest discover -s tests -p 'test_course_project.py' -k 'model_boundary' -v
```

The CLI output reports the request/context estimate, reserved output, exact copied excerpt, and inspectable source offsets. `toy_token_estimate` calculates `ceil(UTF-8 byte length / 4)`. It is an invented teaching estimate, **not** a provider tokenizer or a guarantee that a live request fits its token window. A future provider adapter must apply the provider's actual tokenizer and limits before sending data. The parser validates shape, types, request ID, status, and allowed citation IDs; the application answer contract adds source spans, but neither check proves semantic support for a free-form claim.

## Milestone path

The recovery and evaluation failure drills run independently:

```bash
python -m document_intelligence.durability --demo
python -m document_intelligence.jobs --demo
python -m document_intelligence.trajectory
python -m unittest discover -s tests -p 'test_durability.py' -v
python -m unittest discover -s tests -p 'test_jobs.py' -v
python -m unittest discover -s tests -p 'test_trajectory.py' -v
```

The crash drill stops a real subprocess after the SQLite effect commits and before the separate checkpoint is written. An unsafe retry creates two modeled effects; a stable stage key bound to an input fingerprint reuses one. The revision drill forces two workers to retain revision 4, lets B commit revision 5, then rejects A's stale write and reads the retained record through a fresh connection. These are single-host fixture mechanisms; they do not implement a distributed queue or establish arbitrary remote exactly-once effects or power-loss durability. Their temporary demo workspaces are removed after the JSON reports are emitted.

The trajectory evaluator replays twenty authored action lists in a deterministic index environment. Its final environment-state grade is independent of final prose and claimed tool observations. Six fixtures pass both outcome and path checks (`6/20 = 0.3`); thirteen pass outcome and ten pass path. This is a one-run-per-task fixture-suite score, not a model-reliability estimate. Modify a copied fixture to explain unsafe success, safe failure, duplicate effects, and step-budget exhaustion.

1. **Model boundary:** typed request/result records, offline toy budget checks, and strict output validation.
2. **Retrieval:** source-span citations, inspectable lexical/vector/hybrid/reranked rankings, and a per-slice evaluation that includes a known paraphrase failure.
3. **Workflow:** resumable JSON checkpoints, a subprocess crash-window comparison, and modeled effect-service idempotency bound to request input.
4. **Evaluation:** a checked-in question set, citation coverage, per-module metrics, and twenty authored tool trajectories graded separately for outcome and path.
5. **Reliability:** deadlines, bounded retries, failure injection, and deterministic fallback.
6. **Trust boundaries:** untrusted-document labeling, allowed-source checks, and evidence validation.
7. **Efficiency:** a bounded TTL cache with observable hit/miss counts and a transactional job revision guard that rejects stale writers.
8. **Production review:** operational checklist and a short design defense.

The repository supplies a runnable foundation for the cumulative project, not a pre-solved capstone. Retrieval, citation validation, checkpoint replay, per-slice evaluation, bounded transient retries/fallback, trust scoping, and cache behavior have deterministic examples and tests. Run `python -m document_intelligence --trace "How can the previous index roll back?"` to inspect ranks, scores, and source offsets; run `python -m document_intelligence --evaluate` to inspect per-case evidence and the known paraphrase failure. Learners complete the remaining milestone evidence and design decisions using the [capstone rubric](ASSESSMENT.md); the starter includes no hosted model provider, production deployment, or automatic review. The project is a teaching baseline, not a production-ready retrieval or language-model implementation. Its fixed-size feature-hashed vectors are deterministic but non-semantic: hashing words does not encode meaning or recognize synonyms, and hash collisions are possible. The reranker is also a transparent query-term coverage and adjacency heuristic, not a learned model. Both exist to demonstrate retrieval stages with no paid dependencies.
