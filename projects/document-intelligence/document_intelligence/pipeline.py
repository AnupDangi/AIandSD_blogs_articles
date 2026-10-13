import json
from pathlib import Path
from uuid import uuid4

from .models import Answer, Document, Passage
from .retrieval import hybrid_search, rerank, search, vector_search
from .safety import authorized_documents, extractive_answer
from .resilience import bounded_retry


UNAVAILABLE_MESSAGE = "The document service is temporarily unavailable. Please try again."


def load_documents(path: Path | None = None) -> list[Document]:
    source = path or Path(__file__).resolve().parents[1] / "fixtures" / "documents.json"
    records = json.loads(source.read_text(encoding="utf-8"))
    return [Document(**record) for record in records]


class DocumentIntelligence:
    def __init__(self, documents: list[Document], top_k: int = 3):
        self.documents = documents
        self.top_k = top_k

    def compare_rankings(self, query: str, allowed_document_ids: set[str] | None = None) -> dict[str, list[Passage]]:
        allowed = allowed_document_ids if allowed_document_ids is not None else {item.id for item in self.documents}
        scoped = authorized_documents(self.documents, allowed)
        lexical = search(query, scoped, top_k=self.top_k)
        vector = vector_search(query, scoped, top_k=self.top_k)
        hybrid = hybrid_search(query, scoped, top_k=self.top_k, candidate_k=max(self.top_k * 3, self.top_k))
        return {
            "lexical": lexical,
            "toy_vector": vector,
            "hybrid": hybrid,
            "reranked": rerank(query, hybrid, top_k=self.top_k),
        }

    def retrieve(self, query: str, allowed_document_ids: set[str] | None = None) -> list[Passage]:
        return self.compare_rankings(query, allowed_document_ids)["reranked"]

    def answer(self, query: str, allowed_document_ids: set[str] | None = None) -> Answer:
        request_id = str(uuid4())
        allowed = allowed_document_ids if allowed_document_ids is not None else {item.id for item in self.documents}
        scoped = authorized_documents(self.documents, allowed)

        def retrieve_and_answer() -> Answer:
            passages = self.retrieve(query, allowed)
            return extractive_answer(request_id, passages, allowed)

        try:
            return bounded_retry(retrieve_and_answer)
        except (TimeoutError, ConnectionError):
            # A failed retrieval is operationally different from a successful search with no match.
            return Answer("unavailable", UNAVAILABLE_MESSAGE, (), request_id)
