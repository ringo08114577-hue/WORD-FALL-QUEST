import test from "node:test";
import assert from "node:assert/strict";
import {
  ENEMY_ABILITY_DEFINITIONS, ENEMY_DEFINITIONS, createEnemy,
  getEnemyAbilityEffects, getFloorEnemyIds,
} from "./enemies.js";

test("敵カタログには基本敵・追加敵・ボスが登録されている", () => {
  assert.deepEqual(Object.keys(ENEMY_DEFINITIONS), [
    "slime", "bat", "goblin", "orc", "moss-golem", "forest-dragon",
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

test("フロア編成は3種類で循環し、不正な階層を拒否する", () => {
  assert.deepEqual(getFloorEnemyIds(1), ["slime", "bat", "goblin"]);
  assert.deepEqual(getFloorEnemyIds(2), ["bat", "orc", "moss-golem"]);
  assert.deepEqual(getFloorEnemyIds(3), ["goblin", "moss-golem", "forest-dragon"]);
  assert.deepEqual(getFloorEnemyIds(4), ["slime", "bat", "goblin"]);
  assert.throws(() => getFloorEnemyIds(0), TypeError);
});

test("階層補正は敵の基礎能力と経験値を保ちながら強化する", () => {
  const dragon = createEnemy("forest-dragon", { floor: 4 });
  assert.equal(dragon.maxHp, 13);
  assert.equal(dragon.attackPower, 3);
  assert.equal(dragon.experienceReward, 61);
  assert.equal(dragon.isBoss, true);
  assert.throws(() => createEnemy("unknown"), RangeError);
});
