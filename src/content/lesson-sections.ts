/** Split the authored chapter into concept, worked-case, and build sections for the lesson workspace. */
export function splitLessonDraft(markdown: string | null): [string, string, string] {
  const sections: [string[], string[], string[]] = [[], [], []];
  if (!markdown) return ["", "", ""];

  const blocks: string[] = [];
  let current: string[] = [];
  let fence: string | null = null;
  for (const line of markdown.split(/\r?\n/)) {
    const fenceMatch = line.match(/^\s*(```+|~~~+)/);
    const startsSection = !fence && /^##\s/.test(line);
    if (startsSection && current.length) {
      blocks.push(current.join("\n"));
      current = [];
    }
    current.push(line);
    if (fenceMatch) {
      const marker = fenceMatch[1][0];
      fence = fence === marker ? null : fence ?? marker;
    }
  }
  if (current.length) blocks.push(current.join("\n"));

  for (const block of blocks) {
    const heading = block.match(/^##\s+(.+)$/m)?.[1]?.trim().toLowerCase() ?? "";
    let section = 0;
    if (heading.startsWith("worked example") || heading.startsWith("worked numerical") || heading.startsWith("implementation sketch") || heading.startsWith("what to measure") || heading.startsWith("failure modes") || heading.startsWith("failure review")) {
      section = 1;
    } else if (/^(practice|build|lab|course project|project milestone|checkpoint|assessment|quiz|try it)/.test(heading)) {
      section = 2;
    }
    sections[section].push(block.trim());
  }

  return sections.map((parts) => parts.filter(Boolean).join("\n\n")) as [string, string, string];
}
