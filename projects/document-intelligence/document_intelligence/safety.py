from .models import Answer, Document, Passage, SourceSpan


def authorized_documents(documents: list[Document], allowed_ids: set[str]) -> list[Document]:
    return [document for document in documents if document.id in allowed_ids]


def extractive_answer(request_id: str, passages: list[Passage], allowed_ids: set[str]) -> Answer:
    citations = tuple(dict.fromkeys(passage.document_id for passage in passages if passage.document_id in allowed_ids))
    if not citations:
        return Answer("not_found", "No matching evidence was found in the allowed documents.", (), request_id)
    text = " ".join(passage.text for passage in passages if passage.document_id in citations)
    source_spans = tuple(
        SourceSpan(passage.document_id, passage.span_id, passage.start_char, passage.end_char, passage.text, passage.score)
        for passage in passages
        if passage.document_id in citations and passage.span_id
    )
    answer = Answer("answered", text, citations, request_id, source_spans)
    answer.validate(allowed_ids)
    return answer
