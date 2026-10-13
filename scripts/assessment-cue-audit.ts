import { readFileSync } from "node:fs";
import { questions } from "../src/content/applied-ai";

type PrivateKey = { questionId: string; correctChoiceId: string };

const privatePath = "curriculum/private/assessment-keys.json";
const privateBundle = JSON.parse(readFileSync(privatePath, "utf8")) as { keys?: PrivateKey[] };
if (!Array.isArray(privateBundle.keys)) throw new Error("Private assessment key bundle is invalid");

const correctIds = new Map(privateBundle.keys.map(({ questionId, correctChoiceId }) => [questionId, correctChoiceId]));
if (correctIds.size !== questions.length) throw new Error("Question and private-key counts do not match");

const metrics = new Map<string, {
  total: number;
  uniqueLongest: number;
  tiedLongest: number;
  middle: number;
  tiedShortest: number;
  uniqueShortest: number;
  withinTen: number;
}>();
for (const question of questions) {
  const key = correctIds.get(question.id);
  const correctChoice = question.choices.find(({ id }) => id === key);
  if (!correctChoice) throw new Error("A private key does not map to a public choice");
  const lengths = question.choices.map(({ text }) => text.length);
  const maxLength = Math.max(...lengths);
  const correctLength = correctChoice.text.length;
  const minLength = Math.min(...lengths);
  const longestCount = lengths.filter((length) => length === maxLength).length;
  const shortestCount = lengths.filter((length) => length === minLength).length;
  const group = metrics.get(question.kind) ?? {
    total: 0, uniqueLongest: 0, tiedLongest: 0, middle: 0, tiedShortest: 0, uniqueShortest: 0, withinTen: 0,
  };
  group.total += 1;
  if (correctLength === maxLength && longestCount === 1) group.uniqueLongest += 1;
  else if (correctLength === maxLength) group.tiedLongest += 1;
  else if (correctLength === minLength && shortestCount === 1) group.uniqueShortest += 1;
  else if (correctLength === minLength) group.tiedShortest += 1;
  else group.middle += 1;
  if (maxLength - correctLength <= 10) group.withinTen += 1;
  metrics.set(question.kind, group);
}

for (const [kind, group] of [...metrics].sort(([left], [right]) => left.localeCompare(right))) {
  console.log(`${kind}: n=${group.total}; uniquely-longest=${group.uniqueLongest}; tied-longest=${group.tiedLongest}; middle=${group.middle}; tied-shortest=${group.tiedShortest}; uniquely-shortest=${group.uniqueShortest}; within-10-of-longest=${group.withinTen}`);
}
