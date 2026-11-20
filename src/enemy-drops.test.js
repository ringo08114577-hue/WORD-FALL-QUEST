import test from "node:test";
import assert from "node:assert/strict";

import { ENEMY_DEFINITIONS } from "./data/enemies.js";
import { ITEM_DEFINITIONS } from "./data/items.js";
import { ENEMY_DROP_TABLES } from "./data/enemy-drops.js";
import { resolveEnemyDrops } from "./enemy-drops.js";

test("すべての敵に有効な素材ドロップテーブルが登録されている", () => {
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

test("ドロップ率に当たると素材を獲得し、個数は設定範囲内になる", () => {
  const drops = resolveEnemyDrops("slime", () => 0);
  assert.deepEqual(drops, [{ itemId: "slime-gel", quantity: 1 }]);

  const twoGels = resolveEnemyDrops("slime", (() => {
    const values = [0, 0.99];
    return () => values.shift() ?? 0;
  })());
  assert.deepEqual(twoGels, [{ itemId: "slime-gel", quantity: 2 }]);
});

test("ドロップ抽選に外れた場合は素材を獲得せず、未知の敵も空になる", () => {
  assert.deepEqual(resolveEnemyDrops("slime", () => 0.99), []);
  assert.deepEqual(resolveEnemyDrops("unknown-enemy", () => 0), []);
});

test("ボスは通常素材を必ず落とし、レア素材は追加抽選になる", () => {
  const drops = resolveEnemyDrops("forest-dragon", () => 0.99);
  assert.deepEqual(drops, [{ itemId: "forest-dragon-scale", quantity: 1 }]);

  const rareDrops = resolveEnemyDrops("forest-dragon", () => 0);
  assert.deepEqual(rareDrops, [
    { itemId: "forest-dragon-scale", quantity: 1 },
    { itemId: "forest-dragon-heart", quantity: 1 },
  ]);
});

test("不正な乱数関数や範囲外の戻り値は拒否する", () => {
  assert.throws(() => resolveEnemyDrops("slime", null), TypeError);
  assert.throws(() => resolveEnemyDrops("slime", () => 1), RangeError);
});
