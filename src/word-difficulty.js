/**
 * Word difficulty is determined only by spelling length.
 * Skill upgrade levels never change the difficulty or damage of a word.
 */
export const WORD_DIFFICULTY_DEFINITIONS = Object.freeze({
  1: Object.freeze({ level: 1, label: "基礎", minWordLength: 3, maxWordLength: 4 }),
  2: Object.freeze({ level: 2, label: "初級", minWordLength: 5, maxWordLength: 6 }),
  3: Object.freeze({ level: 3, label: "中級", minWordLength: 7, maxWordLength: 7 }),
  4: Object.freeze({ level: 4, label: "上級", minWordLength: 8, maxWordLength: 8 }),
  5: Object.freeze({ level: 5, label: "最難関", minWordLength: 9, maxWordLength: null }),
});

export function getWordDifficultyDefinition(level) {
  if (!Number.isInteger(level) || !Object.hasOwn(WORD_DIFFICULTY_DEFINITIONS, level)) {
    throw new RangeError("単語難易度は1〜5で指定してください。");
  }
  return WORD_DIFFICULTY_DEFINITIONS[level];
}

export function getWordDifficultyLevelFromLength(wordLength) {
  if (!Number.isInteger(wordLength) || wordLength < 1) {
    throw new RangeError("単語の文字数は1以上の整数で指定してください。");
  }
  if (wordLength <= 4) return 1;
  if (wordLength <= 6) return 2;
  if (wordLength === 7) return 3;
  if (wordLength === 8) return 4;
  return 5;
}
