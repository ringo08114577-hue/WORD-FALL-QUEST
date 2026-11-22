import test from "node:test";
import assert from "node:assert/strict";
import { simulatePrototypeAttack, simulatePrototypeIncomingAttack,
  normalizePrototypeEquipment, createEmptyPrototypeEquipment,
  getPrototypePlayerBaseStats } from "./prototype-lab-simulator.js";
import { createEnemy } from "./enemies.js";

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
    skillId: "quick-strike",
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
  assert.deepEqual(getPrototypePlayerBaseStats(10), { attackPower: 65, maxHp: 460 });

  const result = simulatePrototypeIncomingAttack({
    playerLevel: 10,
    equipment: { accessory: "copper-charm" },
    enemy: { ...forestEnemy, attackPower: 50 },
  });
  assert.equal(result.effectiveStats.attackPower, 75);
  assert.equal(result.effectiveStats.maxHp, 520);
  assert.equal(result.effectiveStats.hp, 520);
});

test("指定階層で作成した敵にHP・攻撃力倍率が適用される", () => {
  const firstFloor = createEnemy("forest-dragon", { floor: 1 });
  const fifthFloor = createEnemy("forest-dragon", { floor: 5 });
  assert.deepEqual([firstFloor.maxHp, firstFloor.attackPower], [800, 50]);
  assert.deepEqual([fifthFloor.maxHp, fifthFloor.attackPower], [2657, 122]);
});
