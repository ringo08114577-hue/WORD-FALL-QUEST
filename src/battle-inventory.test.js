import test from "node:test";
import assert from "node:assert/strict";

import { getBattleRecoveryItems } from "./battle-inventory.js";

test("battle inventory includes only owned healing consumables", () => {
  const result = getBattleRecoveryItems({
    items: {
      "small-potion": 2,
      "large-potion": 1,
      "wooden-sword": 1,
      "slime-gel": 9,
      "not-owned": 0,
    },
  });
  assert.deepEqual(result.map(({ itemId, quantity, item }) => ({
    itemId, quantity, effect: item.effect,
  })), [
    { itemId: "small-potion", quantity: 2, effect: "heal" },
    { itemId: "large-potion", quantity: 1, effect: "heal" },
  ]);
});

test("non-healing consumables and owned equipment/materials are excluded", () => {
  const definitions = {
    potion: { id: "potion", type: "consumable", effect: "heal", healAmount: 20 },
    antidote: { id: "antidote", type: "consumable", effect: "cure-poison" },
    sword: { id: "sword", type: "weapon", slot: "weapon" },
    ore: { id: "ore", type: "material" },
  };
  const result = getBattleRecoveryItems({
    items: { potion: 1, antidote: 5, sword: 1, ore: 20 },
  }, definitions);
  assert.deepEqual(result.map((entry) => entry.itemId), ["potion"]);
});

test("empty, missing, or invalid inventory data returns no battle items", () => {
  assert.deepEqual(getBattleRecoveryItems(null), []);
  assert.deepEqual(getBattleRecoveryItems({}), []);
  assert.deepEqual(getBattleRecoveryItems({ items: null }), []);
  assert.deepEqual(getBattleRecoveryItems({ items: [] }), []);
  assert.deepEqual(getBattleRecoveryItems({ items: { potion: -1 } }, {
    potion: { type: "consumable", effect: "heal" },
  }), []);
});
