import test from "node:test";
import assert from "node:assert/strict";
import {
  SKILL_DEFINITIONS, getSkillDefinition, getSkillsForCharacter,
  isSkillAvailableForCharacter, createInitialSkillLevels,
  createInitialEquippedSkillIds, createInitialCharacterSkillLoadouts,
  isValidCharacterSkillLoadouts, normalizeCharacterSkillLoadouts,
  isValidEquippedSkillIds, normalizeEquippedSkillIds,
  isValidSkillLevels, normalizeSkillLevels, getSkillUpgradeCost,
  getSkillWordDifficultyRange, getSkillEffectForLevel,
  getSkillEvolutionRecipe, getSkillDisplayName,
  isValidEvolvedSkillIds, normalizeEvolvedSkillIds,
} from "./skills.js";

test("初期スキルは4キャラクターそれぞれに1つずつ割り当てられている", () => {
  assert.deepEqual(Object.keys(SKILL_DEFINITIONS), [
    "gou-basic", "regen-basic", "shadow-basic", "elemental-basic",
  ]);
  assert.deepEqual(Object.values(SKILL_DEFINITIONS).map((skill) => [
    skill.name, skill.characterId,
  ]), [
    ["あ", "gou-swordsman"],
    ["い", "regen-knight"],
    ["う", "shadow-blade"],
    ["え", "elemental-mage"],
  ]);
  assert.equal(Object.isFrozen(SKILL_DEFINITIONS), true);
  for (const skill of Object.values(SKILL_DEFINITIONS)) assert.equal(Object.isFrozen(skill), true);
});

test("キャラクターごとの技一覧には所属する技だけが返る", () => {
  assert.deepEqual(getSkillsForCharacter("gou-swordsman").map(([id]) => id), ["gou-basic"]);
  assert.deepEqual(getSkillsForCharacter("regen-knight").map(([id]) => id), ["regen-basic"]);
  assert.deepEqual(getSkillsForCharacter("shadow-blade").map(([id]) => id), ["shadow-basic"]);
  assert.deepEqual(getSkillsForCharacter("elemental-mage").map(([id]) => id), ["elemental-basic"]);
  assert.deepEqual(getSkillsForCharacter("unknown"), []);
  assert.equal(isSkillAvailableForCharacter("gou-basic", "gou-swordsman"), true);
  assert.equal(isSkillAvailableForCharacter("gou-basic", "regen-knight"), false);
  assert.equal(isSkillAvailableForCharacter("unknown", "gou-swordsman"), false);
  assert.equal(getSkillDefinition("unknown"), null);
});

test("キャラクターごとに別々の初期装備4枠を持つ", () => {
  assert.deepEqual(createInitialEquippedSkillIds(), ["gou-basic", null, null, null]);
  assert.deepEqual(createInitialEquippedSkillIds("regen-knight"), ["regen-basic", null, null, null]);
  assert.deepEqual(createInitialEquippedSkillIds("shadow-blade"), ["shadow-basic", null, null, null]);
  assert.deepEqual(createInitialEquippedSkillIds("elemental-mage"), ["elemental-basic", null, null, null]);

  const loadouts = createInitialCharacterSkillLoadouts();
  assert.equal(isValidCharacterSkillLoadouts(loadouts), true);
  assert.deepEqual(normalizeCharacterSkillLoadouts(loadouts), loadouts);
  assert.deepEqual(normalizeEquippedSkillIds(["gou-basic", null, null, null], "shadow-blade"),
    ["shadow-basic", null, null, null]);
  assert.equal(isValidEquippedSkillIds(["gou-basic", null, null, null], "gou-swordsman"), true);
  assert.equal(isValidEquippedSkillIds(["gou-basic", null, null, null], "regen-knight"), false);
});

test("技を追加するときはcharacterIdを指定するだけで出題難易度と効果が共通処理される", () => {
  for (const skill of Object.values(SKILL_DEFINITIONS)) {
    assert.equal(skill.category, "attack");
    assert.deepEqual(getSkillWordDifficultyRange(skill.id, 1), { min: 3, max: 4 });
    assert.deepEqual(getSkillEffectForLevel(skill.id, 1), {
      type: "attack", damageMultiplier: 1,
    });
  }
});

test("スキルレベルの初期化・検証・旧データ補完が正しく動作する", () => {
  const initial = createInitialSkillLevels();
  assert.deepEqual(initial, {
    "gou-basic": 1,
    "regen-basic": 1,
    "shadow-basic": 1,
    "elemental-basic": 1,
  });
  assert.equal(isValidSkillLevels(initial), true);
  assert.equal(isValidSkillLevels({ ...initial, "gou-basic": 6 }), false);
  assert.deepEqual(normalizeSkillLevels({ "gou-basic": 3 }), {
    "gou-basic": 3, "regen-basic": 1, "shadow-basic": 1, "elemental-basic": 1,
  });
});

test("各スキルの強化費用は50・100・200・400Gで、Lv.5が上限", () => {
  for (const skillId of Object.keys(SKILL_DEFINITIONS)) {
    assert.deepEqual([1, 2, 3, 4].map((level) => getSkillUpgradeCost(skillId, level)),
      [50, 100, 200, 400]);
    assert.equal(getSkillUpgradeCost(skillId, 5), null);
  }
  assert.equal(getSkillUpgradeCost("unknown-skill", 1), null);
});

test("進化後も所属キャラクターは変わらず、技名と効果だけが強化される", () => {
  assert.deepEqual(getSkillEvolutionRecipe("gou-basic"), {
    materialId: "forest-dragon-seal", materialQuantity: 1, gold: 200,
  });
  assert.deepEqual(getSkillEvolutionRecipe("elemental-basic"), {
    materialId: "ice-dragon-core", materialQuantity: 1, gold: 200,
  });
  assert.equal(getSkillEvolutionRecipe("unknown-skill"), null);
  assert.deepEqual(getSkillEffectForLevel("gou-basic", 5, true),
    { type: "attack", damageMultiplier: 1.2 });
  assert.equal(getSkillDisplayName("gou-basic", true), "あ・改");
  assert.equal(getSkillDisplayName("gou-basic", false), "あ");
  const levels = createInitialSkillLevels();
  levels["gou-basic"] = 5;
  assert.equal(isValidEvolvedSkillIds(["gou-basic"], levels), true);
  assert.equal(isValidEvolvedSkillIds(["regen-basic"], levels), false);
  assert.deepEqual(normalizeEvolvedSkillIds(["gou-basic", "regen-basic", "gou-basic"], levels),
    ["gou-basic"]);
});
