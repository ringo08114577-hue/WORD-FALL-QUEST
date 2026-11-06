import test from "node:test";
import assert from "node:assert/strict";
import { createGameStore, createInitialGameState, GAME_ACTION, GAME_PHASE } from "./game-state.js";
import { createDungeonController } from "./dungeon.js";
import { createWordBattleState, spawnFallingLetter, collectLetter, restoreWordBattleState } from "./word-battle.js";
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
  const firstLetter = spawnFallingLetter(createWordBattleState(), { random: () => 0 });
  const afterFirstLetter = collectLetter(firstLetter, 1).state;
  const originalWordState = spawnFallingLetter(afterFirstLetter, { random: () => 0 });
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
  assert.equal(second.getRestoredExtra().wordState.progressIndex, 1);
  assert.equal(second.getRestoredExtra().wordState.letters[0].value, "P");
  assert.deepEqual(
    restoreWordBattleState(second.getRestoredExtra().wordState),
    second.getRestoredExtra().wordState,
  );
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


test("保存データ削除は保存領域からデータを取り除く", () => {
  const storage = memoryStorage();
  const data = setup(storage, {
    wordState: createWordBattleState(),
    spawnElapsed: 0,
  });
  data.dungeon.start();
  assert.equal(data.controller.save().saved, true);
  assert.equal(storage.getItem(SAVE_STORAGE_KEY) !== null, true);
  assert.equal(data.controller.clear().cleared, true);
  assert.equal(storage.getItem(SAVE_STORAGE_KEY), null);
});


test("STEP 9の旧セーブデータを盾対応の新形式へ移行できる", () => {
  const storage = memoryStorage();
  const oldState = structuredClone(createInitialGameState());
  delete oldState.player.baseDefensePower;
  delete oldState.player.defensePower;
  delete oldState.inventory.items["wooden-shield"];
  delete oldState.inventory.equipment.shield;
  storage.setItem(SAVE_STORAGE_KEY, JSON.stringify({
    version: 1,
    savedAt: "2026-11-06T00:00:00.000Z",
    gameState: oldState,
    dungeonState: {
      floor: 1,
      enemyIndex: 0,
      started: false,
      rewardClaimed: false,
    },
    extra: {
      wordState: createWordBattleState(),
      spawnElapsed: 0,
    },
  }));

  const data = setup(storage, {
    wordState: createWordBattleState(),
    spawnElapsed: 0,
  });
  const result = data.controller.load();
  assert.equal(result.loaded, true);
  assert.equal(data.store.getState().player.defensePower, 0);
  assert.equal(data.store.getState().inventory.items["wooden-shield"], 0);
  assert.equal(data.store.getState().inventory.equipment.shield, null);
  assert.equal(
    JSON.parse(storage.getItem(SAVE_STORAGE_KEY)).version,
    1,
    "ロードだけでは元データを上書きしない",
  );
  assert.equal(data.controller.save().saved, true);
  assert.equal(
    JSON.parse(storage.getItem(SAVE_STORAGE_KEY)).version,
    2,
  );
});


test("装備中の盾と防御力をセーブ・ロードで引き継ぐ", () => {
  const storage = memoryStorage();
  const first = setup(storage, {
    wordState: createWordBattleState(),
    spawnElapsed: 0,
  });
  first.dungeon.start();
  first.store.dispatch({ type: GAME_ACTION.ADD_ITEM, itemId: "wooden-shield" });
  first.store.dispatch({
    type: GAME_ACTION.EQUIP_SHIELD,
    itemId: "wooden-shield",
  });
  assert.equal(first.store.getState().player.defensePower, 1);
  assert.equal(first.controller.save().saved, true);

  const second = setup(storage, {
    wordState: createWordBattleState(),
    spawnElapsed: 0,
  });
  assert.equal(second.controller.load().loaded, true);
  assert.equal(second.store.getState().player.defensePower, 1);
  assert.equal(second.store.getState().inventory.equipment.shield, "wooden-shield");
  assert.equal(second.store.getState().inventory.items["wooden-shield"], 0);
});
