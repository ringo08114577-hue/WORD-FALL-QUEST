import test from "node:test";
import assert from "node:assert/strict";
import { createGameStore, GAME_ACTION, GAME_PHASE } from "./game-state.js";
import { createCraftingController } from "./crafting.js";

function addMaterials(store, materials) {
  for (const [itemId, quantity] of Object.entries(materials)) {
    store.dispatch({ type: GAME_ACTION.ADD_ITEM, itemId, quantity });
  }
}

test("必要素材とゴールドを消費して装備を作成し、所持品と行動ログに反映する", () => {
  const store = createGameStore();
  const crafting = createCraftingController(store);
  addMaterials(store, { "slime-gel": 5 });
  store.dispatch({ type: GAME_ACTION.ADD_GOLD, amount: 35 });

  const result = crafting.craft("slime-buckler");

  assert.equal(result.crafted, true);
  assert.equal(result.item.id, "slime-buckler");
  assert.equal(store.getState().inventory.items["slime-gel"], 0);
  assert.equal(store.getState().inventory.items["slime-buckler"], 1);
  assert.equal(store.getState().inventory.gold, 0);
  assert.equal(store.getState().actionLog.at(-1).category, "equipment");
  assert.match(store.getState().actionLog.at(-1).message, /スライムバックラー/);
});

test("素材不足・ゴールド不足・未知のレシピでは何も消費しない", () => {
  const store = createGameStore();
  const crafting = createCraftingController(store);
  addMaterials(store, { "slime-gel": 4 });
  store.dispatch({ type: GAME_ACTION.ADD_GOLD, amount: 34 });

  assert.equal(crafting.craft("slime-buckler").reason, "not-enough-materials");
  assert.equal(store.getState().inventory.items["slime-gel"], 4);
  assert.equal(store.getState().inventory.gold, 34);

  store.dispatch({ type: GAME_ACTION.ADD_ITEM, itemId: "slime-gel", quantity: 1 });
  assert.equal(crafting.craft("slime-buckler").reason, "not-enough-gold");
  assert.equal(crafting.craft("unknown-item").reason, "unknown-recipe");
  assert.equal(store.getState().inventory.items["slime-gel"], 5);
  assert.equal(store.getState().inventory.items["slime-buckler"], 0);
});

test("鍛冶屋は街にいるときだけ利用できる", () => {
  const store = createGameStore();
  const crafting = createCraftingController(store);
  addMaterials(store, { "slime-gel": 5 });
  store.dispatch({ type: GAME_ACTION.ADD_GOLD, amount: 35 });
  store.dispatch({
    type: GAME_ACTION.START_BATTLE,
    enemy: { id: "slime", name: "スライム", maxHp: 10, attackPower: 1 },
  });

  assert.equal(crafting.craft("slime-buckler").reason, "not-at-smithy");
  store.dispatch({ type: GAME_ACTION.PAUSE_BATTLE });
  assert.equal(store.getState().phase, GAME_PHASE.PAUSED);
  assert.equal(crafting.craft("slime-buckler").reason, "not-at-smithy");
  assert.equal(store.getState().inventory.items["slime-gel"], 5);

  store.dispatch({ type: GAME_ACTION.RETURN_TO_TOWN });
  assert.equal(crafting.craft("slime-buckler").crafted, true);
});

test("リデューサーはレシピ外の装備生成や街以外での作成を拒否する", () => {
  let store = createGameStore();
  const before = store.getState();
  const invalid = store.dispatch({ type: GAME_ACTION.CRAFT_ITEM, itemId: "iron-sword" });
  assert.equal(invalid, before);

  addMaterials(store, { "slime-gel": 5 });
  store.dispatch({ type: GAME_ACTION.ADD_GOLD, amount: 35 });
  store.dispatch({
    type: GAME_ACTION.START_BATTLE,
    enemy: { id: "slime", name: "スライム", maxHp: 10, attackPower: 1 },
  });
  const battleState = store.getState();
  assert.equal(store.dispatch({ type: GAME_ACTION.CRAFT_ITEM, itemId: "slime-buckler" }), battleState);
  assert.equal(store.getState().inventory.items["slime-buckler"], 0);
  assert.equal(store.getState().inventory.items["slime-gel"], 5);
});
