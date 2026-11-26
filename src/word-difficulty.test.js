import test from "node:test";
import assert from "node:assert/strict";

import {
  WORD_DIFFICULTY_DEFINITIONS,
  getWordDifficultyDefinition,
  getWordDifficultyLevelFromLength,
} from "./word-difficulty.js";

test("単語難易度は文字数だけで決まる5段階", () => {
  assert.deepEqual(Object.keys(WORD_DIFFICULTY_DEFINITIONS), ["1", "2", "3", "4", "5"]);
  assert.deepEqual(
    Object.values(WORD_DIFFICULTY_DEFINITIONS).map(({ minWordLength, maxWordLength }) =>
      [minWordLength, maxWordLength]),
    [[3, 4], [5, 6], [7, 7], [8, 8], [9, null]],
  );
});

test("短い単語はレベル1、長い単語はレベル5になる", () => {
  assert.equal(getWordDifficultyLevelFromLength(3), 1);
  assert.equal(getWordDifficultyLevelFromLength(4), 1);
  assert.equal(getWordDifficultyLevelFromLength(5), 2);
  assert.equal(getWordDifficultyLevelFromLength(6), 2);
  assert.equal(getWordDifficultyLevelFromLength(7), 3);
  assert.equal(getWordDifficultyLevelFromLength(8), 4);
  assert.equal(getWordDifficultyLevelFromLength(9), 5);
  assert.equal(getWordDifficultyLevelFromLength(14), 5);
  assert.throws(() => getWordDifficultyLevelFromLength(0), RangeError);
});

test("難易度定義は1〜5だけを受け付ける", () => {
  assert.equal(getWordDifficultyDefinition(5).label, "最難関");
  assert.throws(() => getWordDifficultyDefinition(6), RangeError);
});
