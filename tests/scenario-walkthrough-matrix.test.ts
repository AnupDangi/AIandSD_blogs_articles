import { describe, expect, it } from "vitest";
import { lessonVisualScenarioManifest, getLessonVisualScenario } from "../src/lib/visual-scenarios";
import { scoreEvaluationSlices } from "../src/lib/evaluation-console";
import { lessons } from "../src/content/applied-ai";
import type { AgentWorkflowScenario, AnyProductionTabletopScenario, AttentionScenario, EvaluationConsoleScenario, InferenceSchedulerScenario, LessonVisualScenario, RequestWorkbenchScenario, RetrievalVisualScenario, TrustBoundaryScenario } from "../src/content/visual-scenario-types";

const lessonIds = new Set(lessons.map(({ id }) => id));

function claimPipe(scenario: LessonVisualScenario, engine: string, kind?: string): boolean {
  return scenario.engine === engine && (kind === undefined || (scenario as { kind?: string }).kind === kind);
}

type RequestPipelineScenario = Extract<RequestWorkbenchScenario, { kind: "pipeline" }>;

function asPipelines(): RequestPipelineScenario[] {
  return Object.values(lessonVisualScenarioManifest)
    .filter((scenario): scenario is RequestWorkbenchScenario => claimPipe(scenario, "request-workbench"))
    .filter((scenario): scenario is RequestPipelineScenario => scenario.kind === "pipeline");
}

function asSliceThresholds(): Extract<EvaluationConsoleScenario, { kind: "slice-threshold" }>[] {
  return Object.values(lessonVisualScenarioManifest)
    .filter((scenario): scenario is EvaluationConsoleScenario => claimPipe(scenario, "evaluation-console"))
    .filter((scenario): scenario is Extract<EvaluationConsoleScenario, { kind: "slice-threshold" }> => scenario.kind === "slice-threshold");
}

function asTrustScenarios(): TrustBoundaryScenario[] {
  return Object.values(lessonVisualScenarioManifest).filter((scenario): scenario is TrustBoundaryScenario => claimPipe(scenario, "trust-boundary-sandbox"));
}

function asAgentScenarios(): AgentWorkflowScenario[] {
  return Object.values(lessonVisualScenarioManifest).filter((scenario): scenario is AgentWorkflowScenario => claimPipe(scenario, "agent-state-machine"));
}

function asTabletopScenarios(): AnyProductionTabletopScenario[] {
  return Object.values(lessonVisualScenarioManifest).filter((scenario): scenario is AnyProductionTabletopScenario => claimPipe(scenario, "production-tabletop"));
}

function asAttentionScenarios(): AttentionScenario[] {
  return Object.values(lessonVisualScenarioManifest).filter((scenario): scenario is AttentionScenario => claimPipe(scenario, "attention"));
}

function asRetrievalScenarios(): RetrievalVisualScenario[] {
  return Object.values(lessonVisualScenarioManifest).filter((scenario): scenario is RetrievalVisualScenario => claimPipe(scenario, "retrieval-microscope"));
}

function asInferenceScenarios(): InferenceSchedulerScenario[] {
  return Object.values(lessonVisualScenarioManifest).filter((scenario): scenario is InferenceSchedulerScenario => claimPipe(scenario, "inference-scheduler"));
}

describe("scenario walkthrough matrix", () => {
  it("carries calculationVersion v1 on every entry in the lesson visual scenario manifest", () => {
    for (const [lessonId, scenario] of Object.entries(lessonVisualScenarioManifest)) {
      expect(lessonIds.has(lessonId), `Manifest key ${lessonId} must be a real lesson id`).toBe(true);
      expect(scenario.calculationVersion, `${lessonId} scenario calculationVersion`).toBe("v1");
    }
    expect(Object.keys(lessonVisualScenarioManifest)).toHaveLength(lessons.length);
  });

  it("resolves every authored lesson scenario through getLessonVisualScenario", () => {
    let authored = 0;
    for (const lesson of lessons) {
      const scenario = getLessonVisualScenario(lesson.id);
      expect(scenario, `${lesson.id} scenario`).toEqual(lessonVisualScenarioManifest[lesson.id]);
      if (scenario) authored += 1;
    }
    expect(authored).toBe(Object.keys(lessonVisualScenarioManifest).length);
  });

  it("mirrors the snapshot gate: each lesson's sections reference its scenario engine", () => {
    for (const lesson of lessons) {
      const scenario = getLessonVisualScenario(lesson.id);
      if (!scenario) continue;
      const sectionVisuals = lesson.sections.map(({ visual }) => visual);
      expect(sectionVisuals).toContain(scenario.engine);
    }
  });

  it("keeps request-workbench pipeline fixtures resettable through a reserved 'none' failure option", () => {
    const pipelines = asPipelines();
    expect(pipelines.length).toBeGreaterThan(0);
    for (const pipeline of pipelines) {
      const noneOptions = pipeline.failureOptions.filter(({ id }) => id === "none");
      expect(noneOptions).toHaveLength(1);
      const stageIds = pipeline.stages.map(({ id }) => id);
      for (const option of pipeline.failureOptions) {
        if (option.id !== "none") expect(stageIds).toContain(option.id);
      }
    }
  });

  it("designs slice-threshold fixtures with mixed pass/fail outcomes so the threshold control changes the observable state", () => {
    const sliceThresholds = asSliceThresholds();
    expect(sliceThresholds.length).toBeGreaterThan(0);
    for (const scenario of sliceThresholds) {
      expect(scenario.slices.length).toBeGreaterThanOrEqual(2);
      const atDefault = scoreEvaluationSlices(scenario, scenario.defaultThreshold);
      expect(atDefault.passing).toBeGreaterThan(0);
      expect(atDefault.passing).toBeLessThan(atDefault.total);
      const atLoosest = scoreEvaluationSlices(scenario, 0.4);
      expect(atLoosest.passing).not.toBe(atDefault.passing);
    }
  });

  it("restores trust-boundary defaults that exist in the authored option lists", () => {
    const trustScenarios = asTrustScenarios();
    expect(trustScenarios.length).toBeGreaterThan(0);
    for (const scenario of trustScenarios) {
      expect(scenario.sources.map(({ id }) => id)).toContain(scenario.defaults.source);
      expect(scenario.actions.map(({ id }) => id)).toContain(scenario.defaults.action);
      expect(scenario.destinations.map(({ id }) => id)).toContain(scenario.defaults.destination);
      expect(scenario.evidenceCases.map(({ id }) => id)).toContain(scenario.defaults.evidenceCase);
    }
  });

  it("regenerates agent workflows from at least two distinct states that include the injected event's target", () => {
    const agentScenarios = asAgentScenarios();
    expect(agentScenarios.length).toBeGreaterThan(0);
    for (const scenario of agentScenarios) {
      expect(scenario.states.length).toBeGreaterThanOrEqual(2);
      const stateIds = scenario.states.map(({ id }) => id);
      expect(new Set(stateIds).size).toBe(stateIds.length);
      expect(stateIds).toContain(scenario.injectedEventAfterState);
    }
  });

  it("exercises production-tabletop fixtures only through their authored predictions and paths", () => {
    const tabletopScenarios = asTabletopScenarios();
    expect(tabletopScenarios.length).toBeGreaterThan(0);
    for (const scenario of tabletopScenarios) {
      if (scenario.kind === "decision-trace") {
        expect(scenario.options.length).toBeGreaterThanOrEqual(2);
        for (const option of scenario.options) {
          const predictionIds = option.predictions.map(({ id }) => id);
          expect(predictionIds).toContain(option.expectedPrediction);
          expect(option.transitions.length).toBeGreaterThanOrEqual(2);
        }
      }
      if (scenario.kind === "critical-path") {
        expect(scenario.firstTool.id).not.toBe(scenario.secondTool.id);
      }
    }
  });

  it("keeps attention defaults inside their authored candidate and token ranges", () => {
    const attentionScenarios = asAttentionScenarios();
    expect(attentionScenarios.length).toBeGreaterThan(0);
    for (const scenario of attentionScenarios) {
      if (scenario.kind === "token-sampling") {
        expect(scenario.candidates.length).toBeGreaterThanOrEqual(2);
        const tokens = scenario.candidates.map(({ token }) => token);
        expect(new Set(tokens).size).toBe(tokens.length);
      }
      if (scenario.kind === "attention-mechanism") {
        expect(scenario.tokens.length).toBeGreaterThanOrEqual(4);
        expect(scenario.defaultQueryIndex).toBeLessThan(scenario.tokens.length);
      }
    }
  });

  it("anchors retrieval defaults inside the chunk and evidence bounds", () => {
    const retrievalScenarios = asRetrievalScenarios();
    expect(retrievalScenarios.length).toBeGreaterThan(0);
    for (const scenario of retrievalScenarios) {
      expect(scenario.defaultChunkSize).toBeGreaterThanOrEqual(1);
      expect(scenario.defaultChunkSize).toBeLessThanOrEqual(5);
      expect(scenario.defaultTopK).toBeGreaterThan(0);
      expect(scenario.sentences.length).toBeGreaterThan(0);
    }
  });

  it("anchors inference-scheduler defaults inside the schema workloads", () => {
    const inferenceScenarios = asInferenceScenarios();
    expect(inferenceScenarios.length).toBeGreaterThan(0);
    for (const scenario of inferenceScenarios) {
      expect(scenario.defaultSequenceTokens).toBeGreaterThanOrEqual(512);
      expect(scenario.defaultSequenceTokens).toBeLessThanOrEqual(16_384);
      expect(scenario.defaultActiveSequences).toBeGreaterThanOrEqual(1);
      expect(scenario.defaultActiveSequences).toBeLessThanOrEqual(8);
      expect(scenario.defaultBatchSize).toBeGreaterThanOrEqual(1);
      expect(scenario.defaultBatchSize).toBeLessThanOrEqual(12);
      expect(scenario.defaultConcurrency).toBeGreaterThanOrEqual(1);
      expect(scenario.defaultConcurrency).toBeLessThanOrEqual(16);
    }
  });
});
