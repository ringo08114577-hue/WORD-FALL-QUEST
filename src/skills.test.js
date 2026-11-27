import test from "node:test";
import assert from "node:assert/strict";
import {
  SKILL_DEFINITIONS, getSkillDefinition, getSkillsForCharacter,
  isSkillAvailableForCharacter, createInitialSkillLevels,
  createInitialEquippedSkillIds, createInitialCharacterSkillLoadouts,
  isValidCharacterSkillLoadouts, normalizeCharacterSkillLoadouts,
  isValidEquippedSkillIds, normalizeEquippedSkillIds,
  PASSIVE_SKILL_EQUIP_SLOT_COUNT,
  isValidSkillLevels, normalizeSkillLevels, getSkillUpgradeCost,
  getSkillWordDifficultyRange, getSkillEffectForLevel,
  getSkillEvolutionRecipe, getSkillDisplayName,
  isValidEvolvedSkillIds, normalizeEvolvedSkillIds,
} from "./skills.js";

const GOU_IDS = [
  "gou-focus", "gou-limit-focus", "gou-unyielding", "gou-advance-cut",
  "gou-heavy-charge", "gou-slash", "gou-heavy-blow", "gou-roaring-blade",
  "gou-break-army", "gou-collapse", "gou-overlord", "gou-heaven-one-flash",
  "gou-ki-convert", "gou-limit-break", "gou-destruction", "gou-resonance",
];

test("轟剣士に蓄積・攻撃・消費・補助・パッシブ技がまとめて登録されている", () => {
  assert.deepEqual(getSkillsForCharacter("gou-swordsman").map(([id]) => id), GOU_IDS);
  for (const id of GOU_IDS) assert.equal(SKILL_DEFINITIONS[id].characterId, "gou-swordsman");
  assert.equal(SKILL_DEFINITIONS["gou-focus"].effect.type, "gouki-charge");
  assert.equal(SKILL_DEFINITIONS["gou-advance-cut"].effect.type, "gouki-attack");
  assert.deepEqual(getSkillWordDifficultyRange("gou-limit-focus"), { min: 3, max: 3 });
  assert.deepEqual(getSkillWordDifficultyRange("gou-unyielding"), { min: 2, max: 2 });
  assert.equal(getSkillDefinition("gou-chain-blade"), null);
  assert.equal(getSkillDefinition("gou-whirlwind"), null);
  assert.deepEqual(SKILL_DEFINITIONS["gou-advance-cut"].effect.gainAmountByLevel, [4, 5, 6, 7, 9]);
  assert.deepEqual(SKILL_DEFINITIONS["gou-heavy-charge"].effect.gainAmountByLevel, [2, 3, 3, 4, 5]);
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

test("再生騎士のドレイン・回復・オーバーHP技が専用スキルとして登録されている", () => {
  assert.deepEqual(getSkillsForCharacter("regen-knight").map(([id]) => id), [
    "regen-drain-slash", "regen-life-breaker", "regen-prayer", "regen-aegis",
    "regen-holy-drain", "regen-overflow", "regen-immortal-strike",
    "regen-eternal-vessel", "regen-vampiric-will",
  ]);
  assert.equal(SKILL_DEFINITIONS["regen-drain-slash"].effect.type, "regen-drain-attack");
  assert.equal(SKILL_DEFINITIONS["regen-life-breaker"].effect.type, "regen-overhp-attack");
  assert.equal(SKILL_DEFINITIONS["regen-eternal-vessel"].passive, true);
  assert.equal(SKILL_DEFINITIONS["regen-vampiric-will"].passive, true);
  assert.deepEqual(getSkillsForCharacter("shadow-blade").map(([id]) => id), [
    "shadow-basic", "shadow-pierce", "shadow-flurry", "shadow-focus",
    "shadow-finisher", "shadow-mastery",
  ]);
  assert.deepEqual(getSkillsForCharacter("elemental-mage").map(([id]) => id), ["elemental-basic"]);
  assert.deepEqual(getSkillsForCharacter("unknown"), []);
  assert.equal(isSkillAvailableForCharacter("gou-focus", "gou-swordsman"), true);
  assert.equal(isSkillAvailableForCharacter("gou-focus", "regen-knight"), false);
  assert.equal(isSkillAvailableForCharacter("regen-drain-slash", "regen-knight"), true);
  assert.equal(isSkillAvailableForCharacter("regen-drain-slash", "gou-swordsman"), false);
  assert.equal(isSkillAvailableForCharacter("unknown", "gou-swordsman"), false);
  assert.equal(getSkillDefinition("unknown"), null);
});

test("通常技4枠とパッシブ専用1枠をキャラクターごとに持つ", () => {
  assert.equal(PASSIVE_SKILL_EQUIP_SLOT_COUNT, 1);
  assert.deepEqual(createInitialEquippedSkillIds(), [
    "gou-focus", "gou-advance-cut", "gou-slash", "gou-roaring-blade", null,
  ]);
  assert.deepEqual(createInitialEquippedSkillIds("regen-knight"), [
    "regen-drain-slash", "regen-life-breaker", "regen-prayer", "regen-aegis",
    "regen-eternal-vessel",
  ]);
  assert.deepEqual(createInitialEquippedSkillIds("shadow-blade"), [
    "shadow-basic", "shadow-pierce", "shadow-flurry", "shadow-focus", "shadow-mastery",
  ]);
  assert.deepEqual(createInitialEquippedSkillIds("elemental-mage"), ["elemental-basic", null, null, null, null]);

  const loadouts = createInitialCharacterSkillLoadouts();
  assert.equal(isValidCharacterSkillLoadouts(loadouts), true);
  assert.deepEqual(normalizeCharacterSkillLoadouts(loadouts), loadouts);
  assert.deepEqual(normalizeEquippedSkillIds(["gou-focus", null, null, null], "shadow-blade"),
    ["shadow-basic", null, null, null, null]);
  assert.equal(isValidEquippedSkillIds(["gou-focus", null, null, null, null], "gou-swordsman"), true);
  assert.equal(isValidEquippedSkillIds(["gou-focus", null, null, null, null], "regen-knight"), false);
  const legacyLoadouts = Object.fromEntries(Object.keys(loadouts).map((id) => [
    id, [...loadouts[id], id === "gou-swordsman" ? "gou-resonance" : null],
  ]));
  assert.equal(isValidCharacterSkillLoadouts(legacyLoadouts), true);
  assert.deepEqual(
    normalizeCharacterSkillLoadouts(legacyLoadouts)["gou-swordsman"],
    ["gou-focus", "gou-advance-cut", "gou-slash", "gou-roaring-blade", "gou-resonance"],
  );
});

test("旧装備データのパッシブ技を専用枠へ移動し、通常枠には混ぜない", () => {
  const migrated = normalizeEquippedSkillIds(
    ["gou-focus", "gou-destruction", "gou-slash", "gou-resonance"],
    "gou-swordsman",
  );
  assert.deepEqual(migrated, [
    "gou-focus", null, "gou-slash", null, "gou-destruction",
  ]);
  assert.equal(isValidEquippedSkillIds(migrated, "gou-swordsman"), true);
  assert.equal(isValidEquippedSkillIds([
    "gou-focus", "gou-destruction", null, null, "gou-resonance",
  ], "gou-swordsman"), false);
  assert.deepEqual(normalizeEquippedSkillIds([
    "gou-focus", null, null, null, null, "gou-resonance",
  ], "gou-swordsman"), ["gou-focus", null, null, null, "gou-resonance"]);
});

test("技ごとの単語レベルは固定され、スキル強化では変化しない", () => {
  for (const [skillId, skill] of Object.entries(SKILL_DEFINITIONS)) {
    if (skill.passive) continue;
    const atLevelOne = getSkillWordDifficultyRange(skillId, 1);
    const atLevelFive = getSkillWordDifficultyRange(skillId, 5);
    assert.deepEqual(atLevelOne, atLevelFive);
    assert.ok(atLevelOne.min <= atLevelOne.max);
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
  assert.deepEqual(getSkillEffectForLevel("regen-drain-slash", 1), {
    type: "regen-drain-attack", damageMultiplier: 0.9, drainRatio: 0.85,
  });
  assert.deepEqual(getSkillEffectForLevel("regen-life-breaker", 1), {
    type: "regen-overhp-attack", damageMultiplier: 1.05, bonusAtFullOverHp: 0.35,
  });
  assert.deepEqual(getSkillEffectForLevel("regen-prayer", 1), {
    type: "heal", amount: 30, hpRatio: 0.3,
  });
  assert.deepEqual(getSkillEffectForLevel("regen-holy-drain", 1), {
    type: "regen-drain-attack", damageMultiplier: 1.3, drainRatio: 0.95,
  });
  assert.deepEqual(getSkillEffectForLevel("regen-overflow", 1), {
    type: "regen-overhp-gain", amount: 25,
  });
  assert.deepEqual(getSkillEffectForLevel("regen-eternal-vessel", 5), {
    type: "regen-overhp-cap", capMultiplier: 2,
  });
  assert.deepEqual(getSkillEffectForLevel("shadow-basic", 1), {
    type: "shadow-attack", damageMultiplier: 1, criticalMultiplier: 2,
    heavyMultiplier: 3, baseHeavyRate: 0.05, hitCount: 1,
  });
  assert.equal(getSkillEffectForLevel("shadow-pierce", 1).criticalMultiplier, 2.2);
  assert.equal(getSkillEffectForLevel("shadow-flurry", 1).hitCount, 3);
  assert.equal(getSkillEffectForLevel("shadow-focus", 1).criticalRateBonus, 15);
  assert.equal(getSkillEffectForLevel("shadow-mastery", 1).heavyRateBonus, 0.02);
  assert.equal(getSkillEffectForLevel("shadow-finisher", 1).baseHeavyRate, 0.35);
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
