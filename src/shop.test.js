import test from "node:test";
import assert from "node:assert/strict";
import { createGameStore, GAME_ACTION } from "./game-state.js";
import { createDungeonController } from "./dungeon.js";
import { createShopController } from "./shop.js";

function defeatEnemy(store) {
  store.dispatch({ type: GAME_ACTION.DAMAGE_ENEMY, amount: store.getState().enemy.hp });
}
function clearFloor(store, dungeon) {
  dungeon.start();
  for (let i = 0; i < 3; i++) {
    defeatEnemy(store);
    if (i < 2) dungeon.advance();
  }
}
test("宝箱報酬を受け取った後だけショップで購入できる", () => {
  const store = createGameStore();
  const dungeon = createDungeonController(store);
  const shop = createShopController(store, dungeon);
  clearFloor(store, dungeon);

  assert.equal(shop.buy("small-potion").reason, "not-at-shop");
  dungeon.claimFloorReward();
  const before = store.getState().inventory.items["small-potion"];
  const result = shop.buy("small-potion");
  assert.equal(result.purchased, true);
  assert.equal(result.cost, 15);
  assert.equal(result.gold, 0);
  assert.equal(store.getState().inventory.items["small-potion"], before + 1);
});
test("ゴールド不足・未知の商品・ショップ外の購入を拒否する", () => {
  const store = createGameStore();
  const dungeon = createDungeonController(store);
  const shop = createShopController(store, dungeon);
  assert.equal(shop.buy("unknown").reason, "unknown-item");
  assert.equal(shop.buy("small-potion").reason, "not-at-shop");
  clearFloor(store, dungeon);
  dungeon.claimFloorReward();
  assert.equal(store.getState().inventory.gold, 15);
  assert.equal(shop.buy("large-potion").reason, "not-enough-gold");
  assert.equal(store.getState().inventory.gold, 15);
});
test("ショップで購入したアイテムとゴールドが正しく更新される", () => {
  const store = createGameStore();
  const dungeon = createDungeonController(store);
  const shop = createShopController(store, dungeon);
  clearFloor(store, dungeon);
  dungeon.claimFloorReward();
  store.dispatch({ type: GAME_ACTION.ADD_GOLD, amount: 20 });
  const result = shop.buy("large-potion");
  assert.equal(result.purchased, true);
  assert.equal(result.gold, 5);
  assert.equal(store.getState().inventory.items["large-potion"], 1);
});
