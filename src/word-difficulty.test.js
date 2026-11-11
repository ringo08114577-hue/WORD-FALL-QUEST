import test from "node:test";
import assert from "node:assert/strict";

import {
  WORD_DIFFICULTY_DEFINITIONS,
  SKILL_LEVEL_DIFFICULTY_RANGES,
  getWordDifficultyMultiplier,
  getWordDifficultyWeight,
  getSkillLevelDifficultyRange,
} from "./word-difficulty.js";

test("単語難易度は6段階で、難しいほど攻撃倍率が高い", () => {
  assert.deepEqual(
    Object.values(WORD_DIFFICULTY_DEFINITIONS).map((item) => item.damageMultiplier),
    [1, 1.5, 2.2, 3.2, 4.8, 7],
  );
  assert.ok(
    Object.values(WORD_DIFFICULTY_DEFINITIONS).every((item, index, all) =>
      index === 0 || item.damageMultiplier > all[index - 1].damageMultiplier),
  );
});

test("出題ウェイトは難易度が上がるほど低く、合計100になる", () => {
  const weights = Object.values(WORD_DIFFICULTY_DEFINITIONS).map((item) => item.selectionWeight);
  assert.deepEqual(weights, [35, 25, 18, 12, 7, 3]);
  assert.equal(weights.reduce((sum, value) => sum + value, 0), 100);
  assert.ok(weights.every((weight, index) => index === 0 || weight < weights[index - 1]));
});

test("スキルレベルごとの出題範囲が6段階の難易度に対応する", () => {
  assert.deepEqual(
    Object.values(SKILL_LEVEL_DIFFICULTY_RANGES).map(({ min, max }) => [min, max]),
    [[1, 2], [1, 3], [2, 4], [3, 5], [4, 6]],
  );
  assert.deepEqual(getSkillLevelDifficultyRange(5), { min: 4, max: 6 });
  assert.equal(getWordDifficultyMultiplier(6), 7);
  assert.equal(getWordDifficultyWeight(6), 3);
  assert.throws(() => getSkillLevelDifficultyRange(0), RangeError);
  assert.throws(() => getWordDifficultyMultiplier(7), RangeError);
});
