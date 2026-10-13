import argparse
import json
from collections.abc import Sequence

from .evaluation import evaluate
from .model_workflow import answer_with_fixture_adapter
from .pipeline import DocumentIntelligence, load_documents


def main(argv: Sequence[str] | None = None) -> None:
    parser = argparse.ArgumentParser(description="Ask a question against deterministic local fixtures.")
    parser.add_argument("query", nargs="?", help="Question to ask the document set")
    parser.add_argument("--evaluate", action="store_true", help="Run the checked-in citation evaluation set")
    parser.add_argument("--trace", action="store_true", help="Compare inspectable retrieval rankings for the query")
    parser.add_argument(
        "--fixture-model",
        action="store_true",
        help="Run the typed request/parser flow with a deterministic passage-copying adapter",
    )
    args = parser.parse_args(argv)
    if args.evaluate:
        print(json.dumps(evaluate(), indent=2, sort_keys=True))
        return
    if not args.query:
        parser.error("provide a question or use --evaluate")
    app = DocumentIntelligence(load_documents())
    if args.fixture_model:
        print(json.dumps(answer_with_fixture_adapter(app, args.query), indent=2, sort_keys=True))
        return
    if args.trace:
        rankings = app.compare_rankings(args.query)
        print(json.dumps({
            strategy: [
                {"rank": rank, "span_id": passage.span_id, "source": passage.document_id,
                 "start_char": passage.start_char, "end_char": passage.end_char,
                 "score": round(passage.score, 5), "text": passage.text}
                for rank, passage in enumerate(passages, start=1)
            ]
            for strategy, passages in rankings.items()
        }, indent=2))
        return
    result = app.answer(args.query)
    print(json.dumps({
        "status": result.status,
        "answer": result.text,
        "citations": result.citations,
        "evidence": [
            {"source": span.document_id, "span_id": span.span_id, "start_char": span.start_char,
             "end_char": span.end_char, "score": round(span.score, 5), "text": span.text}
            for span in result.source_spans
        ],
        "request_id": result.request_id,
    }, indent=2))


if __name__ == "__main__":
    main()
