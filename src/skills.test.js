import test from "node:test";
import assert from "node:assert/strict";

import {
  SKILL_DEFINITIONS, getSkillDefinition, createInitialSkillLevels,
  createInitialEquippedSkillIds,
  isValidSkillLevels, normalizeSkillLevels, getSkillUpgradeCost,
  getSkillWordDifficultyRange, getSkillEffectForLevel,
  getSkillEvolutionRecipe, getSkillDisplayName,
  isValidEvolvedSkillIds, normalizeEvolvedSkillIds,
} from "./skills.js";

test("初期装備は攻撃3種と回復スキルで、後から差し替えられる4枠を持つ", () => {
  assert.deepEqual(createInitialEquippedSkillIds(), [
    "quick-strike", "power-strike", "ultimate-strike", "healing-light",
  ]);
  assert.equal(SKILL_DEFINITIONS["healing-light"].initiallyEquipped, true);
});

test("攻撃スキルは単語が長いほど火力が高い", () => {
  assert.deepEqual(
    Object.values(SKILL_DEFINITIONS).filter((skill) => skill.category === "attack").map((skill) => [
      skill.minWordLength, skill.maxWordLength, skill.damageMultiplier,
    ]),
    [[3, 4, 1], [5, 6, 2], [7, 8, 3]],
  );
});

test("5属性の基本魔法はシンプルな魔法攻撃として定義される", () => {
  const magicIds = ["fireball", "thunder-bolt", "water-shot", "wind-cutter", "earth-spike"];
  assert.deepEqual(magicIds.map((id) => SKILL_DEFINITIONS[id].element),
    ["fire", "thunder", "water", "wind", "earth"]);
  for (const id of magicIds) {
    assert.equal(SKILL_DEFINITIONS[id].category, "magic");
    assert.deepEqual(getSkillEffectForLevel(id, 1), {
      type: "magic", damageMultiplier: 1, element: SKILL_DEFINITIONS[id].element,
    });
    assert.deepEqual(getSkillEffectForLevel(id, 5, true), {
      type: "magic", damageMultiplier: 1.2, element: SKILL_DEFINITIONS[id].element,
    });
  }
});

test("回復・防御・補助スキルは簡単な単語で発動し、レベルで効果が成長する", () => {
  for (const skillId of ["healing-light", "iron-guard", "battle-cry"]) {
    assert.deepEqual(getSkillWordDifficultyRange(skillId, 1), { min: 1, max: 2 });
    assert.deepEqual(getSkillWordDifficultyRange(skillId, 5), { min: 1, max: 2 });
  }
  assert.deepEqual(getSkillEffectForLevel("healing-light", 1), {
    type: "heal", amount: 30, hpRatio: 0.3,
  });
  assert.deepEqual(getSkillEffectForLevel("healing-light", 5), {
    type: "heal", amount: 70, hpRatio: 0.7,
  });
  assert.deepEqual(getSkillEffectForLevel("iron-guard", 1), { type: "defense", bonus: 20, hits: 2 });
  assert.deepEqual(getSkillEffectForLevel("iron-guard", 5), { type: "defense", bonus: 40, hits: 2 });
  assert.deepEqual(getSkillEffectForLevel("battle-cry", 1), { type: "attack-buff", multiplier: 1.2, uses: 2 });
  assert.deepEqual(getSkillEffectForLevel("battle-cry", 5), { type: "attack-buff", multiplier: 1.6, uses: 2 });
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
    "fireball": 1,
    "thunder-bolt": 1,
    "water-shot": 1,
    "wind-cutter": 1,
    "earth-spike": 1,
    "healing-light": 1,
    "iron-guard": 1,
    "battle-cry": 1,
  });
});


test("スキル進化の素材・効果・表示名が定義どおり", () => {
  assert.deepEqual(getSkillEvolutionRecipe("quick-strike"), {
    materialId: "forest-dragon-seal", materialQuantity: 1, gold: 200,
  });
  assert.deepEqual(getSkillEvolutionRecipe("healing-light"), {
    materialId: "ice-dragon-core", materialQuantity: 1, gold: 200,
  });
  assert.equal(getSkillEvolutionRecipe("unknown-skill"), null);
  assert.deepEqual(getSkillEffectForLevel("quick-strike", 5, true), { type: "attack", damageMultiplier: 1.2 });
  assert.deepEqual(getSkillEffectForLevel("power-strike", 5, true), { type: "attack", damageMultiplier: 2.4 });
  assert.deepEqual(getSkillEffectForLevel("ultimate-strike", 5, true), { type: "attack", damageMultiplier: 3.6 });
  assert.deepEqual(getSkillEffectForLevel("healing-light", 5, true), {
    type: "heal", amount: 90, hpRatio: 0.8,
  });
  assert.deepEqual(getSkillEffectForLevel("iron-guard", 5, true), { type: "defense", bonus: 50, hits: 2 });
  assert.deepEqual(getSkillEffectForLevel("battle-cry", 5, true), { type: "attack-buff", multiplier: 1.8, uses: 2 });
  assert.equal(getSkillDisplayName("quick-strike", true), "疾風の斬撃");
  assert.equal(getSkillDisplayName("quick-strike", false), "すばやい斬撃");
});

test("進化済みスキルはLv.5でのみ有効になり、重複や未知IDを補完で除外する", () => {
  const levels = createInitialSkillLevels();
  levels["quick-strike"] = 5;
  levels["power-strike"] = 4;
  assert.equal(isValidEvolvedSkillIds(["quick-strike"], levels), true);
  assert.equal(isValidEvolvedSkillIds(["power-strike"], levels), false);
  assert.equal(isValidEvolvedSkillIds(["unknown"], levels), false);
  assert.equal(isValidEvolvedSkillIds(["quick-strike", "quick-strike"], levels), false);
  assert.deepEqual(normalizeEvolvedSkillIds(["quick-strike", "power-strike", "unknown", "quick-strike"], levels), ["quick-strike"]);
});
