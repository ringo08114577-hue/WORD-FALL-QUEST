import test from "node:test";
import assert from "node:assert/strict";

import { createGameStore, GAME_ACTION } from "./game-state.js";
import { createSellController } from "./sell.js";

test("素材を1個売ると所持数が減り、売値分のゴールドを獲得する", () => {
  const store = createGameStore();
  store.dispatch({ type: GAME_ACTION.ADD_ITEM, itemId: "slime-gel", quantity: 3 });
  const sell = createSellController(store);

  const result = sell.sell("slime-gel", 1);
  assert.equal(result.sold, true);
  assert.equal(result.quantity, 1);
  assert.equal(result.totalPrice, 4);
  assert.equal(result.remainingQuantity, 2);
  assert.equal(store.getState().inventory.items["slime-gel"], 2);
  assert.equal(store.getState().inventory.gold, 4);
  assert.match(store.getState().actionLog.at(-1).message, /グリーンスライムのゼリー ×1を売却（\+4G）/);
});

test("素材を全部売ると所持数0になり、個数分の合計ゴールドを獲得する", () => {
  const store = createGameStore();
  store.dispatch({ type: GAME_ACTION.ADD_ITEM, itemId: "bat-wing", quantity: 4 });
  const sell = createSellController(store);

  const result = sell.sell("bat-wing", 4);
  assert.equal(result.sold, true);
  assert.equal(result.totalPrice, 28);
  assert.equal(result.remainingQuantity, 0);
  assert.equal(store.getState().inventory.items["bat-wing"], 0);
  assert.equal(store.getState().inventory.gold, 28);
});

test("売却不可アイテム・未所持素材・不正な個数は売れない", () => {
  const store = createGameStore();
  store.dispatch({ type: GAME_ACTION.ADD_ITEM, itemId: "forest-dragon-seal", quantity: 1 });
  const sell = createSellController(store);

  assert.equal(sell.sell("small-potion").reason, "not-sellable");
  assert.equal(sell.sell("forest-dragon-seal").reason, "not-sellable");
  assert.equal(sell.sell("missing").reason, "not-sellable");
  assert.equal(sell.sell("slime-gel", 0).reason, "invalid-quantity");
  assert.equal(sell.sell("slime-gel", 1).reason, "not-enough-items");
  assert.equal(store.getState().inventory.gold, 0);
});

test("売却は街でのみ行え、戦闘中や一時停止中は売れない", () => {
  const store = createGameStore();
  store.dispatch({ type: GAME_ACTION.ADD_ITEM, itemId: "slime-gel", quantity: 2 });
  const sell = createSellController(store);

  store.dispatch({
    type: GAME_ACTION.START_BATTLE,
    enemy: { id: "slime", name: "スライム", maxHp: 1, attackPower: 1, experienceReward: 1, abilities: [], isBoss: false },
  });
  assert.equal(sell.sell("slime-gel").reason, "not-in-town");
  store.dispatch({ type: GAME_ACTION.PAUSE_BATTLE });
  assert.equal(sell.sell("slime-gel").reason, "not-in-town");
  assert.equal(store.getState().inventory.items["slime-gel"], 2);
  assert.equal(store.getState().inventory.gold, 0);
});

test("ゴールドの上限を超える売却は素材を消費せず拒否する", () => {
  const store = createGameStore();
  store.dispatch({ type: GAME_ACTION.ADD_ITEM, itemId: "slime-gel", quantity: 1 });
  store.dispatch({ type: GAME_ACTION.ADD_GOLD, amount: Number.MAX_SAFE_INTEGER });
  const sell = createSellController(store);

  assert.equal(sell.sell("slime-gel").reason, "gold-limit");
  assert.equal(store.getState().inventory.items["slime-gel"], 1);
  assert.equal(store.getState().inventory.gold, Number.MAX_SAFE_INTEGER);
});
