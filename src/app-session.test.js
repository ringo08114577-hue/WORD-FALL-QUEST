import test from "node:test";
import assert from "node:assert/strict";
import { createAppSession } from "./app-session.js";
import { GAME_ACTION, GAME_PHASE } from "./game-state.js";

function memoryStorage() {
  const values = new Map();
  return {
    getItem(key) { return values.has(key) ? values.get(key) : null; },
    setItem(key, value) { values.set(key, String(value)); },
    removeItem(key) { values.delete(key); },
  };
}

test("共通セッションはホームと施設ページで同じ保存データを読み書きできる", () => {
  const storage = memoryStorage();
  const first = createAppSession({ storage });
  assert.equal(first.initialLoad.reason, "save-not-found");
  first.store.dispatch({ type: GAME_ACTION.ADD_GOLD, amount: 42 });
  assert.equal(first.save().saved, true);

  const second = createAppSession({ storage });
  assert.equal(second.initialLoad.loaded, true);
  assert.equal(second.store.getState().inventory.gold, 42);
  assert.equal(second.store.getState().phase, GAME_PHASE.TITLE);
});

test("共通セッションからホームへ戻ると挑戦中の階層をリセットしHPを全回復する", () => {
  const storage = memoryStorage();
  const session = createAppSession({ storage });
  session.dungeon.start();
  session.store.dispatch({ type: GAME_ACTION.DAMAGE_PLAYER, amount: 1 });
  session.store.dispatch({ type: GAME_ACTION.PAUSE_BATTLE });

  const result = session.returnToTown();
  assert.equal(result.phase, GAME_PHASE.TITLE);
  assert.equal(session.store.getState().player.hp, session.store.getState().player.maxHp);
  assert.equal(session.store.getState().enemy, null);
  assert.equal(session.dungeon.getProgress().started, false);
  assert.equal(session.dungeon.getProgress().enemyNumber, 1);
  assert.equal(session.saves.save().saved, true);

  const restored = createAppSession({ storage });
  assert.equal(restored.initialLoad.loaded, true);
  assert.equal(restored.store.getState().phase, GAME_PHASE.TITLE);
  assert.equal(restored.dungeon.getProgress().enemyNumber, 1);
});
