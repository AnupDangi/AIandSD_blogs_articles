import { afterEach, describe, expect, it, vi } from "vitest";
import { actualTutorCostMicros, MONTHLY_AI_CAP_MICROS, reservedTutorCostMicros, tutorReservationDenial, tutorUsageSettlement, utcBillingPeriod } from "../src/lib/server/ai-budget";
import { getTutorConfig, sanitizeObservation, selectAuthoredHint, type TutorCandidate } from "../src/lib/server/ai-tutor";

describe("tutor budget arithmetic", () => {
  it("reserves the maximum bounded input and output at the pinned model rates", () => {
    expect(reservedTutorCostMicros()).toBe((16_000 + 4_096) * 2 + 128 * 12);
  });

  it("reconciles billed input and output tokens in micro-dollars", () => {
    expect(actualTutorCostMicros({ inputTokens: 1_500_000, outputTokens: 20_000 })).toBe(3_000_000 + 240_000);
  });

  it("uses UTC day and month boundaries", () => {
    expect(utcBillingPeriod(new Date("2026-01-01T00:30:00+05:30"))).toEqual({
      month: "2025-12",
      day: new Date("2025-12-31T00:00:00.000Z"),
    });
  });

  it("denies first-use reservations that exceed the configured daily or monthly cap", () => {
    const reserve = reservedTutorCostMicros();
    expect(tutorReservationDenial(0, 30_000_000, reserve)).toBe("daily_limit");
    expect(tutorReservationDenial(10, reserve - 1, reserve)).toBe("monthly_limit");
    expect(tutorReservationDenial(10, reserve, reserve)).toBeNull();
  });

  it("prices OpenRouter calls from provider-reported USD usage", () => {
    expect(actualTutorCostMicros({ inputTokens: 100, outputTokens: 10, costMicros: 321 })).toBe(321);
  });

  it("accounts for costs above the reservation and saturates at the monthly cap", () => {
    expect(tutorUsageSettlement(reservedTutorCostMicros() + 100)).toEqual({
      accountingMicros: reservedTutorCostMicros() + 100, status: "settled",
    });
    expect(tutorUsageSettlement(MONTHLY_AI_CAP_MICROS + 1)).toEqual({
      accountingMicros: MONTHLY_AI_CAP_MICROS, status: "retained",
    });
  });
});

describe("bounded hint selection", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("redacts secrets and personal data from learner observations", () => {
    const result = sanitizeObservation("Bearer abc.def sk-very_secret_123456 user@example.com\nTry again");
    expect(result).not.toContain("abc.def");
    expect(result).not.toContain("sk-very_secret_123456");
    expect(result).not.toContain("user@example.com");
    expect(result).toContain("[redacted email]");
    expect(sanitizeObservation("x".repeat(900))).toHaveLength(600);
  });

  it("uses the pinned OpenRouter model only when no direct OpenAI key is configured", () => {
    expect(getTutorConfig({ OPENROUTER_API_KEY: "router-key" })).toEqual({
      provider: "openrouter", apiKey: "router-key", model: "openai/gpt-5.6-terra",
    });
    expect(getTutorConfig({ OPENAI_API_KEY: "openai-key", OPENROUTER_API_KEY: "router-key" })).toEqual({
      provider: "openai", apiKey: "openai-key", model: "gpt-5.6-terra",
    });
    expect(getTutorConfig({ OPENROUTER_API_KEY: "router-key", OPENROUTER_MODEL: "some/other-model" })).toBeNull();
  });

  it("sends only eligible hint IDs and returns an approved ID, never model prose", async () => {
    let requestBody = "";
    const authoredHintText = "Authored hint: compare lexical and semantic rankings before fusion.";
    const candidates = [
      { id: "hint-1", level: 2, misconceptionTags: ["recall"], text: authoredHintText },
      { id: "hint-2", level: 2, misconceptionTags: ["ranking"], text: authoredHintText },
    ] as unknown as TutorCandidate[];
    vi.stubGlobal("fetch", vi.fn(async (_input: RequestInfo | URL, init?: RequestInit) => {
      requestBody = String(init?.body ?? "");
      return new Response(JSON.stringify({
        id: "resp-test",
        usage: { input_tokens: 21, output_tokens: 5 },
        output: [{ content: [{ type: "output_text", text: JSON.stringify({ hint_id: "hint-2" }) }] }],
      }), { status: 200, headers: { "content-type": "application/json" } });
    }));

    const result = await selectAuthoredHint({
      apiKey: "test-key",
      model: "gpt-5.6-terra",
      taskKey: "ai-09",
      level: 2,
      sectionContext: {
        lessonTitle: "Hybrid retrieval",
        sectionTitle: "Measure retrieval quality",
        sectionSummary: "Compare the ranking against labeled relevant documents.",
        activity: "retrieval-quality-lab",
      },
      observation: "I changed top-k and the ranking moved.",
      candidates,
      maxRequestBytes: 16_000,
    });

    expect(result).toEqual({ selectedId: "hint-2", usage: { inputTokens: 21, outputTokens: 5, providerRequestId: "resp-test" } });
    expect(requestBody).toContain("hint-1");
    expect(requestBody).toContain("hint-2");
    const learnerContext = JSON.parse(requestBody).input[1].content[0].text as string;
    expect(learnerContext).toContain('"section_title":"Measure retrieval quality"');
    expect(learnerContext).toContain('"section_summary":"Compare the ranking against labeled relevant documents."');
    expect(requestBody).not.toContain("answerKey");
    expect(requestBody).not.toContain(authoredHintText);
  });

  it("rejects an ID outside the eligible allowlist", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify({
      usage: { input_tokens: 10, output_tokens: 2 },
      output: [{ content: [{ type: "output_text", text: JSON.stringify({ hint_id: "not-eligible" }) }] }],
    }), { status: 200 })));

    const result = await selectAuthoredHint({
      apiKey: "test-key", model: "gpt-5.6-terra", taskKey: "ai-01", level: 1,
      sectionContext: { lessonTitle: "Foundations", sectionTitle: "Practice", sectionSummary: "Use a fixture.", activity: "lab" },
      observation: "", candidates: [{ id: "approved-1", level: 1, misconceptionTags: [] }], maxRequestBytes: 16_000,
    });
    expect(result.selectedId).toBeNull();
    expect(result.usage?.inputTokens).toBe(10);
  });

  it("uses OpenRouter structured output with a price ceiling and exact cost reporting", async () => {
    let requestBody: Record<string, unknown> = {};
    let requestUrl = "";
    vi.stubGlobal("fetch", vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      requestUrl = String(input);
      requestBody = JSON.parse(String(init?.body ?? "{}")) as Record<string, unknown>;
      return new Response(JSON.stringify({
        id: "gen-safe",
        usage: { prompt_tokens: 29, completion_tokens: 4, cost: 0.000038001 },
        choices: [{ message: { content: JSON.stringify({ hint_id: "hint-1" }) } }],
      }), { status: 200, headers: { "content-type": "application/json" } });
    }));

    const result = await selectAuthoredHint({
      apiKey: "router-test-key", provider: "openrouter", model: "openai/gpt-5.6-terra",
      taskKey: "ai-09", level: 2,
      sectionContext: { lessonTitle: "Hybrid retrieval", sectionTitle: "Measure retrieval quality", sectionSummary: "Compare the ranking against labeled relevant documents.", activity: "retrieval-quality-lab" },
      observation: "I changed top-k and the ranking moved.",
      candidates: [{ id: "hint-1", level: 2, misconceptionTags: ["ranking"] }],
      maxRequestBytes: 16_000,
    });

    expect(requestUrl).toBe("https://openrouter.ai/api/v1/chat/completions");
    expect(requestBody.model).toBe("openai/gpt-5.6-terra");
    expect(requestBody.max_completion_tokens).toBe(128);
    expect(requestBody.provider).toEqual({ require_parameters: true, max_price: { prompt: 2, completion: 12 } });
    expect(result).toEqual({ selectedId: "hint-1", usage: { inputTokens: 29, outputTokens: 4, providerRequestId: "gen-safe", costMicros: 39 } });
  });
});
