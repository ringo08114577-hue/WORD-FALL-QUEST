/**
 * Vocabulary imported from English Vocabulary Target 1400 (5th edition).
 * Meanings and source numbering are preserved. This book does not list parts
 * of speech, so the imported entries use "unknown" rather than guessed labels.
 */
import { getWordDifficultyLevelFromLength } from "../word-difficulty.js";
import { TARGET1400_BATCH_01 } from "./target1400-01.js";
import { TARGET1400_BATCH_02 } from "./target1400-02.js";
import { TARGET1400_BATCH_03 } from "./target1400-03.js";
import { TARGET1400_BATCH_04 } from "./target1400-04.js";
import { TARGET1400_BATCH_05 } from "./target1400-05.js";
import { TARGET1400_BATCH_06 } from "./target1400-06.js";
import { TARGET1400_BATCH_07 } from "./target1400-07.js";

const SOURCE_ROWS = [
  ...TARGET1400_BATCH_01,
  ...TARGET1400_BATCH_02,
  ...TARGET1400_BATCH_03,
  ...TARGET1400_BATCH_04,
  ...TARGET1400_BATCH_05,
  ...TARGET1400_BATCH_06,
  ...TARGET1400_BATCH_07,
];

export const TARGET1400_WORDS = Object.freeze(SOURCE_ROWS.map(
  ([targetNumber, sourceWord, japanese]) => {
    const word = sourceWord.toUpperCase();
    return Object.freeze({
      id: word.toLowerCase(),
      word,
      japanese,
      difficulty: getWordDifficultyLevelFromLength(word.length),
      partOfSpeech: "unknown",
      targetNumber,
    });
  },
));
