"use client";

import dynamic from "next/dynamic";
import type { AttentionScenario } from "@/content/visual-scenario-types";
import scenarios from "../../curriculum/attention-scenarios.json";

const AttentionLab = dynamic(() => import("@/components/attention-lab").then((module) => module.AttentionLab));
const tokenScenario = scenarios["ai-02"] as AttentionScenario;

/** The public landing page uses the same deterministic fixture as the lesson. */
export function DiscoveryLab() {
  return <AttentionLab initialMode="tokens" scenario={tokenScenario} />;
}
