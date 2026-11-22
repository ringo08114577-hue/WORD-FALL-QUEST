import test from "node:test";
import assert from "node:assert/strict";
import { createGameStore, GAME_ACTION, GAME_PHASE } from "./game-state.js";
import { createDungeonController, MAX_DUNGEON_FLOORS } from "./dungeon.js";
import { ENEMY_DEFINITIONS, createEnemy, getEnemyImagePath } from "./enemies.js";

function winCurrentEnemy(store) {
  store.dispatch({
    type: GAME_ACTION.DAMAGE_ENEMY,
    amount: store.getState().enemy.hp,
  });
}
function createTestDungeon(store, options = {}) {
  return createDungeonController(store, { random: () => 0, ...options });
}

function clearCurrentFloor(store, dungeon) {
  for (let index = 0; index < dungeon.getProgress().enemiesPerFloor; index += 1) {
    winCurrentEnemy(store);
    if (index < dungeon.getProgress().enemiesPerFloor - 1) dungeon.advance();
  }
  const reward = dungeon.claimFloorReward();
  return reward;
}

test("ダンジョンは5階構成で、最初の敵から開始する", () => {
  const store = createGameStore();
  const dungeon = createTestDungeon(store);
  const result = dungeon.start();
  assert.equal(MAX_DUNGEON_FLOORS, 5);
  assert.equal(result.started, true);
  assert.equal(result.floor, 1);
  assert.equal(store.getState().phase, GAME_PHASE.BATTLE);
  assert.equal(store.getState().enemy.id, "slime");
  assert.equal(dungeon.getProgress().unlockedFloor, 1);
  assert.equal(dungeon.start().reason, "already-started");
});

test("森の各階は雑魚4体と固定の中ボスまたは大ボスで構成される", () => {
  const store = createGameStore();
  const dungeon = createTestDungeon(store);
  const result = dungeon.start();
  assert.equal(result.enemy.id, "slime");
  assert.equal(dungeon.getProgress().enemiesPerFloor, 5);
  const roster = [result.enemy.id];
  for (let index = 1; index < 5; index += 1) {
    winCurrentEnemy(store);
    const next = dungeon.advance();
    roster.push(next.enemy.id);
  }
  assert.equal(roster.length, 5);
  assert.equal(roster.at(-1), "grandvel");
  assert.equal(store.getState().enemy.isMiniBoss, true);
  assert.equal(store.getState().enemy.isBoss, false);
  assert.equal(getEnemyImagePath(store.getState().enemy), "assets/characters/placeholder.svg");
});

test("階層を全員倒して報酬を受け取ると次の階が解放される", () => {
  const store = createGameStore();
  const dungeon = createTestDungeon(store);
  dungeon.start();
  const reward = clearCurrentFloor(store, dungeon);
  assert.equal(reward.claimed, true);
  assert.ok(store.getState().actionLog.some((entry) =>
    entry.message.startsWith("宝箱から："),
  ));
  assert.equal(dungeon.getUnlockedFloor("forest-ruins"), 2);
  assert.equal(dungeon.getProgress().floorCleared, true);
  assert.equal(dungeon.claimFloorReward().reason, "already-claimed");

  const next = dungeon.advance();
  assert.equal(next.started, true);
  assert.equal(next.floor, 2);
  assert.equal(store.getState().enemy.id, "slime");
});

test("未解放の階層は選べず、解放済みの好きな階層は選んで周回できる", () => {
  const store = createGameStore();
  const dungeon = createTestDungeon(store);
  assert.equal(dungeon.selectFloor(2).reason, "floor-locked");

  dungeon.start();
  clearCurrentFloor(store, dungeon);
  dungeon.advance();
  clearCurrentFloor(store, dungeon);
  dungeon.exitToTown();
  store.dispatch({ type: GAME_ACTION.RETURN_TO_TOWN });

  assert.equal(dungeon.selectFloor(2).selected, true);
  assert.equal(dungeon.start().floor, 2);
  assert.equal(store.getState().enemy.id, "slime");
  assert.equal(dungeon.selectFloor(3).reason, "adventure-already-started");
});

test("途中退出すると現在階層の敵進行だけリセットし、階層解放は残る", () => {
  const store = createGameStore();
  const dungeon = createTestDungeon(store);
  dungeon.start();
  winCurrentEnemy(store);
  dungeon.advance();
  assert.equal(dungeon.getProgress().enemyNumber, 2);

  dungeon.exitToTown();
  store.dispatch({ type: GAME_ACTION.RETURN_TO_TOWN });
  assert.equal(dungeon.getProgress().floor, 1);
  assert.equal(dungeon.getProgress().enemyNumber, 1);
  assert.equal(dungeon.getProgress().started, false);
  assert.equal(store.getState().phase, GAME_PHASE.TITLE);
  assert.equal(store.getState().player.hp, store.getState().player.maxHp);
  assert.equal(dungeon.start().enemy.id, "slime");
});

test("各ダンジョンの解放階層は独立して保存される", () => {
  const store = createGameStore();
  const dungeon = createTestDungeon(store);
  dungeon.start();
  clearCurrentFloor(store, dungeon);
  dungeon.advance();
  assert.equal(dungeon.getUnlockedFloor("forest-ruins"), 2);
  dungeon.exitToTown();
  store.dispatch({ type: GAME_ACTION.RETURN_TO_TOWN });

  dungeon.selectDungeon("frozen-cavern");
  assert.equal(dungeon.getUnlockedFloor("frozen-cavern"), 1);
  assert.equal(dungeon.selectFloor(2).reason, "floor-locked");
  dungeon.start();
  assert.equal(store.getState().enemy.id, "ice-wolf");
  const saved = dungeon.getSaveData();

  const secondStore = createGameStore();
  const secondDungeon = createDungeonController(secondStore);
  secondStore.dispatch({ type: GAME_ACTION.RETURN_TO_TOWN });
  assert.equal(secondDungeon.restoreSaveData({
    ...saved,
    started: false,
    enemyIndex: 0,
    rewardClaimed: false,
  }), true);
  assert.equal(secondDungeon.getUnlockedFloor("forest-ruins"), 2);
  assert.equal(secondDungeon.getUnlockedFloor("frozen-cavern"), 1);
});

test("各階の5体目は中ボス、5階の5体目は森のドラゴン", () => {
  const store = createGameStore();
  const dungeon = createTestDungeon(store);
  const expectedFinal = ["grandvel", "grandvel", "grandvel", "grandvel", "forest-dragon"];
  for (let floor = 1; floor <= 5; floor += 1) {
    if (floor === 1) dungeon.start();
    else assert.equal(dungeon.getProgress().floor, floor);
    const ids = [];
    const count = dungeon.getProgress().enemiesPerFloor;
    for (let index = 0; index < count; index += 1) {
      ids.push(store.getState().enemy.id);
      winCurrentEnemy(store);
      if (index < count - 1) dungeon.advance();
    }
    assert.equal(ids.length, 5);
    assert.equal(ids.at(-1), expectedFinal[floor - 1]);
    assert.equal(dungeon.getProgress().floorCleared, true);
    if (floor < 5) {
      assert.equal(ENEMY_DEFINITIONS[ids.at(-1)].rank, "miniBoss");
    } else {
      assert.equal(store.getState().enemy.id, "forest-dragon");
      assert.equal(store.getState().enemy.isBoss, true);
    }
    dungeon.claimFloorReward();
    if (floor < 5) {
      assert.equal(dungeon.getUnlockedFloor(), floor + 1);
      dungeon.advance();
    }
  }
  assert.equal(dungeon.getProgress().dungeonCleared, true);
  assert.equal(dungeon.advance().reason, "dungeon-cleared");
});

test("氷結の洞窟は専用の敵と最深部ボスを登場させる", () => {
  const store = createGameStore();
  const dungeon = createTestDungeon(store);
  dungeon.selectDungeon("frozen-cavern");
  dungeon.start();
  assert.equal(store.getState().enemy.id, "ice-wolf");
  for (let floor = 1; floor <= 5; floor += 1) {
    for (let index = 0; index < 3; index += 1) {
      winCurrentEnemy(store);
      if (index < 2) dungeon.advance();
    }
    dungeon.claimFloorReward();
    if (floor < 5) dungeon.advance();
  }
  assert.equal(store.getState().enemy.id, "ice-dragon");
  assert.equal(store.getState().enemy.isBoss, true);
  assert.equal(dungeon.getProgress().dungeonCleared, true);
});

test("旧バージョン2の途中階層セーブは旧敵編成で検証できる", () => {
  const store = createGameStore();
  store.dispatch({
    type: GAME_ACTION.START_BATTLE,
    enemy: createEnemy("forest-dragon", { floor: 3 }),
  });
  const dungeon = createTestDungeon(store);
  assert.equal(dungeon.isValidSaveData({
    dungeonId: "forest-ruins",
    floor: 3,
    enemyIndex: 2,
    started: true,
    rewardClaimed: false,
    encounterSetVersion: 2,
  }), true);
});

test("旧バージョン3のセーブも旧敵編成として検証できる", () => {
  const store = createGameStore();
  store.dispatch({
    type: GAME_ACTION.START_BATTLE,
    enemy: createEnemy("moss-golem", { floor: 3 }),
  });
  const dungeon = createTestDungeon(store);
  assert.equal(dungeon.isValidSaveData({
    dungeonId: "forest-ruins",
    floor: 3,
    enemyIndex: 2,
    started: true,
    rewardClaimed: false,
    encounterSetVersion: 3,
  }), true);
});

test("旧バージョン4の固定編成セーブも引き続き復元できる", () => {
  const store = createGameStore();
  store.dispatch({
    type: GAME_ACTION.START_BATTLE,
    enemy: createEnemy("bat", { floor: 2 }),
  });
  const dungeon = createTestDungeon(store);
  assert.equal(dungeon.isValidSaveData({
    dungeonId: "forest-ruins",
    floor: 2,
    enemyIndex: 0,
    started: true,
    rewardClaimed: false,
    encounterSetVersion: 4,
  }), true);
});

test("ランダム抽選した編成はセーブ・復元後も同じ順番で続く", () => {
  const firstStore = createGameStore();
  const firstDungeon = createDungeonController(firstStore, { random: () => 0.99 });
  firstDungeon.start();
  winCurrentEnemy(firstStore);
  firstDungeon.advance();
  const expectedNextId = firstDungeon.getSaveData().encounterIds[2];
  const savedDungeon = firstDungeon.getSaveData();

  const secondStore = createGameStore();
  assert.equal(secondStore.restoreState(firstStore.getState()), true);
  const secondDungeon = createDungeonController(secondStore, { random: () => 0 });
  assert.equal(secondDungeon.restoreSaveData(savedDungeon), true);
  assert.equal(secondDungeon.getSaveData().encounterIds[1], expectedNextId);
  winCurrentEnemy(secondStore);
  assert.equal(secondDungeon.advance().enemy.id, expectedNextId);
});

test("無効なダンジョンや階層選択は拒否する", () => {
  const store = createGameStore();
  const dungeon = createTestDungeon(store);
  assert.equal(dungeon.selectDungeon("missing").reason, "unknown-dungeon");
  assert.equal(dungeon.selectFloor(0).reason, "invalid-floor");
  assert.throws(() => createDungeonController(store, { dungeonId: "unknown" }), RangeError);
});


test("ダンジョン初回制覇時だけ特別素材と追加ゴールドを獲得し、周回では再配布されない", () => {
  const store = createGameStore();
  const dungeon = createTestDungeon(store);
  dungeon.start();

  for (let floor = 1; floor <= 5; floor += 1) {
    const reward = clearCurrentFloor(store, dungeon);
    if (floor < 5) {
      assert.equal(reward.firstClearReward, null);
      dungeon.advance();
    } else {
      assert.deepEqual(reward.firstClearReward, {
        itemId: "forest-dragon-seal",
        quantity: 1,
        gold: 100,
      });
      assert.ok(store.getState().actionLog.some((entry) =>
        entry.message.startsWith("初回制覇報酬："),
      ));
    }
  }

  assert.equal(dungeon.isDungeonCleared("forest-ruins"), true);
  assert.equal(store.getState().inventory.items["forest-dragon-seal"], 1);
  assert.equal(store.getState().inventory.gold, 225);

  dungeon.exitToTown();
  store.dispatch({ type: GAME_ACTION.RETURN_TO_TOWN });
  assert.equal(dungeon.selectFloor(5).selected, true);
  dungeon.start();
  const repeatReward = clearCurrentFloor(store, dungeon);

  assert.equal(repeatReward.firstClearReward, null);
  assert.equal(repeatReward.gold, 35);
  assert.equal(store.getState().inventory.items["forest-dragon-seal"], 1);
  assert.equal(store.getState().inventory.gold, 260);
});

test("氷結の洞窟の初回制覇では専用の氷竜の結晶を獲得する", () => {
  const store = createGameStore();
  const dungeon = createTestDungeon(store);
  dungeon.selectDungeon("frozen-cavern");
  dungeon.start();

  for (let floor = 1; floor <= 5; floor += 1) {
    const reward = clearCurrentFloor(store, dungeon);
    if (floor < 5) dungeon.advance();
    else {
      assert.deepEqual(reward.firstClearReward, {
        itemId: "ice-dragon-core",
        quantity: 1,
        gold: 150,
      });
    }
  }

  assert.equal(store.getState().inventory.items["ice-dragon-core"], 1);
  assert.equal(store.getState().inventory.items["forest-dragon-seal"], 0);
});
