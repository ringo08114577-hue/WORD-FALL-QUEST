import test from "node:test";
import assert from "node:assert/strict";
import { createGameStore, GAME_ACTION, GAME_PHASE } from "./game-state.js";
import { createDungeonController } from "./dungeon.js";
import { createTownController } from "./town.js";

test("ホームへ戻るとHPが全回復し、挑戦中の階層は最初の敵からやり直しになる", () => {
  const store = createGameStore();
  const dungeon = createDungeonController(store);
  const town = createTownController(store, dungeon);
  dungeon.start();
  store.dispatch({ type: GAME_ACTION.DAMAGE_PLAYER, amount: 2 });
  store.dispatch({ type: GAME_ACTION.PAUSE_BATTLE });

  const result = town.returnToTown();
  assert.equal(result.phase, GAME_PHASE.TITLE);
  assert.equal(result.restoredHp, 2);
  assert.equal(store.getState().player.hp, store.getState().player.maxHp);
  assert.equal(store.getState().enemy, null);
  assert.equal(dungeon.getProgress().started, false);
  assert.equal(dungeon.getProgress().enemyNumber, 1);
  assert.equal(dungeon.start().enemy.id, "slime");
});

test("敗北から街へ戻っても育成・所持品を保持し、同じ階を再挑戦できる", () => {
  const store = createGameStore({ playerMaxHp: 1 });
  const dungeon = createDungeonController(store);
  const town = createTownController(store, dungeon);
  store.dispatch({ type: GAME_ACTION.ADD_GOLD, amount: 70 });
  store.dispatch({ type: GAME_ACTION.UPGRADE_SKILL, skillId: "quick-strike" });
  store.dispatch({ type: GAME_ACTION.ADD_ITEM, itemId: "large-potion", quantity: 2 });
  dungeon.start();

  // Defeat the first enemy to gain one level, then lose the next encounter.
  store.dispatch({ type: GAME_ACTION.DAMAGE_ENEMY, amount: store.getState().enemy.hp });
  assert.equal(store.getState().player.level, 2);
  assert.equal(dungeon.advance().started, true);
  store.dispatch({ type: GAME_ACTION.DAMAGE_PLAYER, amount: store.getState().player.hp });

  const result = town.returnToTown();
  const state = store.getState();
  assert.equal(result.fromPhase, GAME_PHASE.DEFEAT);
  assert.equal(state.phase, GAME_PHASE.TITLE);
  assert.equal(state.player.hp, state.player.maxHp);
  assert.equal(state.player.level, 2);
  assert.equal(state.player.maxHp, 2);
  assert.equal(state.player.attackPower, 2);
  assert.equal(state.skillLevels["quick-strike"], 2);
  assert.equal(state.inventory.gold, 20);
  assert.equal(state.inventory.items["large-potion"], 2);
  assert.equal(state.stats.enemiesDefeated, 1);
  assert.equal(state.stats.totalExperienceEarned, 10);
  assert.equal(dungeon.getProgress().started, false);
  assert.equal(dungeon.getProgress().enemyNumber, 1);
  assert.equal(dungeon.start().enemy.id, "slime");
});

test("ホームにいるときに戻ってもデータを不必要に変更しない", () => {
  const store = createGameStore();
  const dungeon = createDungeonController(store);
  const town = createTownController(store, dungeon);
  const before = store.getState();
  const result = town.returnToTown();
  assert.equal(result.returned, false);
  assert.equal(store.getState(), before);
});
