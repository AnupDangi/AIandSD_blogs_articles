import json
import tempfile
import unittest
from contextlib import redirect_stdout
from io import StringIO
from unittest.mock import patch
from pathlib import Path

from document_intelligence.cache import TTLCache
from document_intelligence.evaluation import evaluate
from document_intelligence.model_boundary import (
    ModelBoundaryError,
    TokenBudget,
    parse_structured_answer,
    prepare_model_request,
    toy_token_estimate,
)
from document_intelligence.models import Answer, Document, ModelRequest, Passage, SourceSpan
from document_intelligence.pipeline import DocumentIntelligence, load_documents
from document_intelligence.resilience import bounded_retry
from document_intelligence.retrieval import hybrid_search, rerank, search, vector_search
from document_intelligence.workflow import CheckpointStore
from document_intelligence.__main__ import main


class CourseProjectTests(unittest.TestCase):
    def test_fixture_model_cli_runs_the_typed_request_and_answer_parser(self) -> None:
        output = StringIO()
        with redirect_stdout(output):
            main(["--fixture-model", "How can the previous index roll back?"])

        result = json.loads(output.getvalue())
        self.assertEqual(result["adapter"], "deterministic-fixture")
        self.assertIn("not a language model", result["limitations"])
        self.assertEqual(result["status"], "answered")
        self.assertTrue(result["citations"])
        self.assertEqual(result["answer"], result["evidence"][0]["text"])
        self.assertGreater(result["budget"]["estimated_input_tokens"], 0)

    def test_model_boundary_calculates_labeled_toy_budget_before_adapter(self) -> None:
        request = ModelRequest("fixture-1", "Cite evidence.", "What changed?", "ops-02 evidence",
                               frozenset({"ops-02"}), 12)
        budget = TokenBudget(max_input_tokens=30, max_context_tokens=10,
                             max_output_tokens=20, context_window_tokens=40)
        prepared = prepare_model_request(request, budget)
        self.assertEqual(toy_token_estimate("ééé"), 2)  # Six UTF-8 bytes, not three words.
        self.assertEqual(prepared.estimated_input_tokens, 19)
        self.assertEqual(prepared.estimated_context_tokens, 4)
        self.assertEqual(prepared.reserved_output_tokens, 12)
        self.assertLessEqual(prepared.estimated_input_tokens + prepared.reserved_output_tokens,
                             budget.context_window_tokens)

    def test_model_boundary_rejects_each_budget_limit_before_adapter(self) -> None:
        request = ModelRequest("fixture-1", "Cite evidence.", "What changed?", "ops-02 evidence",
                               frozenset({"ops-02"}), 12)
        baseline = TokenBudget(30, 10, 20, 40)
        prepared = prepare_model_request(request, baseline)
        scenarios = (
            (TokenBudget(30, 3, 20, 40), request, "context_limit_exceeded"),
            (TokenBudget(prepared.estimated_input_tokens - 1, 10, 20, 40), request,
             "input_limit_exceeded"),
            (TokenBudget(30, 10, 11, 40), request, "output_limit_exceeded"),
            (TokenBudget(30, 10, 20, prepared.estimated_input_tokens + 11), request,
             "window_limit_exceeded"),
        )
        for policy, candidate, code in scenarios:
            with self.subTest(code=code), self.assertRaises(ModelBoundaryError) as failure:
                prepare_model_request(candidate, policy)
            self.assertEqual(failure.exception.code, code)

    def test_model_boundary_accepts_typed_answer_and_rejects_malformed_output(self) -> None:
        request = ModelRequest("fixture-1", "Cite evidence.", "What changed?", "ops-02 evidence",
                               frozenset({"ops-02"}), 12)
        prepared = prepare_model_request(request, TokenBudget(30, 10, 20, 40))
        valid = {"status": "answered", "text": "The index was restored.",
                 "citations": ["ops-02"], "request_id": "fixture-1"}
        answer = parse_structured_answer(json.dumps(valid), prepared)
        self.assertEqual(answer.citations, ("ops-02",))
        self.assertNotIsInstance(answer, Answer)
        with self.assertRaisesRegex(ValueError, "inspectable source spans"):
            Answer(answer.status, answer.text, answer.citations, answer.request_id).validate({"ops-02"})
        invalid_results = (
            ("not JSON", "malformed_output"),
            (json.dumps({**valid, "citations": ["private-doc"]}), "invalid_answer"),
            (json.dumps({**valid, "citations": "ops-02"}), "invalid_output_types"),
            (json.dumps({**valid, "request_id": "another-request"}), "request_mismatch"),
            (json.dumps({**valid, "extra": "untrusted"}), "invalid_output_shape"),
        )
        for raw, code in invalid_results:
            with self.subTest(code=code), self.assertRaises(ModelBoundaryError) as failure:
                parse_structured_answer(raw, prepared)
            self.assertEqual(failure.exception.code, code)

    def test_fixture_question_returns_only_cited_allowed_evidence(self) -> None:
        app = DocumentIntelligence(load_documents())
        answer = app.answer("Can a retrieved document change tool permissions?", {"ops-03"})
        self.assertEqual(answer.status, "answered")
        self.assertEqual(answer.citations, ("ops-03",))
        source = next(document for document in app.documents if document.id == "ops-03")
        self.assertTrue(answer.source_spans)
        for span in answer.source_spans:
            self.assertEqual(span.document_id, "ops-03")
            self.assertEqual(source.text[span.start_char:span.end_char], span.text)
            self.assertTrue(span.span_id.startswith("ops-03:"))
        answer.validate({"ops-03"})

    def test_no_match_does_not_make_up_a_citation(self) -> None:
        answer = DocumentIntelligence(load_documents()).answer("Who won the moon marathon?")
        self.assertEqual(answer.status, "not_found")
        self.assertEqual(answer.citations, ())

    def test_answer_contract_rejects_a_forged_source(self) -> None:
        forged_span = SourceSpan("private-doc", "private-doc:0-5", 0, 5, "claim", 1.0)
        with self.assertRaisesRegex(ValueError, "outside this request"):
            Answer("answered", "claim", ("private-doc",), "request-1", (forged_span,)).validate({"public-doc"})

    def test_answer_contract_rejects_a_source_span_with_inconsistent_offsets(self) -> None:
        malformed_span = SourceSpan("ops-03", "ops-03:0-8", 0, 8, "short", 1.0)
        with self.assertRaisesRegex(ValueError, "invalid source span"):
            Answer("answered", "claim", ("ops-03",), "request-1", (malformed_span,)).validate({"ops-03"})

    def test_checkpoint_replays_completed_stage_without_repeating_effect(self) -> None:
        with tempfile.TemporaryDirectory() as directory:
            store = CheckpointStore(Path(directory) / "state.json")
            self.assertEqual(store.complete("write-1", {"saved": True}), {"saved": True})
            self.assertEqual(store.complete("write-1", {"saved": False}), {"saved": True})
            self.assertEqual(store.read()["completed"]["write-1"], {"saved": True})

    def test_evaluation_reports_coverage_by_module(self) -> None:
        result = evaluate()
        self.assertEqual(result["cases"], 6)
        self.assertAlmostEqual(result["citation_coverage"], 5 / 6)
        self.assertEqual(set(result["slices"]), {"reliability", "retrieval", "safety", "workflow", "evaluation"})
        self.assertEqual(result["slices"]["retrieval"], 0.5)
        self.assertEqual(result["known_failures"], [{
            "case_id": "retrieval-paraphrase-known-failure", "module": "retrieval", "expected_source": "ops-02",
            "reason": "The non-semantic feature-hashed retriever cannot bridge this paraphrase without lexical overlap.",
        }])
        failed_case = next(case for case in result["case_results"] if case["case_id"] == "retrieval-paraphrase-known-failure")
        self.assertEqual(failed_case["hit_at_k"], False)
        self.assertEqual(failed_case["ranked_spans"], [])

    def test_retrieval_comparison_exposes_scores_and_source_spans(self) -> None:
        app = DocumentIntelligence(load_documents())
        rankings = app.compare_rankings("How can the previous index roll back?")
        self.assertEqual(set(rankings), {"lexical", "toy_vector", "hybrid", "reranked"})
        for ranking in rankings.values():
            self.assertTrue(ranking)
            self.assertTrue(all(item.span_id and item.end_char > item.start_char for item in ranking))
            self.assertTrue(all(isinstance(item.score, float) for item in ranking))

    def test_cache_bounds_size_and_counts_hits_and_misses(self) -> None:
        cache: TTLCache[str] = TTLCache(capacity=1, ttl_seconds=10)
        cache.put("first", "one")
        self.assertEqual(cache.get("first"), "one")
        cache.put("second", "two")
        self.assertIsNone(cache.get("first"))
        self.assertEqual(cache.get("second"), "two")
        self.assertEqual((cache.hits, cache.misses), (2, 1))

    def test_retry_is_bounded_and_succeeds_after_one_transient_failure(self) -> None:
        calls = 0

        def operation() -> str:
            nonlocal calls
            calls += 1
            if calls == 1:
                raise TimeoutError("injected timeout")
            return "recovered"

        self.assertEqual(bounded_retry(operation), "recovered")
        self.assertEqual(calls, 2)

    def test_retry_does_not_retry_programming_errors(self) -> None:
        calls = 0

        def operation() -> str:
            nonlocal calls
            calls += 1
            raise ValueError("bug in retrieval")

        with self.assertRaisesRegex(ValueError, "bug in retrieval"):
            bounded_retry(operation)
        self.assertEqual(calls, 1)

    def test_transient_retrieval_failure_retries_then_returns_unavailable_without_citations(self) -> None:
        app = DocumentIntelligence(load_documents())
        calls = 0

        def unavailable(*args: object, **kwargs: object) -> list[Passage]:
            nonlocal calls
            calls += 1
            raise ConnectionError("internal endpoint details")

        with patch("document_intelligence.pipeline.hybrid_search", side_effect=unavailable):
            answer = app.answer("Can a retrieved document change tool permissions?", {"ops-03"})

        self.assertEqual(calls, 2)
        self.assertEqual(answer.status, "unavailable")
        self.assertEqual(answer.citations, ())
        self.assertNotIn("internal endpoint details", answer.text)
        self.assertIn("temporarily unavailable", answer.text)
        answer.validate({"ops-03"})

    def test_transient_retrieval_failure_recovers_with_original_cited_answer(self) -> None:
        app = DocumentIntelligence(load_documents())
        real_search = hybrid_search
        calls = 0

        def fails_once(*args: object, **kwargs: object) -> list[Passage]:
            nonlocal calls
            calls += 1
            if calls == 1:
                raise TimeoutError("injected timeout")
            return real_search(*args, **kwargs)

        with patch("document_intelligence.pipeline.hybrid_search", side_effect=fails_once):
            answer = app.answer("Can a retrieved document change tool permissions?", {"ops-03"})

        self.assertEqual(calls, 2)
        self.assertEqual(answer.status, "answered")
        self.assertEqual(answer.citations, ("ops-03",))
        answer.validate({"ops-03"})

    def test_non_transient_retrieval_error_is_not_hidden_as_unavailable_or_no_match(self) -> None:
        app = DocumentIntelligence(load_documents())
        with patch("document_intelligence.pipeline.hybrid_search", side_effect=ValueError("bad query")):
            with self.assertRaisesRegex(ValueError, "bad query"):
                app.answer("query")

    def test_fixture_data_has_stable_identifiers(self) -> None:
        documents = load_documents()
        self.assertEqual(len({document.id for document in documents}), len(documents))
        self.assertEqual(json.loads((Path(__file__).parents[1] / "fixtures" / "documents.json").read_text()), [
            {"id": document.id, "title": document.title, "module": document.module, "text": document.text}
            for document in documents
        ])

    def test_feature_hashed_vector_ranking_can_differ_from_lexical_ranking(self) -> None:
        documents = [
            Document("a", "Repeated terms", "retrieval", "retrieval retrieval retrieval vector search."),
            Document("b", "Balanced terms", "retrieval", "retrieval vector search."),
        ]
        query = "retrieval vector search"

        lexical = search(query, documents, top_k=2)
        toy_vector = vector_search(query, documents, top_k=2)

        self.assertEqual([item.document_id for item in lexical], ["a", "b"])
        self.assertEqual([item.document_id for item in toy_vector], ["b", "a"])
        self.assertTrue(all(item.score > 0 for item in toy_vector))

    def test_hybrid_fusion_and_reranking_preserve_passage_citations(self) -> None:
        documents = [
            Document("retrieval-1", "Scattered terms", "retrieval", "Index mapping uses citations after index validation."),
            Document("retrieval-2", "Ordered terms", "retrieval", "Validate index mapping and citation mapping before release."),
            Document("other", "No match", "other", "A cache stores provider responses."),
        ]
        query = "index mapping citation"

        candidates = hybrid_search(query, documents, top_k=3, candidate_k=6)
        ranked = rerank(query, candidates, top_k=2)

        self.assertEqual({item.document_id for item in candidates}, {"retrieval-1", "retrieval-2"})
        self.assertEqual(ranked[0].document_id, "retrieval-2")
        self.assertEqual({item.document_id for item in ranked}, {"retrieval-1", "retrieval-2"})
        self.assertTrue(all(item.title and item.module and item.text for item in ranked))

    def test_reranker_changes_order_using_query_term_adjacency(self) -> None:
        passages = [
            Passage("a", "Scattered", "retrieval", "Search combines citation data and index metadata.", 1.0),
            Passage("b", "Adjacent", "retrieval", "Search combines index citation metadata.", 0.9),
        ]

        ranked = rerank("index citation metadata", passages)

        self.assertEqual([item.document_id for item in ranked], ["b", "a"])


if __name__ == "__main__":
    unittest.main()
