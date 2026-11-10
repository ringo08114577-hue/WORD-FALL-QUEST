import test from "node:test";
import assert from "node:assert/strict";

import { SKILL_DEFINITIONS, getSkillDefinition } from "./skills.js";

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
