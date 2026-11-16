/**
 * Validation helpers for the shared vocabulary catalog.
 * Keep this module independent from battle and save state.
 */

export const WORD_PARTS_OF_SPEECH = Object.freeze([
  "noun",
  "verb",
  "adjective",
  "adverb",
  "preposition",
  "conjunction",
  "pronoun",
  "determiner",
  "interjection",
  "other",
]);

const ALLOWED_FIELDS = new Set([
  "id",
  "japanese",
  "word",
  "difficulty",
  "partOfSpeech",
  "alternateMeanings",
]);

function isRecord(value) {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}

/**
 * Check word records before they are added to src/data/words.js.
 * Duplicate spellings across different parts of speech are warnings because
 * legitimate headwords can have more than one grammatical use.
 */
export function validateWordCatalog(catalog) {
  const errors = [];
  const warnings = [];
  const byDifficulty = Object.fromEntries(
    [1, 2, 3, 4, 5, 6].map((level) => [level, 0]),
  );
  const byPartOfSpeech = Object.fromEntries(
    WORD_PARTS_OF_SPEECH.map((part) => [part, 0]),
  );
  const byLength = {};
  const ids = new Map();
  const wordParts = new Map();

  if (!Array.isArray(catalog)) {
    return {
      valid: false,
      errors: ["単語一覧は配列で指定してください。"],
      warnings,
      stats: { total: 0, byDifficulty, byPartOfSpeech, byLength },
    };
  }

  catalog.forEach((entry, index) => {
    const prefix = `[${index}]`;
    if (!isRecord(entry)) {
      errors.push(`${prefix} 単語データはオブジェクトで指定してください。`);
      return;
    }

    for (const field of Object.keys(entry)) {
      if (!ALLOWED_FIELDS.has(field)) {
        errors.push(`${prefix} 未対応の項目「${field}」があります。`);
      }
    }

    if (typeof entry.id !== "string" ||
        !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(entry.id)) {
      errors.push(`${prefix} IDは小文字英数字とハイフンで指定してください。`);
    } else if (ids.has(entry.id)) {
      errors.push(`${prefix} ID「${entry.id}」が重複しています。`);
    } else {
      ids.set(entry.id, index);
    }

    if (typeof entry.japanese !== "string" || entry.japanese.trim().length === 0) {
      errors.push(`${prefix} 日本語の意味が空です。`);
    }

    if (typeof entry.word !== "string" || !/^[A-Z]+$/.test(entry.word)) {
      errors.push(`${prefix} 英単語は大文字の英字のみで指定してください。`);
    } else {
      byLength[entry.word.length] = (byLength[entry.word.length] ?? 0) + 1;
    }

    if (!Number.isInteger(entry.difficulty) ||
        entry.difficulty < 1 || entry.difficulty > 6) {
      errors.push(`${prefix} 難易度は1〜6の整数で指定してください。`);
    } else {
      byDifficulty[entry.difficulty] += 1;
    }

    if (!WORD_PARTS_OF_SPEECH.includes(entry.partOfSpeech)) {
      errors.push(`${prefix} 品詞「${entry.partOfSpeech ?? ""}」は登録されていません。`);
    } else {
      byPartOfSpeech[entry.partOfSpeech] += 1;
    }

    if (entry.alternateMeanings !== undefined) {
      if (!Array.isArray(entry.alternateMeanings) ||
          entry.alternateMeanings.some((meaning) =>
            typeof meaning !== "string" || meaning.trim().length === 0)) {
        errors.push(`${prefix} alternateMeaningsは空でない日本語文字列の配列にしてください。`);
      } else {
        const normalized = entry.alternateMeanings.map((meaning) => meaning.trim());
        if (new Set(normalized).size !== normalized.length ||
            (typeof entry.japanese === "string" && normalized.includes(entry.japanese.trim()))) {
          errors.push(`${prefix} alternateMeaningsに意味の重複があります。`);
        }
      }
    }

    if (typeof entry.word === "string" && /^[A-Z]+$/.test(entry.word) &&
        WORD_PARTS_OF_SPEECH.includes(entry.partOfSpeech)) {
      const key = entry.word + "|" + entry.partOfSpeech;
      if (wordParts.has(key)) {
        errors.push(`${prefix} 「${entry.word}」の品詞「${entry.partOfSpeech}」が重複しています。`);
      } else {
        wordParts.set(key, index);
      }
      const previousParts = [...wordParts.keys()].filter((item) =>
        item.startsWith(entry.word + "|") && item !== key);
      if (previousParts.length > 0 && !warnings.some((warning) =>
        warning.includes(`「${entry.word}」`))) {
        warnings.push(`「${entry.word}」は複数の品詞で登録されています。意味の違いを確認してください。`);
      }
    }
  });

  return {
    valid: errors.length === 0,
    errors,
    warnings,
    stats: {
      total: catalog.length,
      byDifficulty,
      byPartOfSpeech,
      byLength,
    },
  };
}
