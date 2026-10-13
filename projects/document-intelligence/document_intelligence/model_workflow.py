"""Runnable deterministic model-boundary workflow for milestone 1."""

import json
from uuid import uuid4

from .model_boundary import DeterministicFixtureAdapter, TokenBudget, run_model_adapter
from .models import Answer, ModelRequest, SourceSpan
from .pipeline import DocumentIntelligence

FIXTURE_BUDGET = TokenBudget(
    max_input_tokens=4_096,
    max_context_tokens=3_072,
    max_output_tokens=512,
    context_window_tokens=4_608,
)


def answer_with_fixture_adapter(app: DocumentIntelligence, question: str) -> dict[str, object]:
    """Run retrieval, toy budget checks, an injected adapter, and source validation."""

    passages = app.retrieve(question)
    request_id = str(uuid4())
    allowed_document_ids = frozenset(passage.document_id for passage in passages)
    context = json.dumps([
        {
            "document_id": passage.document_id,
            "span_id": passage.span_id,
            "start_char": passage.start_char,
            "end_char": passage.end_char,
            "score": passage.score,
            "text": passage.text,
        }
        for passage in passages
    ])
    request = ModelRequest(
        request_id=request_id,
        instructions=(
            "Return the first authorized passage verbatim as JSON. This is a fixture exercise, "
            "not a live model call. Do not cite a document outside the supplied allowlist."
        ),
        question=question,
        context=context,
        allowed_document_ids=allowed_document_ids,
        requested_output_tokens=256,
    )
    prepared, candidate = run_model_adapter(
        request, FIXTURE_BUDGET, DeterministicFixtureAdapter()
    )

    evidence: list[SourceSpan] = []
    for citation in candidate.citations:
        passage = next(
            (item for item in passages if item.document_id == citation), None
        )
        if passage is None:
            raise ValueError("An adapter citation has no retrieved source span")
        evidence.append(SourceSpan(
            document_id=passage.document_id,
            span_id=passage.span_id,
            start_char=passage.start_char,
            end_char=passage.end_char,
            text=passage.text,
            score=passage.score,
        ))

    answer = Answer(
        status=candidate.status,
        text=candidate.text,
        citations=candidate.citations,
        request_id=candidate.request_id,
        source_spans=tuple(evidence),
    )
    answer.validate(set(allowed_document_ids))
    return {
        "adapter": DeterministicFixtureAdapter.name,
        "limitations": (
            "This is not a language model: it copies an authorized passage verbatim. "
            "The token count is a labeled toy estimate, and structural citation validation "
            "does not prove that a generated claim is semantically supported."
        ),
        "status": answer.status,
        "answer": answer.text,
        "citations": list(answer.citations),
        "evidence": [
            {
                "source": span.document_id,
                "span_id": span.span_id,
                "start_char": span.start_char,
                "end_char": span.end_char,
                "score": round(span.score, 5),
                "text": span.text,
            }
            for span in answer.source_spans
        ],
        "request_id": answer.request_id,
        "budget": {
            "estimated_input_tokens": prepared.estimated_input_tokens,
            "estimated_context_tokens": prepared.estimated_context_tokens,
            "reserved_output_tokens": prepared.reserved_output_tokens,
            "tokenizer": "ceil(UTF-8 bytes / 4), toy estimate only",
        },
    }
