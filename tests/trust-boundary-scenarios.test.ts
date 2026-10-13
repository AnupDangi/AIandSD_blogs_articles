import { describe, expect, it } from "vitest";
import { lessons } from "@/content/catalog";
import { evaluateToyTrustPolicy, evaluateTrustBoundaryCase } from "@/lib/trust-policy";
import { getLessonVisualScenario, trustBoundaryScenarioManifest, validateTrustBoundaryScenarioManifest } from "@/lib/visual-scenarios";

describe("lesson-specific trust-boundary scenarios", () => {
  it("maps a unique authored scenario to every trust-boundary lesson", () => {
    const assigned = lessons.filter((lesson) => lesson.sections.some((section) => section.visual === "trust-boundary-sandbox"));
    expect(Object.keys(trustBoundaryScenarioManifest).sort()).toEqual(assigned.map(({ id }) => id).sort());
    expect(new Set(Object.values(trustBoundaryScenarioManifest).map(({ title }) => title)).size).toBe(assigned.length);
    for (const lesson of assigned) expect(getLessonVisualScenario(lesson.id)).toEqual(trustBoundaryScenarioManifest[lesson.id]);
  });

  it("starts each lesson at the decision its walkthrough asks learners to inspect", () => {
    const cases = Object.entries(trustBoundaryScenarioManifest).map(([id, scenario]) => {
      const source = scenario.sources.find(({ id: option }) => option === scenario.defaults.source)!;
      const action = scenario.actions.find(({ id: option }) => option === scenario.defaults.action)!;
      const destination = scenario.destinations.find(({ id: option }) => option === scenario.defaults.destination)!;
      const evidence = scenario.evidenceCases.find(({ id: option }) => option === scenario.defaults.evidenceCase)!;
      return { id, scenario, source, action, destination, evidence };
    });

    expect(cases.map(({ scenario }) => scenario.focus)).toEqual(["containment", "approval", "provenance", "injection"]);
    expect(cases.map(({ source, action, destination, evidence }) => evaluateToyTrustPolicy({
      source: source.id,
      action: action.id,
      destination: destination.id,
      approval: false,
      evidenceVerified: evidence.verified,
    }).reason)).toEqual([
      "The policy forbids exporting customer records, even with approval.",
      "This user-requested action requires human approval.",
      "The action has no verified evidence within its allowed scope.",
      "The policy forbids exporting customer records, even with approval.",
    ]);
    expect(evaluateToyTrustPolicy({ source: "document", action: "read-public-guide", destination: "operations-guide", approval: true, evidenceVerified: true }).reason)
      .toBe("Retrieved text is untrusted data and cannot authorize an action.");
  });

  it("rejects scenario defaults that are not represented in their controls", () => {
    const fixture = trustBoundaryScenarioManifest["ai-32"];
    expect(() => validateTrustBoundaryScenarioManifest({ "ai-32": { ...fixture, defaults: { ...fixture.defaults, source: "system" } } })).toThrow();
  });

  it("rejects evidence that references controls the scenario does not offer", () => {
    const fixture = trustBoundaryScenarioManifest["ai-31"];
    const readOnlyScenario = {
      ...fixture,
      actions: fixture.actions.filter(({ id }) => id === "read-public-guide"),
      evidenceCases: fixture.evidenceCases.map((evidence) => ({ ...evidence, action: "export-customer-records" as const })),
      defaults: { ...fixture.defaults, action: "read-public-guide" as const },
    };
    expect(() => validateTrustBoundaryScenarioManifest({ "ai-31": readOnlyScenario })).toThrow();
  });

  it("does not treat an untrusted document's approval claim as verified evidence", () => {
    const scenario = trustBoundaryScenarioManifest["ai-31"];
    const claimed = scenario.evidenceCases.find(({ id }) => id === "claimed")!;
    expect(claimed.verified).toBe(false);
    const missing = scenario.evidenceCases.find(({ id }) => id === "missing")!;
    expect(missing.action).toBe(scenario.defaults.action);
    expect(missing.destination).toBe(scenario.defaults.destination);
    expect(missing.verified).toBe(false);
    expect(evaluateToyTrustPolicy({
      source: "user",
      action: "read-public-guide",
      destination: "operations-guide",
      approval: true,
      evidenceVerified: claimed.verified,
    })).toEqual({ allowed: false, reason: "The action has no verified evidence within its allowed scope." });
  });

  it("keeps verified evidence bound to the action and destination it supports", () => {
    const scenario = trustBoundaryScenarioManifest["ai-32"];
    const changedAction = evaluateTrustBoundaryCase(scenario, {
      source: "user",
      action: "export-customer-records",
      destination: "operations-guide",
      evidenceCaseId: "supporting",
      approval: true,
    });
    expect(changedAction.evidenceScopeMatches).toBe(false);
    expect(changedAction.evidenceVerified).toBe(false);
    expect(changedAction.decision.allowed).toBe(false);

    const changedDestination = evaluateTrustBoundaryCase(scenario, {
      source: "user",
      action: "read-public-guide",
      destination: "external-email",
      evidenceCaseId: "supporting",
      approval: true,
    });
    expect(changedDestination.evidenceScopeMatches).toBe(false);
    expect(changedDestination.evidenceVerified).toBe(false);
  });
});
