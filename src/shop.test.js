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
test("フロアクリア後は宝箱報酬で得たゴールドをショップで利用できる", () => {
  const store = createGameStore();
  const dungeon = createDungeonController(store);
  const shop = createShopController(store, dungeon);
  clearFloor(store, dungeon);

  assert.equal(shop.buy("small-potion").reason, "not-enough-gold");
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
  assert.equal(shop.buy("toString").reason, "unknown-item");
  assert.equal(shop.buy("small-potion").reason, "not-enough-gold");
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


test("木の盾を30Gで購入でき、所持品に追加される", () => {
  const store = createGameStore();
  const dungeon = createDungeonController(store);
  const shop = createShopController(store, dungeon);
  clearFloor(store, dungeon);
  dungeon.claimFloorReward();
  store.dispatch({ type: GAME_ACTION.ADD_GOLD, amount: 15 });

  const result = shop.buy("wooden-shield");
  assert.equal(result.purchased, true);
  assert.equal(result.cost, 30);
  assert.equal(result.gold, 0);
  assert.equal(store.getState().inventory.items["wooden-shield"], 1);
});


test("ショップは追加された装備もカタログ定義から購入できる", () => {
  const store = createGameStore();
  const dungeon = createDungeonController(store);
  const shop = createShopController(store, dungeon);
  clearFloor(store, dungeon);
  dungeon.claimFloorReward();
  store.dispatch({ type: GAME_ACTION.ADD_GOLD, amount: 65 });

  const result = shop.buy("iron-sword");
  assert.equal(result.purchased, true);
  assert.equal(result.cost, 80);
  assert.equal(store.getState().inventory.items["iron-sword"], 1);
  assert.equal(store.getState().inventory.gold, 0);
});


test("街のショップは出発前と一時停止中に利用でき、戦闘中は利用できない", () => {
  const store = createGameStore();
  const dungeon = createDungeonController(store);
  const shop = createShopController(store, dungeon);
  store.dispatch({ type: GAME_ACTION.ADD_GOLD, amount: 60 });

  const beforeStart = shop.buy("small-potion");
  assert.equal(beforeStart.purchased, true);
  assert.equal(beforeStart.gold, 45);

  dungeon.start();
  assert.equal(shop.buy("large-potion").reason, "not-at-shop");

  store.dispatch({ type: GAME_ACTION.PAUSE_BATTLE });
  const whilePaused = shop.buy("large-potion");
  assert.equal(whilePaused.purchased, true);
  assert.equal(whilePaused.gold, 15);
  assert.equal(store.getState().inventory.items["large-potion"], 1);
});

test("敗北中は街のショップを利用できない", () => {
  const store = createGameStore({ playerMaxHp: 1 });
  const dungeon = createDungeonController(store);
  const shop = createShopController(store, dungeon);
  store.dispatch({ type: GAME_ACTION.ADD_GOLD, amount: 30 });
  dungeon.start();
  store.dispatch({ type: GAME_ACTION.DAMAGE_PLAYER, amount: 1 });
  assert.equal(shop.buy("small-potion").reason, "not-at-shop");
  assert.equal(store.getState().inventory.gold, 30);
});
