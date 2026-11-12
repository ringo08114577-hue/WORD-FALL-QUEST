import test from "node:test";
import assert from "node:assert/strict";
import {
  ENEMY_ABILITY_DEFINITIONS, ENEMY_DEFINITIONS, createEnemy,
  getEnemyAbilityEffects, getFloorEnemyIds,
} from "./enemies.js";

test("敵カタログには基本敵・追加敵・ボスが登録されている", () => {
  assert.deepEqual(Object.keys(ENEMY_DEFINITIONS).slice(0, 6), [
    "slime", "bat", "goblin", "orc", "moss-golem", "forest-dragon",
  ]);
  assert.deepEqual(Object.keys(ENEMY_DEFINITIONS).slice(6), [
    "ice-wolf", "ice-golem", "ice-dragon",
  ]);
  assert.equal(ENEMY_DEFINITIONS["forest-dragon"].isBoss, true);
  assert.equal(Object.isFrozen(ENEMY_DEFINITIONS), true);
});

test("敵の能力IDから戦闘効果を集計できる", () => {
  assert.deepEqual(getEnemyAbilityEffects(createEnemy("bat")), {
    counterAttackBonus: 1, damageReduction: 0, defensePiercing: 0,
  });
  assert.deepEqual(getEnemyAbilityEffects(createEnemy("moss-golem")), {
    counterAttackBonus: 1, damageReduction: 1, defensePiercing: 0,
  });
  assert.deepEqual(getEnemyAbilityEffects(createEnemy("forest-dragon")), {
    counterAttackBonus: 1, damageReduction: 1, defensePiercing: 1,
  });
});

test("敵の能力一覧は個別生成され、呼び出し元の変更が定義へ影響しない", () => {
  const first = createEnemy("bat");
  first.abilities.push("guard");
  assert.deepEqual(createEnemy("bat").abilities, ["swift"]);
  assert.equal(ENEMY_ABILITY_DEFINITIONS.swift.name, "すばやい反撃");
});

test("フロア編成は5階分あり、最深部にボスがいる", () => {
  assert.deepEqual(getFloorEnemyIds(1), ["slime", "bat", "goblin"]);
  assert.deepEqual(getFloorEnemyIds(2), ["bat", "orc", "moss-golem"]);
  assert.deepEqual(getFloorEnemyIds(3), ["goblin", "orc", "moss-golem"]);
  assert.deepEqual(getFloorEnemyIds(4), ["orc", "moss-golem", "goblin"]);
  assert.deepEqual(getFloorEnemyIds(5), ["moss-golem", "goblin", "forest-dragon"]);
  assert.throws(() => getFloorEnemyIds(0), TypeError);
  assert.throws(() => getFloorEnemyIds(6), RangeError);
});

test("階層補正は敵の基礎能力と経験値を保ちながら強化する", () => {
  const dragon = createEnemy("forest-dragon", { floor: 5 });
  assert.equal(dragon.maxHp, 14);
  assert.equal(dragon.attackPower, 3);
  assert.equal(dragon.experienceReward, 63);
  assert.equal(dragon.isBoss, true);
  assert.throws(() => createEnemy("unknown"), RangeError);
});
