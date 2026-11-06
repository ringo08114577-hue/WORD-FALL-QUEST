import test from "node:test";
import assert from "node:assert/strict";
import { createGameStore, GAME_ACTION, GAME_PHASE } from "./game-state.js";
import { createDungeonController } from "./dungeon.js";
import { createWordBattleState, restoreWordBattleState } from "./word-battle.js";
import { createSaveController, SAVE_STORAGE_KEY } from "./save-system.js";

function memoryStorage() {
  const values = new Map();
  return {
    getItem(key) { return values.has(key) ? values.get(key) : null; },
    setItem(key, value) { values.set(key, String(value)); },
    removeItem(key) { values.delete(key); },
    values,
  };
}
function setup(storage, extra = {}) {
  const store = createGameStore();
  const dungeon = createDungeonController(store);
  let restoredExtra = extra;
  const controller = createSaveController({
    store,
    dungeon,
    storage,
    getExtraData: () => extra,
    validateExtraData: (value) =>
      value && typeof value === "object" &&
      restoreWordBattleState(value.wordState) !== null &&
      Number.isFinite(value.spawnElapsed) && value.spawnElapsed >= 0,
    restoreExtraData: (value) => { restoredExtra = value; },
  });
  return { store, dungeon, controller, getRestoredExtra: () => restoredExtra };
}
function winEnemy(store) {
  store.dispatch({
    type: GAME_ACTION.DAMAGE_ENEMY,
    amount: store.getState().enemy.hp,
  });
}

test("戦闘中のゲーム・ダンジョン・お題進行を保存して復元できる", () => {
  const storage = memoryStorage();
  const originalWordState = createWordBattleState();
  const extra = { wordState: originalWordState, spawnElapsed: 360 };
  const first = setup(storage, extra);
  first.dungeon.start();
  first.store.dispatch({ type: GAME_ACTION.DAMAGE_PLAYER, amount: 1 });
  const saved = first.controller.save();
  assert.equal(saved.saved, true);

  const second = setup(storage, {
    wordState: createWordBattleState(),
    spawnElapsed: 0,
  });
  const loaded = second.controller.load();
  assert.equal(loaded.loaded, true);
  assert.equal(second.store.getState().phase, GAME_PHASE.BATTLE);
  assert.equal(second.store.getState().player.hp, 2);
  assert.equal(second.store.getState().enemy.id, "slime");
  assert.deepEqual(second.dungeon.getProgress(), first.dungeon.getProgress());
  assert.equal(second.getRestoredExtra().spawnElapsed, 360);
});

test("フロアクリア後・報酬受取済みの状態も復元しショップ進行を保持する", () => {
  const storage = memoryStorage();
  const first = setup(storage, {
    wordState: createWordBattleState(),
    spawnElapsed: 0,
  });
  first.dungeon.start();
  winEnemy(first.store);
  first.dungeon.advance();
  winEnemy(first.store);
  first.dungeon.advance();
  winEnemy(first.store);
  first.dungeon.claimFloorReward();
  first.store.dispatch({ type: GAME_ACTION.ADD_GOLD, amount: 5 });
  assert.equal(first.controller.save().saved, true);

  const second = setup(storage, {
    wordState: createWordBattleState(),
    spawnElapsed: 0,
  });
  assert.equal(second.controller.load().loaded, true);
  assert.equal(second.dungeon.getProgress().floorCleared, true);
  assert.equal(second.dungeon.getProgress().rewardClaimed, true);
  assert.equal(second.store.getState().inventory.gold, 20);
});

test("壊れたセーブや不正なお題進行はゲーム状態を変更しない", () => {
  const storage = memoryStorage();
  const first = setup(storage, {
    wordState: createWordBattleState(),
    spawnElapsed: 0,
  });
  first.dungeon.start();
  first.controller.save();

  const bad = JSON.parse(storage.getItem(SAVE_STORAGE_KEY));
  bad.gameState.player.hp = 999;
  storage.setItem(SAVE_STORAGE_KEY, JSON.stringify(bad));

  const second = setup(storage, {
    wordState: createWordBattleState(),
    spawnElapsed: 0,
  });
  const loaded = second.controller.load();
  assert.equal(loaded.loaded, false);
  assert.equal(second.store.getState().phase, GAME_PHASE.TITLE);
  assert.equal(second.dungeon.getProgress().started, false);
});

test("セーブがない場合やJSONが壊れている場合は安全に失敗する", () => {
  const storage = memoryStorage();
  const setupData = setup(storage, {
    wordState: createWordBattleState(),
    spawnElapsed: 0,
  });
  assert.equal(setupData.controller.load().reason, "save-not-found");
  storage.setItem(SAVE_STORAGE_KEY, "{broken");
  assert.equal(setupData.controller.load().loaded, false);
});

test("ストレージ書き込みエラーをゲーム動作に波及させない", () => {
  const storage = {
    getItem() { return null; },
    setItem() { throw new Error("quota"); },
    removeItem() {},
  };
  const data = setup(storage, {
    wordState: createWordBattleState(),
    spawnElapsed: 0,
  });
  data.dungeon.start();
  assert.equal(data.controller.save().reason, "storage-write-failed");
  assert.equal(data.store.getState().phase, GAME_PHASE.BATTLE);
});
