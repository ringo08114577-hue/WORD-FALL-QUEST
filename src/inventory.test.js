import test from "node:test";
import assert from "node:assert/strict";
import { createInitialInventory } from "./items.js";
import {
  INVENTORY_CATEGORIES,
  getInventoryCategory,
  getOwnedInventoryItems,
} from "./inventory.js";
import { ITEM_DEFINITIONS } from "./data/items.js";

test("アイテム欄は装備・道具・その他の3分類を持つ", () => {
  assert.deepEqual(
    INVENTORY_CATEGORIES.map(({ id, label }) => [id, label]),
    [["weapon", "装備"], ["tool", "道具"], ["other", "その他"]],
  );
});

test("装備品・消費アイテム・素材を正しい分類に分ける", () => {
  assert.equal(getInventoryCategory(ITEM_DEFINITIONS["wooden-sword"]), "weapon");
  assert.equal(getInventoryCategory(ITEM_DEFINITIONS["wooden-shield"]), "weapon");
  assert.equal(getInventoryCategory(ITEM_DEFINITIONS["leather-armor"]), "weapon");
  assert.equal(getInventoryCategory(ITEM_DEFINITIONS["small-potion"]), "tool");
  assert.equal(getInventoryCategory(ITEM_DEFINITIONS["forest-dragon-seal"]), "other");
  assert.equal(getInventoryCategory(ITEM_DEFINITIONS["ice-dragon-core"]), "other");
});

test("所持数があるものだけを表示し、個数と装備状態も取得する", () => {
  const inventory = createInitialInventory();
  inventory.items["forest-dragon-seal"] = 2;
  inventory.equipment.weapon = "wooden-sword";

  const weapons = getOwnedInventoryItems(inventory, "weapon");
  const tools = getOwnedInventoryItems(inventory, "tool");
  const others = getOwnedInventoryItems(inventory, "other");

  assert.deepEqual(weapons.map(({ itemId, quantity, equipped }) => [
    itemId, quantity, equipped,
  ]), [["wooden-sword", 1, true]]);
  assert.deepEqual(tools.map(({ itemId, quantity }) => [itemId, quantity]), [
    ["small-potion", 2],
  ]);
  assert.deepEqual(others.map(({ itemId, quantity }) => [
    itemId, quantity,
  ]), [["forest-dragon-seal", 2]]);
  assert.equal(getOwnedInventoryItems(inventory).length, 3);
});

test("装備中のアイテムは所持数0でもアイテム欄に表示される", () => {
  const inventory = createInitialInventory();
  inventory.items["wooden-sword"] = 0;
  inventory.equipment.weapon = "wooden-sword";

  const weapons = getOwnedInventoryItems(inventory, "weapon");
  assert.equal(weapons.length, 1);
  assert.equal(weapons[0].itemId, "wooden-sword");
  assert.equal(weapons[0].quantity, 0);
  assert.equal(weapons[0].equipped, true);
});

test("不正な分類や所持データでは空の一覧を返す", () => {
  const inventory = createInitialInventory();
  assert.deepEqual(getOwnedInventoryItems(inventory, "unknown"), []);
  assert.deepEqual(getOwnedInventoryItems(null, "weapon"), []);
  assert.deepEqual(getOwnedInventoryItems({ items: null }, "weapon"), []);
});
