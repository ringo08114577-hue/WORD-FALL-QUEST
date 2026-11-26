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

const GOU_IDS = [
  "gou-focus", "gou-limit-focus", "gou-unyielding", "gou-advance-cut",
  "gou-heavy-charge", "gou-chain-blade", "gou-slash", "gou-heavy-blow",
  "gou-whirlwind", "gou-roaring-blade", "gou-break-army", "gou-collapse",
  "gou-overlord", "gou-heaven-one-flash", "gou-ki-convert", "gou-limit-break",
  "gou-destruction", "gou-resonance",
];

test("轟剣士に蓄積・攻撃・消費・補助・パッシブ技がまとめて登録されている", () => {
  assert.deepEqual(getSkillsForCharacter("gou-swordsman").map(([id]) => id), GOU_IDS);
  for (const id of GOU_IDS) assert.equal(SKILL_DEFINITIONS[id].characterId, "gou-swordsman");
  assert.equal(SKILL_DEFINITIONS["gou-focus"].effect.type, "gouki-charge");
  assert.equal(SKILL_DEFINITIONS["gou-advance-cut"].effect.type, "gouki-attack");
  assert.equal(SKILL_DEFINITIONS["gou-slash"].category, "attack");
  assert.equal(SKILL_DEFINITIONS["gou-roaring-blade"].effect.consumeAmount, 3);
  assert.equal(SKILL_DEFINITIONS["gou-break-army"].effect.consumeAmount, 10);
  assert.equal(SKILL_DEFINITIONS["gou-collapse"].effect.consumeAmount, 20);
  assert.equal(SKILL_DEFINITIONS["gou-overlord"].effect.consumeAmount, 50);
  assert.equal(SKILL_DEFINITIONS["gou-heaven-one-flash"].effect.type, "gouki-consume-all");
  assert.equal(SKILL_DEFINITIONS["gou-destruction"].passive, true);
  assert.equal(SKILL_DEFINITIONS["gou-resonance"].passive, true);
  assert.equal(Object.isFrozen(SKILL_DEFINITIONS), true);
  for (const skill of Object.values(SKILL_DEFINITIONS)) assert.equal(Object.isFrozen(skill), true);
});

test("再生騎士・影刃・元素術師は自分専用の仮技だけを取得する", () => {
  assert.deepEqual(getSkillsForCharacter("regen-knight").map(([id]) => id), ["regen-basic"]);
  assert.deepEqual(getSkillsForCharacter("shadow-blade").map(([id]) => id), ["shadow-basic"]);
  assert.deepEqual(getSkillsForCharacter("elemental-mage").map(([id]) => id), ["elemental-basic"]);
  assert.deepEqual(getSkillsForCharacter("unknown"), []);
  assert.equal(isSkillAvailableForCharacter("gou-focus", "gou-swordsman"), true);
  assert.equal(isSkillAvailableForCharacter("gou-focus", "regen-knight"), false);
  assert.equal(isSkillAvailableForCharacter("unknown", "gou-swordsman"), false);
  assert.equal(getSkillDefinition("unknown"), null);
});

test("キャラクターごとに別々の初期装備4枠を持つ", () => {
  assert.deepEqual(createInitialEquippedSkillIds(), [
    "gou-focus", "gou-advance-cut", "gou-slash", "gou-roaring-blade",
  ]);
  assert.deepEqual(createInitialEquippedSkillIds("regen-knight"), ["regen-basic", null, null, null]);
  assert.deepEqual(createInitialEquippedSkillIds("shadow-blade"), ["shadow-basic", null, null, null]);
  assert.deepEqual(createInitialEquippedSkillIds("elemental-mage"), ["elemental-basic", null, null, null]);

  const loadouts = createInitialCharacterSkillLoadouts();
  assert.equal(isValidCharacterSkillLoadouts(loadouts), true);
  assert.deepEqual(normalizeCharacterSkillLoadouts(loadouts), loadouts);
  assert.deepEqual(normalizeEquippedSkillIds(["gou-focus", null, null, null], "shadow-blade"),
    ["shadow-basic", null, null, null]);
  assert.equal(isValidEquippedSkillIds(["gou-focus", null, null, null], "gou-swordsman"), true);
  assert.equal(isValidEquippedSkillIds(["gou-focus", null, null, null], "regen-knight"), false);
});

test("技の種類ごとに単語範囲と効果が共通処理される", () => {
  for (const [skillId, skill] of Object.entries(SKILL_DEFINITIONS)) {
    if (skill.passive) continue;
    const expectedRange = skill.wordDifficultyRange ?? { min: 1, max: 2 };
    assert.deepEqual(getSkillWordDifficultyRange(skillId, 1), expectedRange);
    assert.ok(getSkillEffectForLevel(skillId, 1));
  }
  assert.deepEqual(getSkillEffectForLevel("gou-focus", 1), {
    type: "gouki-charge", amount: 10,
  });
  assert.deepEqual(getSkillEffectForLevel("gou-roaring-blade", 1), {
    type: "gouki-consume-attack", consumeAmount: 3, bonusPerStack: 0.2, breakGuard: false,
  });
  assert.deepEqual(getSkillEffectForLevel("gou-heaven-one-flash", 1), {
    type: "gouki-consume-all", bonusPerStack: 0.4, breakGuard: true,
  });
});

test("スキルレベルの初期化・検証・旧データ補完が正しく動作する", () => {
  const initial = createInitialSkillLevels();
  assert.equal(Object.keys(initial).length, Object.keys(SKILL_DEFINITIONS).length);
  assert.ok(Object.values(initial).every((level) => level === 1));
  assert.equal(isValidSkillLevels(initial), true);
  assert.equal(isValidSkillLevels({ ...initial, "gou-focus": 6 }), false);
  assert.equal(normalizeSkillLevels({ "gou-focus": 3 })["gou-focus"], 3);
  assert.ok(Object.entries(normalizeSkillLevels({ "gou-focus": 3 }))
    .filter(([id]) => id !== "gou-focus").every(([, level]) => level === 1));
});

test("各スキルの強化費用は50・100・200・400Gで、Lv.5が上限", () => {
  for (const skillId of Object.keys(SKILL_DEFINITIONS)) {
    assert.deepEqual([1, 2, 3, 4].map((level) => getSkillUpgradeCost(skillId, level)),
      [50, 100, 200, 400]);
    assert.equal(getSkillUpgradeCost(skillId, 5), null);
  }
  assert.equal(getSkillUpgradeCost("unknown-skill", 1), null);
});

test("進化後も所属キャラクターは変わらず、轟剣士技の効果が強化される", () => {
  assert.deepEqual(getSkillEvolutionRecipe("gou-focus"), {
    materialId: "forest-dragon-seal", materialQuantity: 1, gold: 200,
  });
  assert.deepEqual(getSkillEvolutionRecipe("elemental-basic"), {
    materialId: "ice-dragon-core", materialQuantity: 1, gold: 200,
  });
  assert.equal(getSkillEvolutionRecipe("unknown-skill"), null);
  assert.deepEqual(getSkillEffectForLevel("gou-focus", 5, true), {
    type: "gouki-charge", amount: 25,
  });
  assert.equal(getSkillDisplayName("gou-focus", true), "闘気集中・改");
  assert.equal(getSkillDisplayName("gou-focus", false), "闘気集中");
  const levels = createInitialSkillLevels();
  levels["gou-focus"] = 5;
  assert.equal(isValidEvolvedSkillIds(["gou-focus"], levels), true);
  assert.equal(isValidEvolvedSkillIds(["regen-basic"], levels), false);
  assert.deepEqual(normalizeEvolvedSkillIds(["gou-focus", "regen-basic", "gou-focus"], levels),
    ["gou-focus"]);
});
