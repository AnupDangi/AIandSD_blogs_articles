import manifest from "../../curriculum/visual-scenarios.json";
import type { RetrievalVisualScenario } from "@/content/visual-scenario-types";

export type RetrievalScenario = RetrievalVisualScenario;

const scenarios = manifest as Record<string, RetrievalScenario>;

export function getRetrievalScenario(lessonId?: string): RetrievalScenario {
  if (!lessonId) return scenarios["ai-11"];
  return scenarios[lessonId] ?? scenarios["ai-11"];
}

export const retrievalScenarioManifest = scenarios;
