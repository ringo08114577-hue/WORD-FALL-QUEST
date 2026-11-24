import test from "node:test";
import assert from "node:assert/strict";
import { createGameStore, createInitialGameState, GAME_ACTION, GAME_PHASE } from "./game-state.js";
import { createDungeonController } from "./dungeon.js";
import { createWordBattleState, spawnFallingLetter, collectLetter, restoreWordBattleState } from "./word-battle.js";
import { createSaveController, SAVE_STORAGE_KEY, SAVE_VERSION } from "./save-system.js";
import { getEquipmentBonuses } from "./items.js";

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
  const store = createGameStore({ playerMaxHp: 3, playerAttackPower: 1 });
  const dungeon = createDungeonController(store, { random: () => 0 });
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
  for (let index = 0; index < first.dungeon.getProgress().enemiesPerFloor; index += 1) {
    winEnemy(first.store);
    if (index < first.dungeon.getProgress().enemiesPerFloor - 1) first.dungeon.advance();
  }
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
    JSON.parse(storage.getItem(SAVE_STORAGE_KEY)).version, 14,
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
  assert.equal(first.store.getState().player.defensePower, 10);
  assert.equal(first.controller.save().saved, true);

  const second = setup(storage, {
    wordState: createWordBattleState(),
    spawnElapsed: 0,
  });
  assert.equal(second.controller.load().loaded, true);
  assert.equal(second.store.getState().player.defensePower, 10);
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
  assert.equal(first.store.getState().player.attackPower, 11);
  assert.equal(first.store.getState().player.defensePower, 25);
  assert.equal(first.controller.save().saved, true);

  const second = setup(storage, {
    wordState: createWordBattleState(),
    spawnElapsed: 0,
  });
  assert.equal(second.controller.load().loaded, true);
  assert.equal(second.store.getState().inventory.equipment.armor, "leather-armor");
  assert.equal(second.store.getState().inventory.equipment.accessory, "copper-charm");
  assert.equal(second.store.getState().player.attackPower, 11);
  assert.equal(second.store.getState().player.defensePower, 25);
});



test("バージョン10の誤った初期能力値を成長データを保ったまま修正する", () => {
  const storage = memoryStorage();
  const first = setup(storage, {
    wordState: createWordBattleState(), spawnElapsed: 0,
  });
  const oldState = structuredClone(first.store.getState());
  oldState.inventory.equipment.armor = "leather-armor";
  oldState.inventory.equipment.accessory = "copper-charm";
  oldState.inventory.items["leather-armor"] = 0;
  oldState.inventory.items["copper-charm"] = 0;
  oldState.inventory.gold = 321;

  const bonuses = getEquipmentBonuses(oldState.inventory.equipment);
  const oldLevel = 2;
  const oldBaseMaxHp = 3 + (oldLevel - 1) * 40;
  const oldBaseAttackPower = 1 + (oldLevel - 1) * 5;
  const oldMaxHp = oldBaseMaxHp + bonuses.maxHpBonus;
  const oldHp = Math.round(oldMaxHp * 0.55);
  oldState.player = {
    ...oldState.player,
    level: oldLevel,
    experience: 40,
    nextLevelXp: 200,
    hp: oldHp,
    maxHp: oldMaxHp,
    startingMaxHp: 3,
    baseMaxHp: oldBaseMaxHp,
    startingAttackPower: 1,
    baseAttackPower: oldBaseAttackPower,
    attackPower: oldBaseAttackPower + bonuses.attackBonus,
    baseDefensePower: 0,
    defensePower: bonuses.defenseBonus,
  };

  storage.setItem(SAVE_STORAGE_KEY, JSON.stringify({
    version: 10,
    savedAt: "2026-11-16T00:00:00.000Z",
    gameState: oldState,
    dungeonState: first.dungeon.getSaveData(),
    extra: { wordState: createWordBattleState(), spawnElapsed: 0 },
  }));

  const second = setup(storage, {
    wordState: createWordBattleState(), spawnElapsed: 0,
  });
  const result = second.controller.load();
  assert.equal(result.loaded, true);

  const player = second.store.getState().player;
  const expectedMaxHp = 100 + 80 + bonuses.maxHpBonus;
  const expectedHp = Math.round(expectedMaxHp * oldHp / oldMaxHp);
  assert.equal(player.level, 2);
  assert.equal(player.maxHp, expectedMaxHp);
  assert.equal(player.hp, expectedHp);
  assert.equal(player.attackPower, 30 + bonuses.attackBonus);
  assert.equal(player.baseAttackPower, 30);
  assert.equal(player.defensePower, bonuses.defenseBonus);
  assert.equal(player.experience, 40);
  assert.equal(player.nextLevelXp, 200);
  assert.deepEqual(second.store.getState().inventory.equipment, oldState.inventory.equipment);
  assert.equal(second.store.getState().inventory.gold, 321);
  assert.equal(second.controller.save().saved, true);
  assert.equal(JSON.parse(storage.getItem(SAVE_STORAGE_KEY)).version, SAVE_VERSION);
});

test("バージョン10ですでに正しい能力値のセーブは能力値を変更しない", () => {
  const storage = memoryStorage();
  const first = setup(storage, {
    wordState: createWordBattleState(), spawnElapsed: 0,
  });
  const correctState = structuredClone(createInitialGameState());
  storage.setItem(SAVE_STORAGE_KEY, JSON.stringify({
    version: 10,
    savedAt: "2026-11-16T00:00:00.000Z",
    gameState: correctState,
    dungeonState: first.dungeon.getSaveData(),
    extra: { wordState: createWordBattleState(), spawnElapsed: 0 },
  }));

  const second = setup(storage, {
    wordState: createWordBattleState(), spawnElapsed: 0,
  });
  assert.equal(second.controller.load().loaded, true);
  assert.equal(second.store.getState().player.maxHp, 100);
  assert.equal(second.store.getState().player.attackPower, 20);
});


test("バージョン13のセーブは新しい成長値へ移行し、HP割合を保つ", () => {
  const storage = memoryStorage();
  const first = setup(storage, { wordState: createWordBattleState(), spawnElapsed: 0 });
  const oldState = structuredClone(createInitialGameState());
  oldState.player.level = 5;
  oldState.player.experience = 120;
  oldState.player.nextLevelXp = 500;
  oldState.player.baseMaxHp = 260;
  oldState.player.maxHp = 260;
  oldState.player.hp = 130;
  oldState.player.baseAttackPower = 40;
  oldState.player.attackPower = 40;

  storage.setItem(SAVE_STORAGE_KEY, JSON.stringify({
    version: 13,
    savedAt: "2026-11-24T00:00:00.000Z",
    gameState: oldState,
    dungeonState: first.dungeon.getSaveData(),
    extra: { wordState: createWordBattleState(), spawnElapsed: 0 },
  }));

  const second = setup(storage, { wordState: createWordBattleState(), spawnElapsed: 0 });
  assert.equal(second.controller.load().loaded, true);
  const player = second.store.getState().player;
  assert.equal(player.level, 5);
  assert.equal(player.baseMaxHp, 420);
  assert.equal(player.maxHp, 420);
  assert.equal(player.hp, 210);
  assert.equal(player.baseAttackPower, 60);
  assert.equal(player.attackPower, 60);
  assert.equal(player.experience, 120);
  assert.equal(player.nextLevelXp, 500);
  assert.equal(second.controller.save().saved, true);
  assert.equal(JSON.parse(storage.getItem(SAVE_STORAGE_KEY)).version, 14);
});

test("バージョン9のセーブは新しい成長バランスへHP割合と経験値進捗を引き継ぐ", () => {
  const storage = memoryStorage();
  const first = setup(storage, {
    wordState: createWordBattleState(), spawnElapsed: 0,
  });
  first.dungeon.start();
  const oldState = structuredClone(first.store.getState());
  oldState.player.hp = 2;
  oldState.player.maxHp = 3;
  oldState.player.baseMaxHp = 3;
  oldState.player.startingAttackPower = 1;
  oldState.player.baseAttackPower = 1;
  oldState.player.attackPower = 1;
  oldState.player.level = 1;
  oldState.player.experience = 5;
  oldState.player.nextLevelXp = 10;
  oldState.enemy = {
    ...oldState.enemy,
    hp: 2,
    maxHp: 3,
    attackPower: 1,
    experienceReward: 10,
  };
  oldState.battleEffects = {
    attackMultiplier: 1,
    attackUsesRemaining: 0,
    defenseBonus: 2,
    defenseHitsRemaining: 2,
  };
  oldState.stats.totalExperienceEarned = 10;

  storage.setItem(SAVE_STORAGE_KEY, JSON.stringify({
    version: 9,
    savedAt: "2026-11-13T00:00:00.000Z",
    gameState: oldState,
    dungeonState: first.dungeon.getSaveData(),
    extra: { wordState: createWordBattleState(), spawnElapsed: 0 },
  }));

  const second = setup(storage, {
    wordState: createWordBattleState(), spawnElapsed: 0,
  });
  assert.equal(second.controller.load().loaded, true);
  const player = second.store.getState().player;
  assert.equal(player.maxHp, 100);
  assert.equal(player.hp, 67);
  assert.equal(player.attackPower, 20);
  assert.equal(player.experience, 50);
  assert.equal(player.nextLevelXp, 100);
  assert.equal(second.store.getState().enemy.maxHp, 165);
  assert.equal(second.store.getState().enemy.hp, 110);
  assert.equal(second.store.getState().enemy.attackPower, 18);
  assert.equal(second.store.getState().battleEffects.defenseBonus, 20);
  assert.equal(second.store.getState().stats.totalExperienceEarned, 100);
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
  assert.equal(JSON.parse(storage.getItem(SAVE_STORAGE_KEY)).version, SAVE_VERSION);
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
    "healing-light": 1,
    "iron-guard": 1,
    "battle-cry": 1,
  });
});


test("ダンジョンごとの解放階層をセーブ・ロードで別々に保持する", () => {
  const storage = memoryStorage();
  const first = setup(storage, {
    wordState: createWordBattleState(), spawnElapsed: 0,
  });
  first.dungeon.start();
  for (let index = 0; index < first.dungeon.getProgress().enemiesPerFloor; index += 1) {
    winEnemy(first.store);
    if (index < first.dungeon.getProgress().enemiesPerFloor - 1) first.dungeon.advance();
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
  assert.equal(JSON.parse(storage.getItem(SAVE_STORAGE_KEY)).version, SAVE_VERSION);
});


test("初回制覇報酬の受取記録はセーブ・ロード後も保持され、周回で重複しない", () => {
  const storage = memoryStorage();
  const first = setup(storage, {
    wordState: createWordBattleState(), spawnElapsed: 0,
  });
  first.dungeon.start();

  for (let floor = 1; floor <= 5; floor += 1) {
    for (let enemy = 0; enemy < first.dungeon.getProgress().enemiesPerFloor; enemy += 1) {
      winEnemy(first.store);
      if (enemy < first.dungeon.getProgress().enemiesPerFloor - 1) first.dungeon.advance();
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
  for (let enemy = 0; enemy < second.dungeon.getProgress().enemiesPerFloor; enemy += 1) {
    winEnemy(second.store);
    if (enemy < second.dungeon.getProgress().enemiesPerFloor - 1) second.dungeon.advance();
  }
  const repeat = second.dungeon.claimFloorReward();
  assert.equal(repeat.firstClearReward, null);
  assert.equal(second.store.getState().inventory.items["forest-dragon-seal"], 1);
});


test("バージョン5のセーブを4枠スキル装備つきのバージョン6へ移行する", () => {
  const storage = memoryStorage();
  const first = setup(storage, { wordState: createWordBattleState(), spawnElapsed: 0 });
  assert.equal(first.controller.save().saved, true);
  const legacy = JSON.parse(storage.getItem(SAVE_STORAGE_KEY));
  legacy.version = 5;
  delete legacy.gameState.equippedSkillIds;
  storage.setItem(SAVE_STORAGE_KEY, JSON.stringify(legacy));
  const second = setup(storage, { wordState: createWordBattleState(), spawnElapsed: 0 });
  assert.equal(second.controller.load().loaded, true);
  assert.deepEqual(second.store.getState().equippedSkillIds, [
    "quick-strike", "power-strike", "ultimate-strike", "healing-light",
  ]);
  assert.equal(second.controller.save().saved, true);
  assert.equal(JSON.parse(storage.getItem(SAVE_STORAGE_KEY)).version, SAVE_VERSION);
});


test("行動ログもゲームのセーブデータに保存・復元される", () => {
  const storage = memoryStorage();
  const first = setup(storage, {
    wordState: createWordBattleState(),
    spawnElapsed: 0,
  });
  first.dungeon.start();
  first.store.dispatch({ type: GAME_ACTION.DAMAGE_PLAYER, amount: 1, logReason: "時間攻撃" });
  first.store.dispatch({
    type: GAME_ACTION.LOG_EVENT,
    category: "skill",
    message: "必殺技を選択",
    timestamp: 123456,
  });
  const originalLog = structuredClone(first.store.getState().actionLog);
  assert.equal(first.controller.save().saved, true);

  const second = setup(storage, {
    wordState: createWordBattleState(),
    spawnElapsed: 0,
  });
  assert.equal(second.controller.load().loaded, true);
  assert.deepEqual(second.store.getState().actionLog, originalLog);
});

test("バージョン6のセーブデータには空の行動ログを追加して移行する", () => {
  const storage = memoryStorage();
  const first = setup(storage, {
    wordState: createWordBattleState(),
    spawnElapsed: 0,
  });
  assert.equal(first.controller.save().saved, true);
  const legacy = JSON.parse(storage.getItem(SAVE_STORAGE_KEY));
  legacy.version = 6;
  delete legacy.gameState.actionLog;
  storage.setItem(SAVE_STORAGE_KEY, JSON.stringify(legacy));

  const second = setup(storage, {
    wordState: createWordBattleState(),
    spawnElapsed: 0,
  });
  assert.equal(second.controller.load().loaded, true);
  assert.deepEqual(second.store.getState().actionLog, []);
  assert.equal(second.controller.save().saved, true);
  assert.equal(JSON.parse(storage.getItem(SAVE_STORAGE_KEY)).version, SAVE_VERSION);
});


test("バージョン7のセーブへ一時効果の空状態を追加して移行する", () => {
  const storage = memoryStorage();
  const first = setup(storage, {
    wordState: createWordBattleState(), spawnElapsed: 0,
  });
  first.dungeon.start();
  assert.equal(first.controller.save().saved, true);
  const legacy = JSON.parse(storage.getItem(SAVE_STORAGE_KEY));
  legacy.version = 7;
  delete legacy.gameState.battleEffects;
  storage.setItem(SAVE_STORAGE_KEY, JSON.stringify(legacy));

  const second = setup(storage, {
    wordState: createWordBattleState(), spawnElapsed: 0,
  });
  assert.equal(second.controller.load().loaded, true);
  assert.deepEqual(second.store.getState().battleEffects, {
    attackMultiplier: 1, attackUsesRemaining: 0,
    defenseBonus: 0, defenseHitsRemaining: 0,
  });
  assert.equal(second.controller.save().saved, true);
  assert.equal(JSON.parse(storage.getItem(SAVE_STORAGE_KEY)).version, SAVE_VERSION);
});

test("攻撃・防御の一時効果はセーブとロードで維持される", () => {
  const storage = memoryStorage();
  const first = setup(storage, {
    wordState: createWordBattleState(), spawnElapsed: 0,
  });
  first.dungeon.start();
  first.store.dispatch({
    type: GAME_ACTION.APPLY_ATTACK_BUFF, multiplier: 1.4, uses: 2,
  });
  first.store.dispatch({
    type: GAME_ACTION.APPLY_DEFENSE_BUFF, bonus: 3, hits: 2,
  });
  assert.equal(first.controller.save().saved, true);

  const second = setup(storage, {
    wordState: createWordBattleState(), spawnElapsed: 0,
  });
  assert.equal(second.controller.load().loaded, true);
  assert.deepEqual(second.store.getState().battleEffects, {
    attackMultiplier: 1.4, attackUsesRemaining: 2,
    defenseBonus: 3, defenseHitsRemaining: 2,
  });
});

test("ローカルセーブの有無と更新日時を安全に確認できる", () => {
  const storage = memoryStorage();
  const data = setup(storage, {
    wordState: createWordBattleState(),
    spawnElapsed: 0,
  });
  assert.equal(data.controller.getLocalSaveInfo().exists, false);

  data.dungeon.start();
  assert.equal(data.controller.save().saved, true);
  const info = data.controller.getLocalSaveInfo();
  assert.equal(info.exists, true);
  assert.equal(info.version, SAVE_VERSION);
  assert.equal(typeof info.savedAt, "string");
  assert.equal(Number.isFinite(Date.parse(info.savedAt)), true);

  storage.setItem(SAVE_STORAGE_KEY, "{broken");
  assert.equal(data.controller.getLocalSaveInfo().exists, false);
});


test("バージョン8のセーブデータを進化未実装状態から安全に移行する", () => {
  const storage = memoryStorage();
  const first = setup(storage, { wordState: createWordBattleState(), spawnElapsed: 0 });
  assert.equal(first.controller.save().saved, true);
  const legacy = JSON.parse(storage.getItem(SAVE_STORAGE_KEY));
  legacy.version = 8;
  delete legacy.gameState.evolvedSkillIds;
  storage.setItem(SAVE_STORAGE_KEY, JSON.stringify(legacy));
  const second = setup(storage, { wordState: createWordBattleState(), spawnElapsed: 0 });
  assert.equal(second.controller.load().loaded, true);
  assert.deepEqual(second.store.getState().evolvedSkillIds, []);
  assert.equal(second.controller.save().saved, true);
  assert.equal(JSON.parse(storage.getItem(SAVE_STORAGE_KEY)).version, SAVE_VERSION);
  assert.equal(SAVE_VERSION, 14);
});

test("進化済みスキルと素材消費後の状態をセーブ・ロードで保持する", () => {
  const storage = memoryStorage();
  const first = setup(storage, { wordState: createWordBattleState(), spawnElapsed: 0 });
  first.store.dispatch({ type: GAME_ACTION.ADD_GOLD, amount: 950 });
  first.store.dispatch({ type: GAME_ACTION.ADD_ITEM, itemId: "forest-dragon-seal", quantity: 1 });
  for (let i = 0; i < 4; i += 1) first.store.dispatch({ type: GAME_ACTION.UPGRADE_SKILL, skillId: "quick-strike" });
  first.store.dispatch({ type: GAME_ACTION.EVOLVE_SKILL, skillId: "quick-strike" });
  assert.equal(first.controller.save().saved, true);
  const second = setup(storage, { wordState: createWordBattleState(), spawnElapsed: 0 });
  assert.equal(second.controller.load().loaded, true);
  assert.deepEqual(second.store.getState().evolvedSkillIds, ["quick-strike"]);
  assert.equal(second.store.getState().inventory.items["forest-dragon-seal"], 0);
  assert.equal(second.store.getState().skillLevels["quick-strike"], 5);
});


test("バージョン11のセーブを新しいドロップ素材に対応させて引き継ぐ", () => {
  const storage = memoryStorage();
  const first = setup(storage, { wordState: createWordBattleState(), spawnElapsed: 0 });
  first.store.dispatch({ type: GAME_ACTION.ADD_ITEM, itemId: "forest-dragon-seal", quantity: 1 });
  assert.equal(first.controller.save().saved, true);

  const legacy = JSON.parse(storage.getItem(SAVE_STORAGE_KEY));
  legacy.version = 11;
  for (const itemId of [
    "slime-gel", "orange-gel", "slime-core", "bat-wing", "bat-silk",
    "goblin-cloth", "goblin-medal", "orc-fang", "orc-hide",
    "moss-stone", "moss-crystal", "forest-dragon-scale", "forest-dragon-heart",
    "ice-wolf-fang", "ice-wolf-fur", "ice-crystal", "frozen-ore",
    "ice-dragon-scale", "ice-dragon-heart",
    "slime-buckler", "bat-cloak", "orc-fang-blade", "moss-guardian-armor",
    "wolf-fang-sword", "ice-crystal-charm", "forest-dragon-sword", "ice-dragon-armor",
  ]) {
    delete legacy.gameState.inventory.items[itemId];
  }
  storage.setItem(SAVE_STORAGE_KEY, JSON.stringify(legacy));

  const second = setup(storage, { wordState: createWordBattleState(), spawnElapsed: 0 });
  assert.equal(second.controller.load().loaded, true);
  assert.equal(second.store.getState().inventory.items["slime-gel"], 0);
  assert.equal(second.store.getState().inventory.items["forest-dragon-seal"], 1);
  assert.equal(second.controller.save().saved, true);
  assert.equal(JSON.parse(storage.getItem(SAVE_STORAGE_KEY)).version, 14);
});
