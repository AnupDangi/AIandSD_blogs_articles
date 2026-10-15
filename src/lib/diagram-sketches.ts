import manifest from "../../curriculum/diagram-sketches.json";

/** One authored architecture variant. Everything here is fixed local text; nothing is generated. */
export type DiagramOption = { id: string; label: string; summary: string; nodes: string[]; edges: string[]; default?: boolean };
export type DiagramSketch = { title: string; intro: string; options: DiagramOption[] };

export const diagramSketchManifest = manifest as Record<string, DiagramSketch>;

export function getDiagramSketch(lessonId: string): DiagramSketch | null {
  return Object.hasOwn(diagramSketchManifest, lessonId) ? diagramSketchManifest[lessonId] : null;
}

export const DIAGRAM_LIMITS = { minOptions: 2, maxOptions: 4, minNodes: 3, maxNodes: 7, maxLabel: 64, maxSummary: 140 } as const;

/** Returns human-readable problems; an empty list means the sketch is safe to render. */
export function validateDiagramSketch(lessonId: string, sketch: DiagramSketch): string[] {
  const problems: string[] = [];
  const at = (text: string) => `${lessonId}: ${text}`;
  const forbidden = /[–—<>]/;
  if (!sketch.title.trim() || forbidden.test(sketch.title)) problems.push(at("title is empty or has a dash or markup character"));
  if (!sketch.intro.trim() || forbidden.test(sketch.intro)) problems.push(at("intro is empty or has a dash or markup character"));
  if (sketch.options.length < DIAGRAM_LIMITS.minOptions || sketch.options.length > DIAGRAM_LIMITS.maxOptions) problems.push(at(`needs ${DIAGRAM_LIMITS.minOptions} to ${DIAGRAM_LIMITS.maxOptions} options`));
  const ids = new Set<string>();
  if (sketch.options.filter((option) => option.default).length > 1) problems.push(at("more than one default option"));
  for (const option of sketch.options) {
    const where = `${lessonId}/${option.id}`;
    if (!/^[a-z][a-z0-9-]*$/.test(option.id) || ids.has(option.id)) problems.push(`${where}: id must be unique kebab-case`);
    ids.add(option.id);
    if (!option.label.trim() || option.label.length > DIAGRAM_LIMITS.maxLabel) problems.push(`${where}: label length`);
    if (!option.summary.trim() || option.summary.length > DIAGRAM_LIMITS.maxSummary || !/[.]$/.test(option.summary)) problems.push(`${where}: summary must be one sentence under ${DIAGRAM_LIMITS.maxSummary} characters ending in a period`);
    if (option.nodes.length < DIAGRAM_LIMITS.minNodes || option.nodes.length > DIAGRAM_LIMITS.maxNodes) problems.push(`${where}: needs ${DIAGRAM_LIMITS.minNodes} to ${DIAGRAM_LIMITS.maxNodes} steps`);
    if (option.edges.length !== option.nodes.length - 1) problems.push(`${where}: needs exactly one transition between consecutive steps`);
    for (const text of [option.label, option.summary, ...option.nodes, ...option.edges]) {
      if (forbidden.test(text)) problems.push(`${where}: "${text}" has a dash or markup character`);
      if (!text.trim()) problems.push(`${where}: empty text`);
    }
    for (const node of option.nodes) if (node.length > 44) problems.push(`${where}: step "${node}" is too long to fit the sketch`);
  }
  return problems;
}
