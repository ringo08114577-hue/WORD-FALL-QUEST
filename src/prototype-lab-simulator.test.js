import test from "node:test";
import assert from "node:assert/strict";
import { simulatePrototypeAttack, simulatePrototypeIncomingAttack,
  normalizePrototypeEquipment, createEmptyPrototypeEquipment,
  getPrototypePlayerBaseStats, comparePrototypeEnemies } from "./prototype-lab-simulator.js";
import { createEnemy, ENEMY_DEFINITIONS } from "./enemies.js";

const forestEnemy = {
  id: "test-forest-boss", name: "試験用の森竜", maxHp: 1000, attackPower: 100,
  attackElement: "wind", elementalWeakness: "fire", elementalResistance: "wind",
  isBoss: true, abilities: [],
};

test("試作ラボでは本編の所持数・レベルに関係なく未所持装備も使える", () => {
  const result = simulatePrototypeAttack({
    equipment: { weapon: "forest-dragon-sword" },
    enemy: { ...forestEnemy, elementalWeakness: "wind" },
    baseAttackPower: 100,
    skillId: "gou-basic",
    wordDifficulty: 1,
  });
  assert.equal(result.ignored, false);
  assert.equal(result.damage, 251);
  assert.equal(result.equipment.weapon, "forest-dragon-sword");
});

test("装備枠が一致しないアイテムIDは試験用セットから除外される", () => {
  const equipment = normalizePrototypeEquipment({
    weapon: "ice-dragon-armor",
    armor: "ice-dragon-armor",
    shield: "wooden-shield",
    accessory: "not-a-real-item",
  });
  assert.deepEqual(equipment, {
    weapon: null,
    shield: "wooden-shield",
    armor: "ice-dragon-armor",
    accessory: null,
  });
  assert.deepEqual(createEmptyPrototypeEquipment(), {
    weapon: null, shield: null, armor: null, accessory: null,
  });
});

test("属性耐性・属性弱点を持つ装備の被ダメージを本編の計算で試せる", () => {
  const reduced = simulatePrototypeIncomingAttack({
    equipment: { armor: "moss-guardian-armor" },
    enemy: { ...forestEnemy, attackElement: "earth", attackPower: 100 },
    baseAttackPower: 100,
    baseDefensePower: 0,
  });
  assert.equal(reduced.damage, 56);

  const vulnerable = simulatePrototypeIncomingAttack({
    equipment: { armor: "ice-dragon-armor" },
    enemy: { ...forestEnemy, attackElement: "fire", attackPower: 100 },
    baseAttackPower: 100,
    baseDefensePower: 0,
  });
  assert.equal(vulnerable.damage, 39);
});

test("敵の弱点に合う装備属性と耐性を個別に試せる", () => {
  const normal = simulatePrototypeAttack({
    equipment: { weapon: "forest-dragon-sword" },
    enemy: { ...forestEnemy, elementalWeakness: null, elementalResistance: null },
  });
  assert.equal(normal.ignored, false);
  assert.equal(normal.damage, 193);
});


test("試作ラボはプレイヤーレベルから本編と同じ攻撃力・最大HPを算出する", () => {
  assert.deepEqual(getPrototypePlayerBaseStats(1), { attackPower: 20, maxHp: 100 });
  assert.deepEqual(getPrototypePlayerBaseStats(10), { attackPower: 110, maxHp: 820 });

  const result = simulatePrototypeIncomingAttack({
    playerLevel: 10,
    equipment: { accessory: "copper-charm" },
    enemy: { ...forestEnemy, attackPower: 50 },
  });
  assert.equal(result.effectiveStats.attackPower, 120);
  assert.equal(result.effectiveStats.maxHp, 880);
  assert.equal(result.effectiveStats.hp, 880);
});

test("指定階層で作成した敵にHP・攻撃力倍率が適用される", () => {
  const firstFloor = createEnemy("forest-dragon", { floor: 1 });
  const fifthFloor = createEnemy("forest-dragon", { floor: 5 });
  assert.deepEqual([firstFloor.maxHp, firstFloor.attackPower], [820, 46]);
  assert.deepEqual([fifthFloor.maxHp, fifthFloor.attackPower], [2724, 112]);
});


test("登録済みの全敵を指定階層で一括比較し、撃破回数と被ダメージを計算する", () => {
  const results = comparePrototypeEnemies({
    floor: 1,
    playerLevel: 1,
    skillId: "gou-basic",
    wordDifficulty: 1,
  });
  assert.equal(results.length, Object.keys(ENEMY_DEFINITIONS).length);
  assert.ok(results.every((enemy) =>
    Number.isSafeInteger(enemy.attacksToDefeat) && enemy.attacksToDefeat >= 1 &&
    Number.isSafeInteger(enemy.playerAttackDamage) && enemy.playerAttackDamage >= 1 &&
    Number.isSafeInteger(enemy.enemyAttackDamage) && enemy.enemyAttackDamage >= 0 &&
    (enemy.hitsToPlayerDefeat === null || enemy.hitsToPlayerDefeat >= 1)));
  const dragon = results.find((enemy) => enemy.id === "forest-dragon");
  assert.equal(dragon.maxHp, 820);
  assert.equal(dragon.attackPower, 46);
  assert.equal(dragon.rank, "boss");
  assert.equal(dragon.elementalWeakness, "fire");
  assert.ok(dragon.attacksToDefeat > 1);
});

test("敵一括比較は階層補正と指定した敵の絞り込みを反映する", () => {
  const results = comparePrototypeEnemies({
    floor: 5,
    enemyIds: ["slime", "forest-dragon"],
    playerLevel: 2,
    skillId: "regen-basic",
    wordDifficulty: 2,
  });
  assert.equal(results.length, 2);
  assert.equal(results[0].maxHp, Math.round(165 * 1.35 ** 4));
  assert.equal(results[1].maxHp, 2724);
  assert.ok(results.every((enemy) => enemy.attacksToDefeat >= 1));
  assert.throws(() => comparePrototypeEnemies({ floor: 0 }), RangeError);
  assert.throws(() => comparePrototypeEnemies({ enemyIds: ["unknown"] }), RangeError);
  assert.throws(() => comparePrototypeEnemies({ enemyIds: ["slime", "slime"] }), RangeError);
});
