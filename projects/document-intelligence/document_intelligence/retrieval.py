import hashlib
import math
import re
from dataclasses import replace

from .models import Document, Passage

_WORD = re.compile(r"[a-z0-9]+")
_STOP_WORDS = {"a", "an", "and", "are", "at", "be", "by", "can", "do", "does", "for", "from", "how", "in", "is", "it", "of", "on", "or", "should", "that", "the", "this", "to", "when", "what", "why", "with", "who"}
_VECTOR_DIMENSIONS = 512


def tokens(text: str) -> set[str]:
    return set(_WORD.findall(text.lower())) - _STOP_WORDS


def chunk_document(document: Document, sentences_per_chunk: int = 2) -> list[Passage]:
    if sentences_per_chunk < 1:
        raise ValueError("sentences_per_chunk must be positive")
    sentences: list[tuple[str, int, int]] = []
    cursor = 0
    for part in re.split(r"(?<=[.!?])\s+", document.text):
        sentence = part.strip()
        if not sentence:
            continue
        start = document.text.find(sentence, cursor)
        end = start + len(sentence)
        sentences.append((sentence, start, end))
        cursor = end
    passages: list[Passage] = []
    for index in range(0, len(sentences), sentences_per_chunk):
        group = sentences[index:index + sentences_per_chunk]
        start, end = group[0][1], group[-1][2]
        passages.append(Passage(
            document.id, document.title, document.module, document.text[start:end], 0.0,
            span_id=f"{document.id}:{start}-{end}", start_char=start, end_char=end,
        ))
    return passages


def search(query: str, documents: list[Document], top_k: int = 3) -> list[Passage]:
    if top_k < 1:
        raise ValueError("top_k must be positive")
    query_terms = tokens(query)
    if not query_terms:
        return []
    ranked: list[Passage] = []
    for document in documents:
        for passage in chunk_document(document):
            passage_terms = tokens(passage.text)
            overlap = len(query_terms & passage_terms)
            if overlap:
                # Deliberately simple, deterministic lexical score; this is not an embedding.
                score = overlap / len(query_terms)
                ranked.append(replace(passage, score=score))
    return sorted(ranked, key=lambda item: (-item.score, item.document_id, item.text))[:top_k]


def _feature_vector(text: str) -> list[float]:
    """Return a deterministic, non-semantic feature-hashed token vector.

    This toy vectorizer hashes token counts into a fixed-size vector. It has no
    learned geometry and cannot recognize synonyms; collisions are possible.
    It is useful for teaching vector ranking mechanics without model downloads
    or paid dependencies, not as a substitute for embeddings.
    """
    vector = [0.0] * _VECTOR_DIMENSIONS
    for token in _WORD.findall(text.lower()):
        if token in _STOP_WORDS:
            continue
        digest = hashlib.blake2b(token.encode("utf-8"), digest_size=8).digest()
        index = int.from_bytes(digest, "big") % _VECTOR_DIMENSIONS
        vector[index] += 1.0
    return vector


def _cosine_similarity(left: list[float], right: list[float]) -> float:
    dot = sum(a * b for a, b in zip(left, right))
    left_norm = math.sqrt(sum(value * value for value in left))
    right_norm = math.sqrt(sum(value * value for value in right))
    if not left_norm or not right_norm:
        return 0.0
    return dot / (left_norm * right_norm)


def vector_search(query: str, documents: list[Document], top_k: int = 3) -> list[Passage]:
    """Rank chunks with local feature-hashed vectors (not semantic embeddings)."""
    if top_k < 1:
        raise ValueError("top_k must be positive")
    query_vector = _feature_vector(query)
    if not any(query_vector):
        return []
    ranked = [
        replace(passage, score=_cosine_similarity(query_vector, _feature_vector(passage.text)))
        for document in documents
        for passage in chunk_document(document)
        if tokens(query) & tokens(passage.text)
    ]
    ranked = [passage for passage in ranked if passage.score > 0.0]
    return sorted(ranked, key=lambda item: (-item.score, item.document_id, item.text))[:top_k]


def reciprocal_rank_fusion(
    rankings: list[list[Passage]], top_k: int = 3, rank_constant: int = 60
) -> list[Passage]:
    """Fuse ranked lists by reciprocal rank while retaining original citations."""
    if top_k < 1:
        raise ValueError("top_k must be positive")
    if rank_constant < 0:
        raise ValueError("rank_constant cannot be negative")
    scores: dict[tuple[str, str], float] = {}
    examples: dict[tuple[str, str], Passage] = {}
    for ranking in rankings:
        seen: set[tuple[str, str]] = set()
        for rank, passage in enumerate(ranking, start=1):
            key = (passage.document_id, passage.text)
            if key in seen:
                continue
            seen.add(key)
            examples.setdefault(key, passage)
            scores[key] = scores.get(key, 0.0) + 1.0 / (rank_constant + rank)
    fused = [replace(examples[key], score=score) for key, score in scores.items()]
    return sorted(fused, key=lambda item: (-item.score, item.document_id, item.text))[:top_k]


def hybrid_search(
    query: str,
    documents: list[Document],
    top_k: int = 3,
    candidate_k: int | None = None,
    rank_constant: int = 60,
) -> list[Passage]:
    """Combine lexical and toy-vector candidates with reciprocal-rank fusion."""
    if top_k < 1:
        raise ValueError("top_k must be positive")
    candidate_count = candidate_k if candidate_k is not None else max(top_k * 3, top_k)
    if candidate_count < 1:
        raise ValueError("candidate_k must be positive")
    return reciprocal_rank_fusion(
        [
            search(query, documents, candidate_count),
            vector_search(query, documents, candidate_count),
        ],
        top_k=top_k,
        rank_constant=rank_constant,
    )


def rerank(query: str, passages: list[Passage], top_k: int | None = None) -> list[Passage]:
    """Apply a deterministic phrase/order heuristic to a hybrid candidate set.

    This is an inspectable teaching stand-in, not a learned cross-encoder. It
    rewards query-term coverage and adjacent query terms that occur together.
    """
    if top_k is not None and top_k < 1:
        raise ValueError("top_k must be positive")
    query_sequence = _WORD.findall(query.lower())
    query_terms = set(query_sequence) - _STOP_WORDS
    if not query_terms:
        return []
    query_pairs = [
        (left, right)
        for left, right in zip(query_sequence, query_sequence[1:])
        if left not in _STOP_WORDS and right not in _STOP_WORDS
    ]
    rescored: list[Passage] = []
    for passage in passages:
        passage_sequence = _WORD.findall(passage.text.lower())
        passage_terms = set(passage_sequence)
        coverage = len(query_terms & passage_terms) / len(query_terms)
        passage_pairs = set(zip(passage_sequence, passage_sequence[1:]))
        order_match = (
            sum(pair in passage_pairs for pair in query_pairs) / len(query_pairs)
            if query_pairs
            else 0.0
        )
        score = 0.65 * coverage + 0.35 * order_match
        rescored.append(replace(passage, score=score))
    ranked = sorted(rescored, key=lambda item: (-item.score, item.document_id, item.text))
    return ranked[:top_k] if top_k is not None else ranked
