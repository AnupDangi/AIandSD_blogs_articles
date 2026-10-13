import { describe, expect, it } from "vitest";
import { assertAuthoredHintPacksAreSafe } from "@/../prisma/assessment-hint-safety";

const questions = [{
  id: "q1",
  lessonId: "lesson-1",
  choices: [
    { id: "a", text: "Compare the retrieved evidence with the expected source before answering" },
    { id: "b", text: "Try another prompt" },
  ],
}];
const answerKeys = new Map([["q1", "a"]]);

function hintPacks(text: string, alternateTags = ["different-diagnosis"]) {
  return [{
    lessonId: "lesson-1",
    levels: [1, 2, 3].flatMap((level) => [
      { id: `lesson-1-hint-${level}`, level, text, misconceptionTags: [`diagnosis-${level}`] },
      { id: `lesson-1-hint-${level}-alternate`, level, text: "Inspect a different observable boundary before retrying.", misconceptionTags: alternateTags },
    ]),
  }];
}

describe("protected authored hint safety", () => {
  it("rejects a hint that repeats a complete keyed choice", () => {
    expect(() => assertAuthoredHintPacksAreSafe(
      questions,
      answerKeys,
      hintPacks("Compare the retrieved evidence with the expected source before answering."),
    )).toThrow(/repeats a keyed answer option/);
  });

  it("rejects a long exact phrase copied from a keyed choice", () => {
    expect(() => assertAuthoredHintPacksAreSafe(
      questions,
      answerKeys,
      hintPacks("A useful check is to compare the retrieved evidence with the expected source before answering the caller."),
    )).toThrow(/repeats a keyed answer option/);
  });

  it("allows a conceptual hint that does not disclose the keyed option", () => {
    expect(() => assertAuthoredHintPacksAreSafe(
      questions,
      answerKeys,
      hintPacks("Record which stage failed and compare its observable output with the fixture expectation."),
    )).not.toThrow();
  });

  it("requires distinct misconception tags for each approved alternate pair", () => {
    expect(() => assertAuthoredHintPacksAreSafe(
      questions,
      answerKeys,
      hintPacks("Inspect the measured result and isolate one changing input.", ["diagnosis-1"]),
    )).toThrow(/alternate hint must target a different misconception/);
  });

  it("requires each protected hint to carry a nonempty misconception tag", () => {
    const packs = hintPacks("Inspect the measured result and isolate one changing input.");
    packs[0].levels[0].misconceptionTags = ["   "];
    expect(() => assertAuthoredHintPacksAreSafe(questions, answerKeys, packs)).toThrow(/meaningful misconception tag/);
  });
});
