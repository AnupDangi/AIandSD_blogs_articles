type PublicQuestion = {
  id: string;
  lessonId: string;
  choices: readonly { id: string; text: string }[];
};

type AuthoredHint = {
  id: string;
  level: number;
  text: string;
  misconceptionTags: readonly string[];
};

type HintPack = {
  lessonId: string;
  levels: readonly AuthoredHint[];
};

function tokens(value: string): string[] {
  return value.normalize("NFKC").toLocaleLowerCase("en").match(/[\p{L}\p{N}]+/gu) ?? [];
}

function containsPhrase(haystack: readonly string[], needle: readonly string[]): boolean {
  if (needle.length === 0 || needle.length > haystack.length) return false;
  for (let start = 0; start <= haystack.length - needle.length; start += 1) {
    if (needle.every((token, offset) => haystack[start + offset] === token)) return true;
  }
  return false;
}

function tagSet(tags: readonly string[]): string[] {
  return [...new Set(tags.map((tag) => tokens(tag).join(" ")).filter(Boolean))].sort();
}

/** Reject accidental answer disclosure and non-distinct approved hint alternatives before import. */
export function assertAuthoredHintPacksAreSafe(
  questions: readonly PublicQuestion[],
  answerKeys: ReadonlyMap<string, string>,
  hintPacks: readonly HintPack[],
): void {
  const packsByLesson = new Map(hintPacks.map((pack) => [pack.lessonId, pack]));

  for (const pack of hintPacks) {
    const hintsById = new Map(pack.levels.map((hint) => [hint.id, hint]));
    for (const hint of pack.levels) {
      if (tagSet(hint.misconceptionTags).length === 0) {
        throw new Error(`Protected hint is missing a meaningful misconception tag: ${hint.id}.`);
      }
      if (tagSet(hint.misconceptionTags).length !== hint.misconceptionTags.length) {
        throw new Error(`Protected hint contains duplicate or empty misconception tags: ${hint.id}.`);
      }

      if (!hint.id.endsWith("-alternate")) continue;
      const primaryId = hint.id.slice(0, -"-alternate".length);
      const primary = hintsById.get(primaryId);
      if (!primary || primary.level !== hint.level) {
        throw new Error(`Protected alternate hint has no matching primary at the same level: ${hint.id}.`);
      }
      const primaryTags = tagSet(primary.misconceptionTags);
      const alternateTags = tagSet(hint.misconceptionTags);
      if (primaryTags.length === alternateTags.length && primaryTags.every((tag, index) => tag === alternateTags[index])) {
        throw new Error(`Protected alternate hint must target a different misconception: ${hint.id}.`);
      }
    }
  }

  for (const question of questions) {
    const correctChoiceId = answerKeys.get(question.id);
    const correctChoice = question.choices.find((choice) => choice.id === correctChoiceId);
    const pack = packsByLesson.get(question.lessonId);
    if (!correctChoice || !pack) {
      throw new Error(`Protected hint safety check is missing a keyed question or lesson pack: ${question.id}.`);
    }

    const answerTokens = tokens(correctChoice.text);
    const answerWindows = answerTokens.length >= 8
      ? Array.from({ length: answerTokens.length - 7 }, (_, start) => answerTokens.slice(start, start + 8))
      : [answerTokens];

    for (const hint of pack.levels) {
      const hintTokens = tokens(hint.text);
      if (answerWindows.some((phrase) => containsPhrase(hintTokens, phrase))) {
        throw new Error(`Protected hint repeats a keyed answer option or long answer phrase: ${question.id}/${hint.id}.`);
      }
    }
  }
}
