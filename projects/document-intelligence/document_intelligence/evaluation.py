import json
from pathlib import Path

from .pipeline import DocumentIntelligence, load_documents


def evaluate(path: Path | None = None) -> dict[str, object]:
    source = path or Path(__file__).resolve().parents[1] / "fixtures" / "evaluation.json"
    cases = json.loads(source.read_text(encoding="utf-8"))
    app = DocumentIntelligence(load_documents())
    by_module: dict[str, list[bool]] = {}
    case_results: list[dict[str, object]] = []
    known_failures: list[dict[str, str]] = []
    for case in cases:
        result = app.answer(case["query"])
        hit = case["expected_source"] in result.citations
        by_module.setdefault(case["module"], []).append(hit)
        ranked = [
            {"rank": rank, "span_id": span.span_id, "source": span.document_id,
             "start_char": span.start_char, "end_char": span.end_char, "score": round(span.score, 5)}
            for rank, span in enumerate(result.source_spans, start=1)
        ]
        case_result = {
            "case_id": case["id"],
            "module": case["module"],
            "status": result.status,
            "expected_source": case["expected_source"],
            "hit_at_k": hit,
            "ranked_spans": ranked,
        }
        case_results.append(case_result)
        if case.get("known_failure") and not hit:
            known_failures.append({
                "case_id": case["id"], "module": case["module"],
                "expected_source": case["expected_source"],
                "reason": case.get("failure_reason", "Known fixture failure"),
            })
    slices = {module: sum(results) / len(results) for module, results in sorted(by_module.items())}
    all_results = [value for values in by_module.values() for value in values]
    return {
        "cases": len(all_results),
        "citation_coverage": sum(all_results) / len(all_results) if all_results else 0.0,
        "slices": slices,
        "case_results": case_results,
        "known_failures": known_failures,
    }
