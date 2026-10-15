import { describe, expect, it } from "vitest";
import { lessons } from "../src/content/applied-ai";
import { diagramSketchManifest, getDiagramSketch, validateDiagramSketch } from "../src/lib/diagram-sketches";

describe("diagram sketch manifest", () => {
  it("only targets real lessons and every sketch passes validation", () => {
    const lessonIds = new Set(lessons.map((lesson) => lesson.id));
    for (const [lessonId, sketch] of Object.entries(diagramSketchManifest)) {
      expect(lessonIds.has(lessonId), lessonId).toBe(true);
      expect(validateDiagramSketch(lessonId, sketch), lessonId).toEqual([]);
    }
  });
  it("keeps the Chapter 40 pilot content and default unchanged", () => {
    const sketch = getDiagramSketch("ai-40")!;
    expect(sketch.title).toBe("Where does the workflow state live?");
    expect(sketch.options.map((option) => option.id)).toEqual(["memory", "durable", "stateless"]);
    expect(sketch.options.find((option) => option.default)?.id).toBe("durable");
    expect(sketch.options.every((option) => option.nodes.length === 5)).toBe(true);
  });
  it("returns null for lessons without a sketch and ignores prototype keys", () => {
    expect(getDiagramSketch("ai-01")).toBeNull();
    expect(getDiagramSketch("constructor")).toBeNull();
    expect(getDiagramSketch("__proto__")).toBeNull();
  });
  it("rejects dashes, mismatched transitions, duplicate ids and oversize text", () => {
    const base = { title: "A question?", intro: "An intro.", options: [
      { id: "one", label: "First", summary: "Fine.", nodes: ["a", "b", "c"], edges: ["x", "y"] },
      { id: "two", label: "Second", summary: "Fine.", nodes: ["a", "b", "c"], edges: ["x", "y"] },
    ] };
    expect(validateDiagramSketch("t", base)).toEqual([]);
    expect(validateDiagramSketch("t", { ...base, title: "A — B" }).length).toBeGreaterThan(0);
    expect(validateDiagramSketch("t", { ...base, options: [base.options[0], { ...base.options[1], edges: ["x"] }] }).join()).toMatch(/transition/);
    expect(validateDiagramSketch("t", { ...base, options: [base.options[0], { ...base.options[1], id: "one" }] }).join()).toMatch(/unique/);
    expect(validateDiagramSketch("t", { ...base, options: [base.options[0], { ...base.options[1], nodes: ["a", "b", "x".repeat(50)] }] }).join()).toMatch(/too long/);
    expect(validateDiagramSketch("t", { ...base, options: [base.options[0]] }).join()).toMatch(/options/);
  });
});
