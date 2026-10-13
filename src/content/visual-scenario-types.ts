export type RetrievalVisualScenario = {
  engine: "retrieval-microscope";
  calculationVersion?: string;
  title: string;
  query: string;
  defaultChunkSize: number;
  defaultTopK: number;
  sentences: {
    id: string;
    text: string;
    relevant: boolean;
    sourceStatus?: "current" | "stale" | "restricted";
  }[];
};

export type TrustBoundaryScenario = {
  engine: "trust-boundary-sandbox";
  calculationVersion?: string;
  focus: "containment" | "approval" | "provenance" | "injection";
  title: string;
  prompt: string;
  sources: { id: "system" | "user" | "document"; label: string; message: string }[];
  actions: { id: "read-public-guide" | "export-customer-records"; label: string; requestText: string }[];
  destinations: { id: "operations-guide" | "external-email" | "customer-records"; label: string }[];
  evidenceCases: { id: string; label: string; detail: string; action: "read-public-guide" | "export-customer-records"; destination: "operations-guide" | "external-email" | "customer-records"; verified: boolean }[];
  defaults: { source: "system" | "user" | "document"; action: "read-public-guide" | "export-customer-records"; destination: "operations-guide" | "external-email" | "customer-records"; evidenceCase: string };
};

type ScenarioBase = { engine: "request-workbench"; calculationVersion?: string; title: string; prompt: string };
export type RequestWorkbenchScenario =
  | (ScenarioBase & {
      kind: "pipeline";
      stages: { id: string; label: string; success: string; failure: string }[];
      failureOptions: { id: string; label: string }[];
    })
  | (ScenarioBase & {
      kind: "structured-output";
      examples: {
        id: string;
        label: string;
        answerPresent: boolean;
        answer: string | null;
        status: "answered" | "not_found";
        citations: string[] | null;
      }[];
      allowedCitationIds: string[];
    })
  | (ScenarioBase & {
      kind: "prompt-evaluation";
      trustedInstruction: string;
      untrustedDocument: string;
      versions: { id: string; label: string; results: { id: string; case: string; observation: string; slice: string; passed: boolean }[] }[];
    })
  | (ScenarioBase & {
      kind: "routing";
      tasks: {
        id: string;
        label: string;
        complexity: number;
        confidence: number;
        expectedRoute: "small" | "balanced" | "reasoning" | "not_found";
      }[];
    })
  | (ScenarioBase & {
      kind: "prompt-cache";
      cacheMinimumTokens: number;
      requests: { id: string; label: string; stablePrefixKey: string | null; stablePrefixTokens: number; variableTokens: number }[];
    });

export type AgentWorkflowScenario = {
  engine: "agent-state-machine";
  calculationVersion?: string;
  title: string;
  prompt: string;
  injectedEventLabel: string;
  injectedEventOutcome: string;
  injectedEventAfterState: string;
  injectedEventMode: "replay" | "optimistic-write";
  expectedRevision?: number;
  currentRevision?: number;
  states: { id: string; label: string; detail: string }[];
};

type EvaluationBase = { engine: "evaluation-console"; calculationVersion?: string; title: string; prompt: string };
export type EvaluationConsoleScenario =
  | (EvaluationBase & { kind: "slice-threshold"; defaultThreshold: number; slices: { id: string; label: string; score: number; count: number }[] })
  | (EvaluationBase & { kind: "judge-calibration"; defaultThreshold: number; cases: { id: string; label: string; humanLabel: "pass" | "fail"; confidence: number; rationale: string }[] })
  | (EvaluationBase & { kind: "trajectory"; runs: { id: string; label: string; finalOutcome: "pass" | "fail"; steps: { id: string; action: string; observation: string; expected: boolean }[] }[] })
  | (EvaluationBase & { kind: "trace-completeness"; requiredSpans: string[]; traces: { id: string; label: string; presentSpans: string[]; spanTraceIds: { span: string; traceId: string }[]; note: string }[] })
  | (EvaluationBase & { kind: "cost-per-success"; candidates: { id: string; label: string; cost: number; tasks: number; successes: number; source: string }[] })
  | (EvaluationBase & { kind: "release-gate"; aggregateFloor: number; sliceFloor: number; candidates: { id: string; label: string; aggregate: number; slices: { id: string; label: string; score: number }[] }[] });

export type ProductionTabletopCriticalPathScenario = {
  engine: "production-tabletop";
  kind: "critical-path";
  calculationVersion?: string;
  title: string;
  prompt: string;
  retrievalMs: number;
  firstTool: { id: string; label: string; durationMs: number };
  secondTool: { id: string; label: string; durationMs: number };
};

export type ProductionTabletopDecisionScenario = {
  engine: "production-tabletop";
  kind: "decision-trace";
  calculationVersion?: string;
  title: string;
  prompt: string;
  controlLabel: string;
  controlPrompt: string;
  predictionPrompt: string;
  options: {
    id: string;
    label: string;
    context: string;
    predictions: { id: string; label: string }[];
    expectedPrediction: string;
    transitions: { id: string; label: string; observation: string }[];
    result: string;
    explanation: string;
  }[];
};

/** Kept as the original waterfall scenario shape for the latency helpers. */
export type ProductionTabletopScenario = ProductionTabletopCriticalPathScenario;
export type AnyProductionTabletopScenario = ProductionTabletopCriticalPathScenario | ProductionTabletopDecisionScenario;

export type InferenceSchedulerScenario = {
  engine: "inference-scheduler";
  calculationVersion?: string;
  title: string;
  prompt: string;
  layers: number;
  kvHeads: number;
  headDimension: number;
  bytesPerValue: number;
  defaultSequenceTokens: number;
  defaultActiveSequences: number;
  defaultBatchSize: number;
  defaultConcurrency: number;
  defaultPrefixReuse: boolean;
};

export type TokenSamplingScenario = {
  engine: "attention";
  kind: "token-sampling";
  calculationVersion?: string;
  title: string;
  prompt: string;
  defaultTemperature: number;
  defaultTopP: number;
  candidates: { token: string; logit: number }[];
};

export type AttentionMechanismScenario = {
  engine: "attention";
  kind: "attention-mechanism";
  calculationVersion?: string;
  title: string;
  prompt: string;
  tokens: string[];
  defaultQueryIndex: number;
  defaultCausalMask: boolean;
};

export type AttentionScenario = TokenSamplingScenario | AttentionMechanismScenario;
export type LessonVisualScenario = RetrievalVisualScenario | RequestWorkbenchScenario | AgentWorkflowScenario | EvaluationConsoleScenario | TrustBoundaryScenario | AnyProductionTabletopScenario | InferenceSchedulerScenario | AttentionScenario;
