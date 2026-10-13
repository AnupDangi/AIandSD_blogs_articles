import type { RequestWorkbenchScenario } from "@/content/visual-scenario-types";

export type RequestFailure = string;

export function traceRequestPipeline(scenario: Extract<RequestWorkbenchScenario, { kind: "pipeline" }>, failure: RequestFailure) {
  if (!scenario.failureOptions.some(({ id }) => id === failure)) {
    throw new Error(`Unknown request failure option: ${failure}`);
  }
  let stopped = false;
  const stages = scenario.stages.map((stage) => {
    const failed = !stopped && stage.id === failure;
    const skipped = stopped;
    if (failed) stopped = true;
    return { ...stage, status: failed ? "failed" as const : skipped ? "skipped" as const : "passed" as const, observation: failed ? stage.failure : skipped ? "Not run after an earlier failure" : stage.success };
  });
  const failedStage = stages.find(({ status }) => status === "failed");
  return { stages, success: !stopped, terminal: failedStage?.id ?? "complete" };
}

export function evaluateAnswerExample(
  scenario: Extract<RequestWorkbenchScenario, { kind: "structured-output" }>,
  exampleId: string,
) {
  const example = scenario.examples.find(({ id }) => id === exampleId) ?? scenario.examples[0];
  const schemaValid = Boolean(example && example.answerPresent && typeof example.status === "string" && Array.isArray(example.citations) && (example.answer === null || typeof example.answer === "string"));
  const answerConsistent = Boolean(example && (example.status === "answered" ? Boolean(example.answer?.trim()) : !example.answer && example.citations?.length === 0));
  const citationsAllowed = Boolean(example && example.citations?.every((id) => scenario.allowedCitationIds.includes(id)));
  return { example, schemaValid, answerConsistent, citationsAllowed, accepted: schemaValid && answerConsistent && citationsAllowed };
}

export function summarizePromptVersion(scenario: Extract<RequestWorkbenchScenario, { kind: "prompt-evaluation" }>, versionId: string) {
  const version = scenario.versions.find(({ id }) => id === versionId) ?? scenario.versions[0];
  const slices = [...new Set(version.results.map(({ slice }) => slice))].map((slice) => {
    const cases = version.results.filter((result) => result.slice === slice);
    const passed = cases.filter((result) => result.passed).length;
    return { slice, passed, total: cases.length, rate: cases.length ? passed / cases.length : 0 };
  });
  const passed = version.results.filter(({ passed }) => passed).length;
  return { version, slices, passed, total: version.results.length, rate: version.results.length ? passed / version.results.length : 0 };
}

export type RouteName = "small" | "balanced" | "reasoning" | "not_found";
export function routeRequestTask(task: Extract<RequestWorkbenchScenario, { kind: "routing" }>["tasks"][number], confidenceFloor: number): RouteName {
  if (task.confidence < confidenceFloor) return "not_found";
  if (task.complexity < 30) return "small";
  if (task.complexity < 70) return "balanced";
  return "reasoning";
}

export function advancePromptCache(
  scenario: Extract<RequestWorkbenchScenario, { kind: "prompt-cache" }>,
  seenPrefixKeys: readonly string[],
  requestId: string,
) {
  const request = scenario.requests.find(({ id }) => id === requestId);
  if (!request) return null;
  const matchingPrefixTokens = request.stablePrefixKey && seenPrefixKeys.includes(request.stablePrefixKey) ? request.stablePrefixTokens : 0;
  const hit = matchingPrefixTokens >= scenario.cacheMinimumTokens;
  return {
    request,
    hit,
    matchingPrefixTokens,
    cacheEligibleTokens: hit ? matchingPrefixTokens : 0,
    totalTokens: request.stablePrefixTokens + request.variableTokens,
  };
}
