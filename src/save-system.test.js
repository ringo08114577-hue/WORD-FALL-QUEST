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


test("旧セーブデータを拡張装備対応の新形式へ移行できる", () => {
  const storage = memoryStorage();
  const oldState = structuredClone(createInitialGameState());
  delete oldState.player.baseDefensePower;
  delete oldState.player.defensePower;
  for (const itemId of ["wooden-shield", "iron-sword", "leather-armor", "copper-charm"]) {
    delete oldState.inventory.items[itemId];
  }
  delete oldState.inventory.equipment.shield;
  delete oldState.inventory.equipment.armor;
  delete oldState.inventory.equipment.accessory;
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
    JSON.parse(storage.getItem(SAVE_STORAGE_KEY)).version, 5,
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


test("STEP 10形式のセーブデータを追加装備スロットへ移行できる", () => {
  const storage = memoryStorage();
  const oldState = structuredClone(createInitialGameState());
  for (const itemId of ["iron-sword", "leather-armor", "copper-charm"]) {
    delete oldState.inventory.items[itemId];
  }
  delete oldState.inventory.equipment.armor;
  delete oldState.inventory.equipment.accessory;

  storage.setItem(SAVE_STORAGE_KEY, JSON.stringify({
    version: 2,
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
  assert.equal(data.store.getState().inventory.items["iron-sword"], 0);
  assert.equal(data.store.getState().inventory.items["leather-armor"], 0);
  assert.equal(data.store.getState().inventory.items["copper-charm"], 0);
  assert.equal(data.store.getState().inventory.equipment.armor, null);
  assert.equal(data.store.getState().inventory.equipment.accessory, null);
});

test("鎧とアクセサリーの装備状態もセーブ・ロードで保持する", () => {
  const storage = memoryStorage();
  const first = setup(storage, {
    wordState: createWordBattleState(),
    spawnElapsed: 0,
  });
  first.dungeon.start();
  first.store.dispatch({ type: GAME_ACTION.ADD_ITEM, itemId: "leather-armor" });
  first.store.dispatch({ type: GAME_ACTION.ADD_ITEM, itemId: "copper-charm" });
  first.store.dispatch({ type: GAME_ACTION.EQUIP_ITEM, itemId: "leather-armor" });
  first.store.dispatch({ type: GAME_ACTION.EQUIP_ITEM, itemId: "copper-charm" });
  assert.equal(first.store.getState().player.attackPower, 2);
  assert.equal(first.store.getState().player.defensePower, 2);
  assert.equal(first.controller.save().saved, true);

  const second = setup(storage, {
    wordState: createWordBattleState(),
    spawnElapsed: 0,
  });
  assert.equal(second.controller.load().loaded, true);
  assert.equal(second.store.getState().inventory.equipment.armor, "leather-armor");
  assert.equal(second.store.getState().inventory.equipment.accessory, "copper-charm");
  assert.equal(second.store.getState().player.attackPower, 2);
  assert.equal(second.store.getState().player.defensePower, 2);
});


test("バージョン3のセーブは旧敵編成を保ったまま能力データ形式へ移行する", () => {
  const storage = memoryStorage();
  const first = setup(storage, {
    wordState: createWordBattleState(), spawnElapsed: 0,
  });
  first.dungeon.start();
  assert.equal(first.controller.save().saved, true);

  const legacy = JSON.parse(storage.getItem(SAVE_STORAGE_KEY));
  legacy.version = 3;
  delete legacy.gameState.enemy.abilities;
  delete legacy.gameState.enemy.isBoss;
  delete legacy.dungeonState.encounterSetVersion;
  storage.setItem(SAVE_STORAGE_KEY, JSON.stringify(legacy));

  const second = setup(storage, {
    wordState: createWordBattleState(), spawnElapsed: 0,
  });
  const result = second.controller.load();
  assert.equal(result.loaded, true);
  assert.deepEqual(second.store.getState().enemy.abilities, []);
  assert.equal(second.store.getState().enemy.isBoss, false);
  assert.equal(second.dungeon.getSaveData().encounterSetVersion, 1);
  assert.equal(second.controller.save().saved, true);
  assert.equal(JSON.parse(storage.getItem(SAVE_STORAGE_KEY)).version, 5);
});


test("一時停止中のバトルを保存・ロードしても停止状態と進行を保持する", () => {
  const storage = memoryStorage();
  const extra = {
    wordState: createWordBattleState(),
    spawnElapsed: 0,
    attackElapsed: 4200,
    awaitingSkill: false,
    selectedSkillId: "quick-strike",
  };
  const first = setup(storage, extra);
  first.dungeon.start();
  first.store.dispatch({ type: GAME_ACTION.DAMAGE_PLAYER, amount: 1 });
  first.store.dispatch({ type: GAME_ACTION.PAUSE_BATTLE });
  assert.equal(first.controller.save().saved, true);

  const second = setup(storage, {
    wordState: createWordBattleState(),
    spawnElapsed: 0,
  });
  const loaded = second.controller.load();
  assert.equal(loaded.loaded, true);
  assert.equal(second.store.getState().phase, GAME_PHASE.PAUSED);
  assert.equal(second.store.getState().pausedFrom, GAME_PHASE.BATTLE);
  assert.equal(second.store.getState().player.hp, 2);
  assert.equal(second.getRestoredExtra().attackElapsed, 4200);
  assert.equal(second.getRestoredExtra().selectedSkillId, "quick-strike");
});


test("同じセーブ形式のままアイテムや装備枠が追加されても不足分を自動補完する", () => {
  const storage = memoryStorage();
  const first = setup(storage, {
    wordState: createWordBattleState(),
    spawnElapsed: 0,
  });
  first.dungeon.start();
  first.store.dispatch({ type: GAME_ACTION.ADD_ITEM, itemId: "small-potion", quantity: 3 });
  assert.equal(first.controller.save().saved, true);

  const oldSnapshot = JSON.parse(storage.getItem(SAVE_STORAGE_KEY));
  delete oldSnapshot.gameState.inventory.items["copper-charm"];
  delete oldSnapshot.gameState.inventory.equipment.accessory;
  storage.setItem(SAVE_STORAGE_KEY, JSON.stringify(oldSnapshot));

  const second = setup(storage, {
    wordState: createWordBattleState(),
    spawnElapsed: 0,
  });
  assert.equal(second.controller.load().loaded, true);
  assert.equal(second.store.getState().inventory.items["copper-charm"], 0);
  assert.equal(second.store.getState().inventory.equipment.accessory, null);
  assert.equal(second.store.getState().inventory.items["small-potion"], 5);
});


test("スキル強化レベルと支払ったゴールドを保存・ロードで引き継ぐ", () => {
  const storage = memoryStorage();
  const first = setup(storage, {
    wordState: createWordBattleState(),
    spawnElapsed: 0,
  });
  first.store.dispatch({ type: GAME_ACTION.ADD_GOLD, amount: 150 });
  first.store.dispatch({
    type: GAME_ACTION.UPGRADE_SKILL,
    skillId: "quick-strike",
  });
  first.store.dispatch({
    type: GAME_ACTION.UPGRADE_SKILL,
    skillId: "quick-strike",
  });
  assert.equal(first.store.getState().skillLevels["quick-strike"], 3);
  assert.equal(first.store.getState().inventory.gold, 0);
  assert.equal(first.controller.save().saved, true);

  const second = setup(storage, {
    wordState: createWordBattleState(),
    spawnElapsed: 0,
  });
  assert.equal(second.controller.load().loaded, true);
  assert.equal(second.store.getState().skillLevels["quick-strike"], 3);
  assert.equal(second.store.getState().inventory.gold, 0);
});

test("以前のセーブにスキルレベルがなくてもLv.1で補完してロードできる", () => {
  const storage = memoryStorage();
  const first = setup(storage, {
    wordState: createWordBattleState(),
    spawnElapsed: 0,
  });
  assert.equal(first.controller.save().saved, true);
  const legacy = JSON.parse(storage.getItem(SAVE_STORAGE_KEY));
  delete legacy.gameState.skillLevels;
  storage.setItem(SAVE_STORAGE_KEY, JSON.stringify(legacy));

  const second = setup(storage, {
    wordState: createWordBattleState(),
    spawnElapsed: 0,
  });
  assert.equal(second.controller.load().loaded, true);
  assert.deepEqual(second.store.getState().skillLevels, {
    "quick-strike": 1,
    "power-strike": 1,
    "ultimate-strike": 1,
  });
});


test("ダンジョンごとの解放階層をセーブ・ロードで別々に保持する", () => {
  const storage = memoryStorage();
  const first = setup(storage, {
    wordState: createWordBattleState(), spawnElapsed: 0,
  });
  first.dungeon.start();
  for (let index = 0; index < 3; index += 1) {
    winEnemy(first.store);
    if (index < 2) first.dungeon.advance();
  }
  first.dungeon.claimFloorReward();
  assert.equal(first.dungeon.getUnlockedFloor("forest-ruins"), 2);
  first.dungeon.exitToTown();
  first.store.dispatch({ type: GAME_ACTION.RETURN_TO_TOWN });
  first.dungeon.selectDungeon("frozen-cavern");
  assert.equal(first.dungeon.getUnlockedFloor("frozen-cavern"), 1);
  assert.equal(first.controller.save().saved, true);

  const second = setup(storage, {
    wordState: createWordBattleState(), spawnElapsed: 0,
  });
  assert.equal(second.controller.load().loaded, true);
  assert.equal(second.dungeon.getUnlockedFloor("forest-ruins"), 2);
  assert.equal(second.dungeon.getUnlockedFloor("frozen-cavern"), 1);
});

test("旧バージョン4のセーブはダンジョン進行マップを追加して移行する", () => {
  const storage = memoryStorage();
  const first = setup(storage, {
    wordState: createWordBattleState(), spawnElapsed: 0,
  });
  assert.equal(first.controller.save().saved, true);
  const legacy = JSON.parse(storage.getItem(SAVE_STORAGE_KEY));
  legacy.version = 4;
  delete legacy.dungeonState.unlockedFloors;
  delete legacy.dungeonState.completedDungeons;
  storage.setItem(SAVE_STORAGE_KEY, JSON.stringify(legacy));

  const second = setup(storage, {
    wordState: createWordBattleState(), spawnElapsed: 0,
  });
  assert.equal(second.controller.load().loaded, true);
  assert.equal(second.dungeon.getUnlockedFloor("forest-ruins"), 1);
  assert.equal(second.dungeon.getUnlockedFloor("frozen-cavern"), 1);
  assert.equal(second.controller.save().saved, true);
  assert.equal(JSON.parse(storage.getItem(SAVE_STORAGE_KEY)).version, 5);
});


test("初回制覇報酬の受取記録はセーブ・ロード後も保持され、周回で重複しない", () => {
  const storage = memoryStorage();
  const first = setup(storage, {
    wordState: createWordBattleState(), spawnElapsed: 0,
  });
  first.dungeon.start();

  for (let floor = 1; floor <= 5; floor += 1) {
    for (let enemy = 0; enemy < 3; enemy += 1) {
      winEnemy(first.store);
      if (enemy < 2) first.dungeon.advance();
    }
    const reward = first.dungeon.claimFloorReward();
    if (floor < 5) {
      assert.equal(reward.firstClearReward, null);
      first.dungeon.advance();
    } else {
      assert.equal(reward.firstClearReward.itemId, "forest-dragon-seal");
    }
  }
  assert.equal(first.dungeon.isDungeonCleared("forest-ruins"), true);
  assert.equal(first.controller.save().saved, true);

  const second = setup(storage, {
    wordState: createWordBattleState(), spawnElapsed: 0,
  });
  assert.equal(second.controller.load().loaded, true);
  assert.equal(second.dungeon.isDungeonCleared("forest-ruins"), true);
  assert.equal(second.store.getState().inventory.items["forest-dragon-seal"], 1);

  second.dungeon.exitToTown();
  second.store.dispatch({ type: GAME_ACTION.RETURN_TO_TOWN });
  assert.equal(second.dungeon.selectFloor(5).selected, true);
  second.dungeon.start();
  for (let enemy = 0; enemy < 3; enemy += 1) {
    winEnemy(second.store);
    if (enemy < 2) second.dungeon.advance();
  }
  const repeat = second.dungeon.claimFloorReward();
  assert.equal(repeat.firstClearReward, null);
  assert.equal(second.store.getState().inventory.items["forest-dragon-seal"], 1);
});
