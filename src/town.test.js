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

test("ホーム帰還はレベル・所持品・装備・スキルを消さず、敗北状態も回復する", () => {
  const store = createGameStore({ playerMaxHp: 1 });
  const dungeon = createDungeonController(store);
  const town = createTownController(store, dungeon);
  dungeon.start();
  store.dispatch({ type: GAME_ACTION.ADD_GOLD, amount: 70 });
  store.dispatch({ type: GAME_ACTION.DAMAGE_PLAYER, amount: 1 });

  const result = town.returnToTown();
  assert.equal(result.fromPhase, GAME_PHASE.DEFEAT);
  assert.equal(store.getState().phase, GAME_PHASE.TITLE);
  assert.equal(store.getState().player.hp, 1);
  assert.equal(store.getState().inventory.gold, 70);
  assert.equal(store.getState().stats.enemiesDefeated, 0);
  assert.equal(dungeon.getProgress().started, false);
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
