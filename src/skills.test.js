import test from "node:test";
import assert from "node:assert/strict";

import {
  SKILL_DEFINITIONS, getSkillDefinition, createInitialSkillLevels,
  isValidSkillLevels, normalizeSkillLevels, getSkillUpgradeCost,
} from "./skills.js";

test("3種類の技は単語の長さと攻撃倍率が異なる", () => {
  assert.deepEqual(
    Object.values(SKILL_DEFINITIONS).map((skill) => [
      skill.minWordLength, skill.maxWordLength, skill.damageMultiplier,
    ]),
    [[3, 4, 1], [5, 6, 2], [7, 8, 3]],
  );
});

test("技データは読み取り専用で、未登録IDは取得できない", () => {
  assert.equal(Object.isFrozen(SKILL_DEFINITIONS), true);
  assert.equal(Object.isFrozen(getSkillDefinition("quick-strike")), true);
  assert.equal(getSkillDefinition("not-a-skill"), null);
});


test("各スキルの強化費用は50・100・200・400Gで、Lv.5が上限", () => {
  for (const skillId of Object.keys(SKILL_DEFINITIONS)) {
    assert.deepEqual(
      [1, 2, 3, 4].map((level) => getSkillUpgradeCost(skillId, level)),
      [50, 100, 200, 400],
    );
    assert.equal(getSkillUpgradeCost(skillId, 5), null);
  }
  assert.equal(getSkillUpgradeCost("unknown-skill", 1), null);
});

test("スキルレベルの初期化・検証・旧セーブ補完が正しく動作する", () => {
  const initial = createInitialSkillLevels();
  assert.equal(isValidSkillLevels(initial), true);
  assert.equal(isValidSkillLevels({ ...initial, "quick-strike": 6 }), false);
  assert.deepEqual(normalizeSkillLevels({ "quick-strike": 3 }), {
    "quick-strike": 3,
    "power-strike": 1,
    "ultimate-strike": 1,
  });
});
