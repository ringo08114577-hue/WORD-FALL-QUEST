import test from "node:test";
import assert from "node:assert/strict";

import { ENEMY_DEFINITIONS } from "./data/enemies.js";
import { ITEM_DEFINITIONS } from "./data/items.js";
import { ENEMY_DROP_TABLES } from "./data/enemy-drops.js";
import { resolveEnemyDrops } from "./enemy-drops.js";

test("すべての敵に個別の有効な素材ドロップテーブルが登録されている", () => {
  assert.deepEqual(Object.keys(ENEMY_DROP_TABLES).sort(), Object.keys(ENEMY_DEFINITIONS).sort());
  for (const [enemyId, entries] of Object.entries(ENEMY_DROP_TABLES)) {
    assert.ok(entries.length > 0, enemyId + " のドロップがありません");
    for (const entry of entries) {
      assert.equal(ITEM_DEFINITIONS[entry.itemId]?.type, "material", enemyId + " -> " + entry.itemId);
      assert.ok(Number.isFinite(entry.chance) && entry.chance > 0 && entry.chance <= 1);
      assert.ok(Number.isSafeInteger(entry.minQuantity) && entry.minQuantity > 0);
      assert.ok(Number.isSafeInteger(entry.maxQuantity) && entry.maxQuantity >= entry.minQuantity);
      assert.ok(Number.isSafeInteger(ITEM_DEFINITIONS[entry.itemId].sellPrice));
    }
  }
  assert.equal(Object.isFrozen(ENEMY_DROP_TABLES), true);
});

test("通常敵の素材は60%・30%・5%で個別抽選され、複数同時に落ちる", () => {
  assert.deepEqual(resolveEnemyDrops("slime", () => 0), [
    { itemId: "slime-gel", quantity: 1 },
    { itemId: "green-slime-moss-mucus", quantity: 1 },
    { itemId: "slime-core", quantity: 1 },
  ]);
  assert.deepEqual(resolveEnemyDrops("plain-slime", () => 0), [
    { itemId: "plain-slime-gel", quantity: 1 },
    { itemId: "plain-slime-mucus", quantity: 1 },
    { itemId: "plain-slime-magic-core", quantity: 1 },
  ]);
  assert.deepEqual(resolveEnemyDrops("poison-mushroom", () => 0).map((entry) => entry.itemId), [
    "poison-mushroom-cap", "poison-mushroom-mycelium", "poison-mushroom-toxic-spore",
  ]);
});

test("ドロップ抽選に外れた場合は素材を獲得せず、未知の敵も空になる", () => {
  assert.deepEqual(resolveEnemyDrops("slime", () => 0.99), []);
  assert.deepEqual(resolveEnemyDrops("unknown-enemy", () => 0), []);
});

test("中ボスも個別素材を落とし、大ボスは専用素材を確定で落とす", () => {
  assert.deepEqual(resolveEnemyDrops("grandvel", () => 0), [
    { itemId: "grandvel-giant-horn", quantity: 1 },
    { itemId: "grandvel-guardian-fur", quantity: 1 },
    { itemId: "grandvel-deep-green-crystal", quantity: 1 },
  ]);
  assert.deepEqual(resolveEnemyDrops("forest-dragon", () => 0.99), [
    { itemId: "forest-dragon-scale", quantity: 1 },
  ]);
  assert.deepEqual(resolveEnemyDrops("forest-dragon", () => 0), [
    { itemId: "forest-dragon-scale", quantity: 1 },
    { itemId: "forest-dragon-heart", quantity: 1 },
  ]);
});

test("不正な乱数関数や範囲外の戻り値は拒否する", () => {
  assert.throws(() => resolveEnemyDrops("slime", null), TypeError);
  assert.throws(() => resolveEnemyDrops("slime", () => 1), RangeError);
});
