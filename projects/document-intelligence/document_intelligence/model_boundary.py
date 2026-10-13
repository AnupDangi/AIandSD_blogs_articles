"""Offline model boundary exercise with toy budgeting and strict result parsing.

The estimate is deliberately not a provider tokenizer. A live adapter must count
tokens with its actual model/tokenizer before sending the request.
"""

import json
from dataclasses import dataclass
from typing import Protocol

from .models import ModelRequest


class ModelBoundaryError(ValueError):
    """A request or result fails the declared model boundary."""

    def __init__(self, code: str) -> None:
        self.code = code
        super().__init__(code)


@dataclass(frozen=True, slots=True)
class TokenBudget:
    max_input_tokens: int
    max_context_tokens: int
    max_output_tokens: int
    context_window_tokens: int


@dataclass(frozen=True, slots=True)
class PreparedModelRequest:
    request: ModelRequest
    estimated_input_tokens: int
    estimated_context_tokens: int
    reserved_output_tokens: int


@dataclass(frozen=True, slots=True)
class ModelAnswerCandidate:
    """Structured model output before local evidence spans are attached and verified."""

    status: str
    text: str
    citations: tuple[str, ...]
    request_id: str


class ModelAdapter(Protocol):
    """Small seam for an optional adapter that returns untrusted JSON text."""

    def complete(self, prepared: PreparedModelRequest) -> str: ...


class DeterministicFixtureAdapter:
    """Copy one authorized passage verbatim to exercise the request/parse seam.

    This is deliberately not a language model and does not paraphrase or infer.
    """

    name = "deterministic-fixture"

    def complete(self, prepared: PreparedModelRequest) -> str:
        try:
            passages = json.loads(prepared.request.context)
        except (json.JSONDecodeError, TypeError) as error:
            raise ModelBoundaryError("invalid_fixture_context") from error
        if not isinstance(passages, list):
            raise ModelBoundaryError("invalid_fixture_context")

        passage = next((item for item in passages if
                        isinstance(item, dict)
                        and type(item.get("document_id")) is str
                        and item["document_id"] in prepared.request.allowed_document_ids
                        and type(item.get("text")) is str
                        and item["text"].strip()), None)
        if passage is None:
            response = {
                "status": "not_found",
                "text": "",
                "citations": [],
                "request_id": prepared.request.request_id,
            }
        else:
            response = {
                "status": "answered",
                "text": passage["text"],
                "citations": [passage["document_id"]],
                "request_id": prepared.request.request_id,
            }
        return json.dumps(response)


def run_model_adapter(
    request: ModelRequest, budget: TokenBudget, adapter: ModelAdapter
) -> tuple[PreparedModelRequest, ModelAnswerCandidate]:
    """Budget before calling an adapter, then parse its response as untrusted data."""

    prepared = prepare_model_request(request, budget)
    raw_output = adapter.complete(prepared)
    return prepared, parse_structured_answer(raw_output, prepared)


def toy_token_estimate(value: str) -> int:
    """Return ceil(UTF-8 bytes / 4); teaching estimate, never a provider count."""

    return (len(value.encode("utf-8")) + 3) // 4


def prepare_model_request(request: ModelRequest, budget: TokenBudget) -> PreparedModelRequest:
    """Reject estimated limit breaches before any optional provider adapter runs."""

    limits = (
        budget.max_input_tokens,
        budget.max_context_tokens,
        budget.max_output_tokens,
        budget.context_window_tokens,
    )
    if any(type(limit) is not int or limit <= 0 for limit in limits):
        raise ModelBoundaryError("invalid_budget")
    if not request.request_id or not request.question.strip() or not request.instructions.strip():
        raise ModelBoundaryError("invalid_request")
    if type(request.requested_output_tokens) is not int or request.requested_output_tokens <= 0:
        raise ModelBoundaryError("invalid_output_reservation")

    context_tokens = toy_token_estimate(request.context)
    # Count named parts independently so their separating structure is included.
    input_tokens = sum(
        toy_token_estimate(part)
        for part in ("instructions:" + request.instructions, "question:" + request.question,
                     "context:" + request.context)
    )
    if context_tokens > budget.max_context_tokens:
        raise ModelBoundaryError("context_limit_exceeded")
    if input_tokens > budget.max_input_tokens:
        raise ModelBoundaryError("input_limit_exceeded")
    if request.requested_output_tokens > budget.max_output_tokens:
        raise ModelBoundaryError("output_limit_exceeded")
    if input_tokens + request.requested_output_tokens > budget.context_window_tokens:
        raise ModelBoundaryError("window_limit_exceeded")
    return PreparedModelRequest(request, input_tokens, context_tokens, request.requested_output_tokens)


def parse_structured_answer(raw: str, prepared: PreparedModelRequest) -> ModelAnswerCandidate:
    """Parse untrusted JSON into a scoped candidate, not a grounded application Answer."""

    try:
        value = json.loads(raw)
    except (json.JSONDecodeError, TypeError) as error:
        raise ModelBoundaryError("malformed_output") from error
    if not isinstance(value, dict) or set(value) != {"status", "text", "citations", "request_id"}:
        raise ModelBoundaryError("invalid_output_shape")
    if (
        type(value["status"]) is not str
        or type(value["text"]) is not str
        or type(value["request_id"]) is not str
        or type(value["citations"]) is not list
        or any(type(citation) is not str for citation in value["citations"])
    ):
        raise ModelBoundaryError("invalid_output_types")
    if value["request_id"] != prepared.request.request_id:
        raise ModelBoundaryError("request_mismatch")
    if len(value["citations"]) != len(set(value["citations"])):
        raise ModelBoundaryError("duplicate_citation")
    candidate = ModelAnswerCandidate(
        status=value["status"],
        text=value["text"],
        citations=tuple(value["citations"]),
        request_id=value["request_id"],
    )
    if candidate.status not in {"answered", "not_found", "unavailable"}:
        raise ModelBoundaryError("invalid_answer")
    if not set(candidate.citations).issubset(prepared.request.allowed_document_ids):
        raise ModelBoundaryError("invalid_answer")
    if candidate.status == "answered" and not candidate.citations:
        raise ModelBoundaryError("invalid_answer")
    if candidate.status == "answered" and not candidate.text.strip():
        raise ModelBoundaryError("empty_answer")
    if candidate.status != "answered" and candidate.citations:
        raise ModelBoundaryError("unexpected_citation")
    return candidate
