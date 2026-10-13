import type { EvaluationConsoleScenario } from "@/content/visual-scenario-types";

export function scoreEvaluationSlices(
  scenario: Extract<EvaluationConsoleScenario, { kind: "slice-threshold" }>,
  threshold: number,
) {
  const slices = scenario.slices.map((slice) => ({ ...slice, passes: slice.score >= threshold }));
  return { slices, passing: slices.filter(({ passes }) => passes).length, total: slices.length };
}

export function calibrateJudge(
  scenario: Extract<EvaluationConsoleScenario, { kind: "judge-calibration" }>,
  threshold: number,
) {
  const cases = scenario.cases.map((example) => ({ ...example, predicted: example.confidence >= threshold ? "pass" as const : "fail" as const }));
  const counts = { truePass: 0, trueFail: 0, falsePass: 0, falseFail: 0 };
  for (const item of cases) {
    if (item.humanLabel === "pass" && item.predicted === "pass") counts.truePass += 1;
    else if (item.humanLabel === "fail" && item.predicted === "fail") counts.trueFail += 1;
    else if (item.predicted === "pass") counts.falsePass += 1;
    else counts.falseFail += 1;
  }
  const agreements = counts.truePass + counts.trueFail;
  return { cases, counts, agreements, total: cases.length, agreement: cases.length ? agreements / cases.length : 0 };
}

export function evaluateTrajectory(run: Extract<EvaluationConsoleScenario, { kind: "trajectory" }>['runs'][number]) {
  const pathPass = run.steps.every(({ expected }) => expected);
  return { run, pathPass, finalPass: run.finalOutcome === "pass", accepted: pathPass && run.finalOutcome === "pass" };
}

export function inspectTrace(
  scenario: Extract<EvaluationConsoleScenario, { kind: "trace-completeness" }>,
  traceId: string,
) {
  const trace = scenario.traces.find(({ id }) => id === traceId) ?? scenario.traces[0];
  const present = new Set(trace.presentSpans);
  const spans = scenario.requiredSpans.map((id) => ({ id, present: present.has(id) }));
  const missing = spans.filter(({ present }) => !present).map(({ id }) => id);
  const traceIds = new Set(trace.spanTraceIds.map(({ traceId }) => traceId));
  const correlationStatus = traceIds.size === 0 ? "unavailable" : traceIds.size === 1 ? "consistent" : "mismatch";
  const correlated = correlationStatus === "consistent";
  return { trace, spans, missing, completeness: scenario.requiredSpans.length ? (spans.length - missing.length) / scenario.requiredSpans.length : 0, correlated, correlationStatus, reconstructable: missing.length === 0 && correlated };
}

export function costPerSuccessfulTask(candidate: Extract<EvaluationConsoleScenario, { kind: "cost-per-success" }>['candidates'][number]) {
  return candidate.successes > 0 ? candidate.cost / candidate.successes : null;
}

export function decideReleaseCandidate(
  scenario: Extract<EvaluationConsoleScenario, { kind: "release-gate" }>,
  candidateId: string,
  aggregateOnly = false,
) {
  const candidate = scenario.candidates.find(({ id }) => id === candidateId) ?? scenario.candidates[0];
  const slices = candidate.slices.map((slice) => ({ ...slice, passes: slice.score >= scenario.sliceFloor }));
  const aggregatePasses = candidate.aggregate >= scenario.aggregateFloor;
  const slicePasses = slices.every(({ passes }) => passes);
  return { candidate, slices, aggregatePasses, slicePasses, promoted: aggregateOnly ? aggregatePasses : aggregatePasses && slicePasses };
}
