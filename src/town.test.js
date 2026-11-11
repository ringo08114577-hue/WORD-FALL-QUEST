import test from "node:test";
import assert from "node:assert/strict";
import { createGameStore, GAME_ACTION, GAME_PHASE } from "./game-state.js";
import { createDungeonController } from "./dungeon.js";
import { createTownController, INN_REST_COST } from "./town.js";

test("宿屋は10GでHPを全回復し、進行中のバトルは一時停止状態のまま保つ", () => {
  const store = createGameStore();
  const dungeon = createDungeonController(store);
  const town = createTownController(store);
  dungeon.start();
  store.dispatch({ type: GAME_ACTION.DAMAGE_PLAYER, amount: 2 });
  store.dispatch({ type: GAME_ACTION.PAUSE_BATTLE });
  store.dispatch({ type: GAME_ACTION.ADD_GOLD, amount: INN_REST_COST });

  const result = town.restAtInn();
  assert.equal(result.rested, true);
  assert.equal(result.cost, 10);
  assert.equal(result.restored, 2);
  assert.equal(result.hp, result.maxHp);
  assert.equal(result.gold, 0);
  assert.equal(store.getState().phase, GAME_PHASE.PAUSED);
  assert.equal(store.getState().enemy.id, "slime");
});

test("HP満タン・ゴールド不足・敗北中の宿屋利用を拒否する", () => {
  const fullStore = createGameStore();
  const fullTown = createTownController(fullStore);
  assert.equal(fullTown.restAtInn().reason, "already-full");

  const poorStore = createGameStore();
  const poorDungeon = createDungeonController(poorStore);
  const poorTown = createTownController(poorStore);
  poorDungeon.start();
  poorStore.dispatch({ type: GAME_ACTION.DAMAGE_PLAYER, amount: 1 });
  poorStore.dispatch({ type: GAME_ACTION.PAUSE_BATTLE });
  assert.equal(poorTown.restAtInn().reason, "not-enough-gold");

  const defeatedStore = createGameStore({ playerMaxHp: 1 });
  const defeatedDungeon = createDungeonController(defeatedStore);
  const defeatedTown = createTownController(defeatedStore);
  defeatedDungeon.start();
  defeatedStore.dispatch({ type: GAME_ACTION.DAMAGE_PLAYER, amount: 1 });
  defeatedStore.dispatch({ type: GAME_ACTION.ADD_GOLD, amount: 50 });
  assert.equal(defeatedTown.restAtInn().reason, "not-in-town");
  assert.equal(defeatedStore.getState().player.hp, 0);
});

test("宿屋の料金はゲーム全体の設定から読み込む", () => {
  assert.equal(INN_REST_COST, 10);
});
