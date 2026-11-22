import test from "node:test";
import assert from "node:assert/strict";
import { GAME_CONFIG, getDungeonFloorReward } from "./game-config.js";

test("ゲームバランス設定は読み取り専用で管理される", () => {
  assert.equal(Object.isFrozen(GAME_CONFIG), true);
  assert.equal(Object.isFrozen(GAME_CONFIG.player), true);
  assert.equal(Object.isFrozen(GAME_CONFIG.progression), true);
  assert.equal(Object.isFrozen(GAME_CONFIG.enemyScaling), true);
  assert.equal(Object.isFrozen(GAME_CONFIG.dungeon), true);
});

test("初期能力と成長・敵強化の既存バランスを維持する", () => {
  assert.deepEqual(GAME_CONFIG.player, {
    startingMaxHp: 100,
    startingAttackPower: 20,
  });
  assert.deepEqual(GAME_CONFIG.progression, {
    experiencePerLevel: 100,
    hpPerLevel: 40,
    attackPowerPerLevel: 5,
  });
  assert.equal(GAME_CONFIG.enemyScaling.hpMultiplierPerFloor, 1.35);
  assert.equal(GAME_CONFIG.enemyScaling.attackPowerMultiplierPerFloor, 1.25);
  assert.equal(GAME_CONFIG.enemyScaling.experiencePerFloor, 20);
});

test("奇数階と偶数階で既存どおりの宝箱報酬を生成する", () => {
  assert.deepEqual(getDungeonFloorReward(1), {
    itemId: "small-potion",
    quantity: 1,
    gold: 15,
  });
  assert.deepEqual(getDungeonFloorReward(2), {
    itemId: "large-potion",
    quantity: 1,
    gold: 20,
  });
  assert.deepEqual(getDungeonFloorReward(3), {
    itemId: "small-potion",
    quantity: 1,
    gold: 25,
  });
});

test("無効な階層では報酬を生成しない", () => {
  for (const floor of [0, -1, 1.5, NaN, Infinity, "1"]) {
    assert.throws(() => getDungeonFloorReward(floor), TypeError);
  }
});
