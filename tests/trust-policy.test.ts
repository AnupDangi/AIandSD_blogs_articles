import { describe, expect, it } from "vitest";
import { evaluateToyTrustPolicy } from "@/lib/trust-policy";

describe("trust-boundary visual policy", () => {
  it("does not let a retrieved document authorize an action even with both gates enabled", () => {
    expect(evaluateToyTrustPolicy({
      source: "document",
      action: "read-public-guide",
      destination: "operations-guide",
      approval: true,
      evidenceVerified: true,
    })).toEqual({
      allowed: false,
      reason: "Retrieved text is untrusted data and cannot authorize an action.",
    });
  });

  it("keeps a forbidden customer-data export blocked despite approval and evidence", () => {
    expect(evaluateToyTrustPolicy({
      source: "system",
      action: "export-customer-records",
      destination: "customer-records",
      approval: true,
      evidenceVerified: true,
    }).allowed).toBe(false);
  });

  it("allows a user-requested public-guide read only after approval and evidence checks", () => {
    expect(evaluateToyTrustPolicy({
      source: "user",
      action: "read-public-guide",
      destination: "operations-guide",
      approval: true,
      evidenceVerified: true,
    }).allowed).toBe(true);
    expect(evaluateToyTrustPolicy({
      source: "user",
      action: "read-public-guide",
      destination: "operations-guide",
      approval: false,
      evidenceVerified: true,
    }).allowed).toBe(false);
  });

  it("denies a changed destination even when approval and evidence remain present", () => {
    expect(evaluateToyTrustPolicy({
      source: "user",
      action: "read-public-guide",
      destination: "external-email",
      approval: true,
      evidenceVerified: true,
    })).toEqual({
      allowed: false,
      reason: "The public-guide action cannot access this destination or data scope.",
    });
  });
});
