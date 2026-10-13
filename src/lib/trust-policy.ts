import type { TrustBoundaryScenario } from "@/content/visual-scenario-types";

export type TrustInstructionSource = "system" | "user" | "document";
export type TrustAction = "read-public-guide" | "export-customer-records";
export type TrustDestination = "operations-guide" | "external-email" | "customer-records";

/**
 * Small teaching policy for the trust-boundary visual. Approval and evidence
 * cannot override the hard policy against exporting customer records, and
 * retrieved document text can never authorize a tool action by itself.
 */
export function evaluateToyTrustPolicy(input: {
  source: TrustInstructionSource;
  action: TrustAction;
  destination: TrustDestination;
  approval: boolean;
  evidenceVerified: boolean;
}): { allowed: boolean; reason: string } {
  if (input.action === "export-customer-records") {
    return { allowed: false, reason: "The policy forbids exporting customer records, even with approval." };
  }
  if (input.destination !== "operations-guide") {
    return { allowed: false, reason: "The public-guide action cannot access this destination or data scope." };
  }
  if (input.source === "document") {
    return { allowed: false, reason: "Retrieved text is untrusted data and cannot authorize an action." };
  }
  if (!input.evidenceVerified) {
    return { allowed: false, reason: "The action has no verified evidence within its allowed scope." };
  }
  if (input.source === "user" && !input.approval) {
    return { allowed: false, reason: "This user-requested action requires human approval." };
  }
  return { allowed: true, reason: "The public guide is in scope and the action passed the required checks." };
}

export function evaluateTrustBoundaryCase(
  scenario: TrustBoundaryScenario,
  input: { source: TrustInstructionSource; action: TrustAction; destination: TrustDestination; evidenceCaseId: string; approval: boolean },
) {
  const evidence = scenario.evidenceCases.find(({ id }) => id === input.evidenceCaseId) ?? scenario.evidenceCases[0];
  const evidenceScopeMatches = evidence.action === input.action && evidence.destination === input.destination;
  const evidenceVerified = evidence.verified && evidenceScopeMatches;
  const decision = evaluateToyTrustPolicy({ ...input, evidenceVerified });
  return { evidence, evidenceScopeMatches, evidenceVerified, decision };
}
