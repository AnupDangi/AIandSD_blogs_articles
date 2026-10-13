import { createHash } from "node:crypto";
import retrievalManifest from "../../curriculum/visual-scenarios.json";
import requestManifest from "../../curriculum/request-workbench-scenarios.json";
import agentManifest from "../../curriculum/agent-workflow-scenarios.json";
import evaluationManifest from "../../curriculum/evaluation-console-scenarios.json";
import trustBoundaryManifest from "../../curriculum/trust-boundary-scenarios.json";
import productionTabletopManifest from "../../curriculum/production-tabletop-scenarios.json";
import attentionManifest from "../../curriculum/attention-scenarios.json";
import inferenceSchedulerManifest from "../../curriculum/inference-scheduler-scenarios.json";
import { z } from "zod";
import type { AgentWorkflowScenario, AnyProductionTabletopScenario, AttentionScenario, EvaluationConsoleScenario, InferenceSchedulerScenario, LessonVisualScenario, RequestWorkbenchScenario, RetrievalVisualScenario, TrustBoundaryScenario } from "@/content/visual-scenario-types";

const retrievalScenarioSchema = z.object({
  engine: z.literal("retrieval-microscope"),
  calculationVersion: z.string().min(1),
  title: z.string().min(1),
  query: z.string().min(1),
  defaultChunkSize: z.number().int().min(1).max(5),
  defaultTopK: z.number().int().positive(),
  sentences: z.array(z.object({
    id: z.string().min(1),
    text: z.string().min(1),
    relevant: z.boolean(),
    sourceStatus: z.enum(["current", "stale", "restricted"]).optional(),
  }).strict()).min(1),
}).strict();
const requestScenarioSchema = z.discriminatedUnion("kind", [
  z.object({
    engine: z.literal("request-workbench"), calculationVersion: z.string().min(1), kind: z.literal("pipeline"), title: z.string().min(1), prompt: z.string().min(1),
    stages: z.array(z.object({ id: z.string().min(1), label: z.string().min(1), success: z.string().min(1), failure: z.string().min(1) }).strict()).min(1),
    failureOptions: z.array(z.object({ id: z.string().min(1), label: z.string().min(1) }).strict()).min(1),
  }).strict().superRefine((scenario, context) => {
    const stageIds = scenario.stages.map(({ id }) => id);
    const optionIds = scenario.failureOptions.map(({ id }) => id);
    if (stageIds.includes("none")) context.addIssue({ code: "custom", path: ["stages"], message: "The stage ID 'none' is reserved for the no-failure option." });
    if (new Set(stageIds).size !== stageIds.length) context.addIssue({ code: "custom", path: ["stages"], message: "Stage IDs must be unique." });
    if (new Set(optionIds).size !== optionIds.length) context.addIssue({ code: "custom", path: ["failureOptions"], message: "Failure option IDs must be unique." });
    if (optionIds.filter((id) => id === "none").length !== 1) context.addIssue({ code: "custom", path: ["failureOptions"], message: "Provide exactly one 'none' option." });
    for (const [index, id] of optionIds.entries()) {
      if (id !== "none" && !stageIds.includes(id)) context.addIssue({ code: "custom", path: ["failureOptions", index, "id"], message: `Failure option '${id}' does not match a pipeline stage.` });
    }
  }),
  z.object({
    engine: z.literal("request-workbench"), calculationVersion: z.string().min(1), kind: z.literal("structured-output"), title: z.string().min(1), prompt: z.string().min(1),
    examples: z.array(z.object({ id: z.string().min(1), label: z.string().min(1), answerPresent: z.boolean(), answer: z.string().nullable(), status: z.enum(["answered", "not_found"]), citations: z.array(z.string()).nullable() }).strict()).min(1),
    allowedCitationIds: z.array(z.string().min(1)),
  }).strict(),
  z.object({
    engine: z.literal("request-workbench"), calculationVersion: z.string().min(1), kind: z.literal("prompt-evaluation"), title: z.string().min(1), prompt: z.string().min(1),
    trustedInstruction: z.string().min(1), untrustedDocument: z.string().min(1),
    versions: z.array(z.object({ id: z.string().min(1), label: z.string().min(1), results: z.array(z.object({ id: z.string().min(1), case: z.string().min(1), observation: z.string().min(1), slice: z.string().min(1), passed: z.boolean() }).strict()).min(1) }).strict()).min(2),
  }).strict(),
  z.object({
    engine: z.literal("request-workbench"), calculationVersion: z.string().min(1), kind: z.literal("routing"), title: z.string().min(1), prompt: z.string().min(1),
    tasks: z.array(z.object({ id: z.string().min(1), label: z.string().min(1), complexity: z.number().min(0).max(100), confidence: z.number().min(0).max(1), expectedRoute: z.enum(["small", "balanced", "reasoning", "not_found"]) }).strict()).min(1),
  }).strict(),
  z.object({
    engine: z.literal("request-workbench"), calculationVersion: z.string().min(1), kind: z.literal("prompt-cache"), title: z.string().min(1), prompt: z.string().min(1), cacheMinimumTokens: z.number().int().positive(),
    requests: z.array(z.object({ id: z.string().min(1), label: z.string().min(1), stablePrefixKey: z.string().nullable(), stablePrefixTokens: z.number().int().nonnegative(), variableTokens: z.number().int().nonnegative() }).strict()).min(2),
  }).strict(),
]);
const agentScenarioSchema = z.object({
  engine: z.literal("agent-state-machine"),
  calculationVersion: z.string().min(1),
  title: z.string().min(1),
  prompt: z.string().min(1),
  injectedEventLabel: z.string().min(1),
  injectedEventOutcome: z.string().min(1),
  injectedEventAfterState: z.string().min(1),
  injectedEventMode: z.enum(["replay", "optimistic-write"]),
  expectedRevision: z.number().int().nonnegative().optional(),
  currentRevision: z.number().int().nonnegative().optional(),
  states: z.array(z.object({ id: z.string().min(1), label: z.string().min(1), detail: z.string().min(1) }).strict()).min(2),
}).strict().superRefine((scenario, context) => {
  const ids = scenario.states.map(({ id }) => id);
  if (new Set(ids).size !== ids.length) context.addIssue({ code: "custom", path: ["states"], message: "Workflow state IDs must be unique." });
  if (!ids.includes(scenario.injectedEventAfterState)) context.addIssue({ code: "custom", path: ["injectedEventAfterState"], message: "The injected event must name a state in this workflow." });
  if (scenario.injectedEventMode === "optimistic-write" && (scenario.expectedRevision === undefined || scenario.currentRevision === undefined)) {
    context.addIssue({ code: "custom", path: ["expectedRevision"], message: "Optimistic writes require expected and current revisions." });
  }
});
const evaluationScenarioSchema = z.discriminatedUnion("kind", [
  z.object({ engine: z.literal("evaluation-console"), calculationVersion: z.string().min(1), kind: z.literal("slice-threshold"), title: z.string().min(1), prompt: z.string().min(1), defaultThreshold: z.number().min(0.4).max(0.95), slices: z.array(z.object({ id: z.string().min(1), label: z.string().min(1), score: z.number().min(0).max(1), count: z.number().int().positive() }).strict()).min(1) }).strict(),
  z.object({ engine: z.literal("evaluation-console"), calculationVersion: z.string().min(1), kind: z.literal("judge-calibration"), title: z.string().min(1), prompt: z.string().min(1), defaultThreshold: z.number().min(0.4).max(0.95), cases: z.array(z.object({ id: z.string().min(1), label: z.string().min(1), humanLabel: z.enum(["pass", "fail"]), confidence: z.number().min(0).max(1), rationale: z.string().min(1) }).strict()).min(1) }).strict(),
  z.object({ engine: z.literal("evaluation-console"), calculationVersion: z.string().min(1), kind: z.literal("trajectory"), title: z.string().min(1), prompt: z.string().min(1), runs: z.array(z.object({ id: z.string().min(1), label: z.string().min(1), finalOutcome: z.enum(["pass", "fail"]), steps: z.array(z.object({ id: z.string().min(1), action: z.string().min(1), observation: z.string().min(1), expected: z.boolean() }).strict()).min(1) }).strict()).min(1) }).strict(),
  z.object({ engine: z.literal("evaluation-console"), calculationVersion: z.string().min(1), kind: z.literal("trace-completeness"), title: z.string().min(1), prompt: z.string().min(1), requiredSpans: z.array(z.string().min(1)).min(1), traces: z.array(z.object({ id: z.string().min(1), label: z.string().min(1), presentSpans: z.array(z.string().min(1)), spanTraceIds: z.array(z.object({ span: z.string().min(1), traceId: z.string().min(1) }).strict()), note: z.string().min(1) }).strict()).min(1) }).strict(),
  z.object({ engine: z.literal("evaluation-console"), calculationVersion: z.string().min(1), kind: z.literal("cost-per-success"), title: z.string().min(1), prompt: z.string().min(1), candidates: z.array(z.object({ id: z.string().min(1), label: z.string().min(1), cost: z.number().nonnegative(), tasks: z.number().int().positive(), successes: z.number().int().nonnegative(), source: z.string().min(1) }).strict().refine(({ successes, tasks }) => successes <= tasks, "Success count cannot exceed task count.")).min(1) }).strict(),
  z.object({ engine: z.literal("evaluation-console"), calculationVersion: z.string().min(1), kind: z.literal("release-gate"), title: z.string().min(1), prompt: z.string().min(1), aggregateFloor: z.number().min(0).max(1), sliceFloor: z.number().min(0).max(1), candidates: z.array(z.object({ id: z.string().min(1), label: z.string().min(1), aggregate: z.number().min(0).max(1), slices: z.array(z.object({ id: z.string().min(1), label: z.string().min(1), score: z.number().min(0).max(1) }).strict()).min(1) }).strict()).min(2) }).strict(),
]).superRefine((scenario, context) => {
  const unique = (ids: string[], path: (string | number)[], label: string) => {
    if (new Set(ids).size !== ids.length) context.addIssue({ code: "custom", path, message: `${label} IDs must be unique.` });
  };
  if (scenario.kind === "slice-threshold") unique(scenario.slices.map(({ id }) => id), ["slices"], "Slice");
  if (scenario.kind === "judge-calibration") unique(scenario.cases.map(({ id }) => id), ["cases"], "Case");
  if (scenario.kind === "trajectory") {
    unique(scenario.runs.map(({ id }) => id), ["runs"], "Run");
    scenario.runs.forEach((run, index) => unique(run.steps.map(({ id }) => id), ["runs", index, "steps"], "Step"));
  }
  if (scenario.kind === "trace-completeness") {
    unique(scenario.requiredSpans, ["requiredSpans"], "Required span");
    unique(scenario.traces.map(({ id }) => id), ["traces"], "Trace");
    scenario.traces.forEach((trace, index) => {
      unique(trace.presentSpans, ["traces", index, "presentSpans"], "Present span");
      unique(trace.spanTraceIds.map(({ span }) => span), ["traces", index, "spanTraceIds"], "Correlated span");
      if (trace.presentSpans.some((span) => !scenario.requiredSpans.includes(span))) context.addIssue({ code: "custom", path: ["traces", index, "presentSpans"], message: "Trace spans must appear in the required span list." });
      if (trace.spanTraceIds.some(({ span }) => !trace.presentSpans.includes(span)) || trace.presentSpans.some((span) => !trace.spanTraceIds.some((entry) => entry.span === span))) context.addIssue({ code: "custom", path: ["traces", index, "spanTraceIds"], message: "Provide one correlation ID for each recorded span and none for missing spans." });
    });
  }
  if (scenario.kind === "cost-per-success") unique(scenario.candidates.map(({ id }) => id), ["candidates"], "Candidate");
  if (scenario.kind === "release-gate") {
    unique(scenario.candidates.map(({ id }) => id), ["candidates"], "Candidate");
    const baseline = scenario.candidates[0].slices.map(({ id }) => id).sort().join("|");
    scenario.candidates.forEach((candidate, index) => {
      unique(candidate.slices.map(({ id }) => id), ["candidates", index, "slices"], "Release slice");
      if (candidate.slices.map(({ id }) => id).sort().join("|") !== baseline) context.addIssue({ code: "custom", path: ["candidates", index, "slices"], message: "Release candidates must use the same slice set." });
    });
  }
});
const trustBoundaryScenarioSchema = z.object({
  engine: z.literal("trust-boundary-sandbox"),
  calculationVersion: z.string().min(1),
  focus: z.enum(["containment", "approval", "provenance", "injection"]),
  title: z.string().min(1),
  prompt: z.string().min(1),
  sources: z.array(z.object({ id: z.enum(["system", "user", "document"]), label: z.string().min(1), message: z.string().min(1) }).strict()).min(1),
  actions: z.array(z.object({ id: z.enum(["read-public-guide", "export-customer-records"]), label: z.string().min(1), requestText: z.string().min(1) }).strict()).min(1),
  destinations: z.array(z.object({ id: z.enum(["operations-guide", "external-email", "customer-records"]), label: z.string().min(1) }).strict()).min(1),
  evidenceCases: z.array(z.object({ id: z.string().min(1), label: z.string().min(1), detail: z.string().min(1), action: z.enum(["read-public-guide", "export-customer-records"]), destination: z.enum(["operations-guide", "external-email", "customer-records"]), verified: z.boolean() }).strict()).min(1),
  defaults: z.object({ source: z.enum(["system", "user", "document"]), action: z.enum(["read-public-guide", "export-customer-records"]), destination: z.enum(["operations-guide", "external-email", "customer-records"]), evidenceCase: z.string().min(1) }).strict(),
}).strict().superRefine((scenario, context) => {
  const options: [string, string[], string][] = [
    ["sources", scenario.sources.map(({ id }) => id), "Source"],
    ["actions", scenario.actions.map(({ id }) => id), "Action"],
    ["destinations", scenario.destinations.map(({ id }) => id), "Destination"],
    ["evidenceCases", scenario.evidenceCases.map(({ id }) => id), "Evidence case"],
  ];
  for (const [field, ids, label] of options) {
    if (new Set(ids).size !== ids.length) context.addIssue({ code: "custom", path: [field], message: `${label} IDs must be unique.` });
  }
  for (const [field, value, ids] of [
    ["source", scenario.defaults.source, scenario.sources.map(({ id }) => id)],
    ["action", scenario.defaults.action, scenario.actions.map(({ id }) => id)],
    ["destination", scenario.defaults.destination, scenario.destinations.map(({ id }) => id)],
    ["evidenceCase", scenario.defaults.evidenceCase, scenario.evidenceCases.map(({ id }) => id)],
  ] as const) {
    if (!(ids as readonly string[]).includes(value)) context.addIssue({ code: "custom", path: ["defaults", field], message: `Default ${field} must exist in its authored options.` });
  }
  const actionIds = scenario.actions.map(({ id }) => id);
  const destinationIds = scenario.destinations.map(({ id }) => id);
  scenario.evidenceCases.forEach((evidence, index) => {
    if (!actionIds.includes(evidence.action)) context.addIssue({ code: "custom", path: ["evidenceCases", index, "action"], message: "Evidence must reference an action offered by this scenario." });
    if (!destinationIds.includes(evidence.destination)) context.addIssue({ code: "custom", path: ["evidenceCases", index, "destination"], message: "Evidence must reference a destination offered by this scenario." });
  });
});
const productionTabletopScenarioSchema = z.discriminatedUnion("kind", [
  z.object({
    engine: z.literal("production-tabletop"),
    calculationVersion: z.string().min(1),
    kind: z.literal("critical-path"),
    title: z.string().min(1),
    prompt: z.string().min(1),
    retrievalMs: z.number().int().min(1).max(60_000),
    firstTool: z.object({ id: z.string().min(1), label: z.string().min(1), durationMs: z.number().int().min(1).max(60_000) }).strict(),
    secondTool: z.object({ id: z.string().min(1), label: z.string().min(1), durationMs: z.number().int().min(1).max(60_000) }).strict(),
  }).strict().superRefine((scenario, context) => {
    if (scenario.firstTool.id === scenario.secondTool.id) context.addIssue({ code: "custom", path: ["secondTool", "id"], message: "The two latency tools must have distinct IDs." });
    if (scenario.firstTool.id === "retrieval" || scenario.secondTool.id === "retrieval") context.addIssue({ code: "custom", path: ["firstTool", "id"], message: "The 'retrieval' ID is reserved for the retrieval span." });
  }),
  z.object({
    engine: z.literal("production-tabletop"),
    calculationVersion: z.string().min(1),
    kind: z.literal("decision-trace"),
    title: z.string().min(1),
    prompt: z.string().min(1),
    controlLabel: z.string().min(1),
    controlPrompt: z.string().min(1),
    predictionPrompt: z.string().min(1),
    options: z.array(z.object({
      id: z.string().min(1),
      label: z.string().min(1),
      context: z.string().min(1),
      predictions: z.array(z.object({ id: z.string().min(1), label: z.string().min(1) }).strict()).min(2),
      expectedPrediction: z.string().min(1),
      transitions: z.array(z.object({ id: z.string().min(1), label: z.string().min(1), observation: z.string().min(1) }).strict()).min(2),
      result: z.string().min(1),
      explanation: z.string().min(1),
    }).strict()).min(2),
  }).strict().superRefine((scenario, context) => {
    const optionIds = scenario.options.map(({ id }) => id);
    if (new Set(optionIds).size !== optionIds.length) context.addIssue({ code: "custom", path: ["options"], message: "Control option IDs must be unique." });
    scenario.options.forEach((option, index) => {
      const predictionIds = option.predictions.map(({ id }) => id);
      if (new Set(predictionIds).size !== predictionIds.length) context.addIssue({ code: "custom", path: ["options", index, "predictions"], message: "Prediction IDs must be unique within an option." });
      if (!predictionIds.includes(option.expectedPrediction)) context.addIssue({ code: "custom", path: ["options", index, "expectedPrediction"], message: "Expected prediction must match an authored prediction." });
      const transitionIds = option.transitions.map(({ id }) => id);
      if (new Set(transitionIds).size !== transitionIds.length) context.addIssue({ code: "custom", path: ["options", index, "transitions"], message: "Transition IDs must be unique within an option." });
    });
  }),
]);
const inferenceSchedulerScenarioSchema = z.object({
  engine: z.literal("inference-scheduler"),
  calculationVersion: z.string().min(1),
  title: z.string().min(1),
  prompt: z.string().min(1),
  layers: z.number().int().min(1).max(256),
  kvHeads: z.number().int().min(1).max(256),
  headDimension: z.number().int().min(1).max(1024),
  bytesPerValue: z.union([z.literal(1), z.literal(2), z.literal(4)]),
  defaultSequenceTokens: z.number().int().min(512).max(16_384),
  defaultActiveSequences: z.number().int().min(1).max(8),
  defaultBatchSize: z.number().int().min(1).max(12),
  defaultConcurrency: z.number().int().min(1).max(16),
  defaultPrefixReuse: z.boolean(),
}).strict();
const attentionScenarioSchema = z.discriminatedUnion("kind", [
  z.object({
    engine: z.literal("attention"), calculationVersion: z.string().min(1), kind: z.literal("token-sampling"), title: z.string().min(1), prompt: z.string().min(1),
    defaultTemperature: z.number().min(0.35).max(2), defaultTopP: z.number().min(0.35).max(1),
    candidates: z.array(z.object({ token: z.string().min(1), logit: z.number().finite() }).strict()).min(2).max(12),
  }).strict().superRefine((scenario, context) => {
    const tokens = scenario.candidates.map(({ token }) => token);
    if (new Set(tokens).size !== tokens.length) context.addIssue({ code: "custom", path: ["candidates"], message: "Candidate tokens must be unique." });
  }),
  z.object({
    engine: z.literal("attention"), calculationVersion: z.string().min(1), kind: z.literal("attention-mechanism"), title: z.string().min(1), prompt: z.string().min(1),
    tokens: z.array(z.string().min(1)).min(4).max(12), defaultQueryIndex: z.number().int().nonnegative(), defaultCausalMask: z.boolean(),
  }).strict().superRefine((scenario, context) => {
    if (scenario.defaultQueryIndex >= scenario.tokens.length) context.addIssue({ code: "custom", path: ["defaultQueryIndex"], message: "The default query index must point to a token in this scenario." });
  }),
]);

function parseManifest<T extends z.ZodType>(value: unknown, schema: T): z.infer<T> {
  return schema.parse(value);
}

const retrievalScenarios = parseManifest(retrievalManifest, z.record(z.string(), retrievalScenarioSchema)) as Record<string, RetrievalVisualScenario>;
export function validateRequestWorkbenchScenarioManifest(value: unknown): Record<string, RequestWorkbenchScenario> {
  return parseManifest(value, z.record(z.string(), requestScenarioSchema)) as Record<string, RequestWorkbenchScenario>;
}
const requestScenarios = validateRequestWorkbenchScenarioManifest(requestManifest);
const agentScenarios = parseManifest(agentManifest, z.record(z.string(), agentScenarioSchema)) as Record<string, AgentWorkflowScenario>;
const evaluationScenarios = parseManifest(evaluationManifest, z.record(z.string(), evaluationScenarioSchema)) as Record<string, EvaluationConsoleScenario>;
export function validateTrustBoundaryScenarioManifest(value: unknown): Record<string, TrustBoundaryScenario> {
  return parseManifest(value, z.record(z.string(), trustBoundaryScenarioSchema)) as Record<string, TrustBoundaryScenario>;
}
const trustBoundaryScenarios = validateTrustBoundaryScenarioManifest(trustBoundaryManifest);
export function validateProductionTabletopScenarioManifest(value: unknown): Record<string, AnyProductionTabletopScenario> {
  return parseManifest(value, z.record(z.string(), productionTabletopScenarioSchema)) as Record<string, AnyProductionTabletopScenario>;
}
const productionTabletopScenarios = validateProductionTabletopScenarioManifest(productionTabletopManifest);
export function validateAttentionScenarioManifest(value: unknown): Record<string, AttentionScenario> {
  return parseManifest(value, z.record(z.string(), attentionScenarioSchema)) as Record<string, AttentionScenario>;
}
const attentionScenarios = validateAttentionScenarioManifest(attentionManifest);
export function validateInferenceSchedulerScenarioManifest(value: unknown): Record<string, InferenceSchedulerScenario> {
  return parseManifest(value, z.record(z.string(), inferenceSchedulerScenarioSchema)) as Record<string, InferenceSchedulerScenario>;
}
const inferenceSchedulerScenarios = validateInferenceSchedulerScenarioManifest(inferenceSchedulerManifest);

/** Resolve only an explicitly authored lesson scenario. Gallery fallbacks belong to individual engines. */
export function getLessonVisualScenario(lessonId: string): LessonVisualScenario | undefined {
  return requestScenarios[lessonId] ?? retrievalScenarios[lessonId] ?? agentScenarios[lessonId] ?? evaluationScenarios[lessonId] ?? trustBoundaryScenarios[lessonId] ?? productionTabletopScenarios[lessonId] ?? attentionScenarios[lessonId] ?? inferenceSchedulerScenarios[lessonId];
}

export function getRequestWorkbenchScenario(lessonId?: string): RequestWorkbenchScenario | undefined {
  if (!lessonId) return undefined;
  return requestScenarios[lessonId];
}

export function isRequestWorkbenchScenario(scenario: LessonVisualScenario | undefined): scenario is RequestWorkbenchScenario {
  return scenario?.engine === "request-workbench";
}

export const requestWorkbenchScenarioManifest = requestScenarios;
export const agentWorkflowScenarioManifest = agentScenarios;
export const evaluationConsoleScenarioManifest = evaluationScenarios;
export const trustBoundaryScenarioManifest = trustBoundaryScenarios;
export const productionTabletopScenarioManifest = productionTabletopScenarios;
export const lessonVisualScenarioManifest: Record<string, LessonVisualScenario> = {
  ...retrievalScenarios,
  ...requestScenarios,
  ...agentScenarios,
  ...evaluationScenarios,
  ...trustBoundaryScenarios,
  ...productionTabletopScenarios,
  ...attentionScenarios,
  ...inferenceSchedulerScenarios,
};

export function lessonScenarioCalculationVersions(): Record<string, string> {
  const versions: Record<string, string> = {};
  for (const [lessonId, scenario] of Object.entries(lessonVisualScenarioManifest)) {
    const version = scenario.calculationVersion;
    if (version) versions[lessonId] = version;
  }
  return versions;
}

export function canonicalJson(value: unknown): string {
  const sorted = JSON.stringify(value, (_key, item) => (item && typeof item === "object" && !Array.isArray(item) ? Object.fromEntries(Object.entries(item).sort(([a], [b]) => (a < b ? -1 : 1))) : item));
  return sorted;
}

export function lessonScenarioCalculationVersionsSha256(): string {
  return createHash("sha256").update(canonicalJson(lessonScenarioCalculationVersions()), "utf8").digest("hex");
}
