import math
from dataclasses import dataclass


@dataclass(frozen=True, slots=True)
class Document:
    id: str
    title: str
    module: str
    text: str


@dataclass(frozen=True, slots=True)
class Passage:
    document_id: str
    title: str
    module: str
    text: str
    score: float
    span_id: str = ""
    start_char: int = 0
    end_char: int = 0


@dataclass(frozen=True, slots=True)
class SourceSpan:
    document_id: str
    span_id: str
    start_char: int
    end_char: int
    text: str
    score: float


@dataclass(frozen=True, slots=True)
class Answer:
    status: str
    text: str
    citations: tuple[str, ...]
    request_id: str
    source_spans: tuple[SourceSpan, ...] = ()

    def validate(self, allowed_document_ids: set[str]) -> None:
        if self.status not in {"answered", "not_found", "unavailable"}:
            raise ValueError("Unknown answer status")
        if self.status == "answered" and not self.citations:
            raise ValueError("An answer must cite its evidence")
        if self.status == "answered" and not self.source_spans:
            raise ValueError("An answered result must include inspectable source spans")
        if not set(self.citations).issubset(allowed_document_ids):
            raise ValueError("An answer cites a source outside this request")
        if self.status != "answered" and (self.citations or self.source_spans):
            raise ValueError("A non-answer must not include citations or source spans")
        if self.source_spans:
            if any(span.document_id not in allowed_document_ids for span in self.source_spans):
                raise ValueError("An answer includes a source span outside this request")
            if any(
                span.start_char < 0 or span.end_char <= span.start_char or not span.span_id
                or span.end_char - span.start_char != len(span.text)
                or not math.isfinite(span.score)
                for span in self.source_spans
            ):
                raise ValueError("An answer includes an invalid source span")
            if {span.document_id for span in self.source_spans} != set(self.citations):
                raise ValueError("Every citation must map to a returned source span")


@dataclass(frozen=True, slots=True)
class ModelRequest:
    """Typed input used by the fixture adapter and any future reviewed live adapter."""

    request_id: str
    instructions: str
    question: str
    context: str
    allowed_document_ids: frozenset[str]
    requested_output_tokens: int
