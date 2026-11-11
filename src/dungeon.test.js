import test from "node:test";
import assert from "node:assert/strict";
import { createGameStore, GAME_ACTION, GAME_PHASE } from "./game-state.js";
import { createDungeonController } from "./dungeon.js";
import { createEnemy } from "./enemies.js";

function winCurrentEnemy(store) {
  store.dispatch({
    type: GAME_ACTION.DAMAGE_ENEMY,
    amount: store.getState().enemy.hp,
  });
}

test("フロア開始時に1体目が登場し、進行状況を取得できる", () => {
  const store = createGameStore();
  const dungeon = createDungeonController(store);
  const result = dungeon.start();
  assert.equal(result.started, true);
  assert.equal(store.getState().phase, GAME_PHASE.BATTLE);
  assert.equal(store.getState().enemy.id, "slime");
  assert.deepEqual(dungeon.getProgress(), {
    floor: 1, enemyNumber: 1, enemiesPerFloor: 3, floorCleared: false, started: true, rewardClaimed: false,
  });
  assert.equal(dungeon.start().started, false);
});

test("同じフロアの敵を順番に倒し、3体目の勝利でフロアクリアになる", () => {
  const store = createGameStore();
  const dungeon = createDungeonController(store);
  dungeon.start();

  winCurrentEnemy(store);
  assert.equal(dungeon.getProgress().floorCleared, false);
  const second = dungeon.advance();
  assert.equal(second.enemy.id, "bat");
  assert.equal(second.enemyNumber, 2);

  winCurrentEnemy(store);
  const third = dungeon.advance();
  assert.equal(third.enemy.id, "goblin");
  assert.equal(third.enemyNumber, 3);

  winCurrentEnemy(store);
  assert.equal(dungeon.getProgress().floorCleared, true);
  assert.equal(dungeon.advance().reason, "reward-not-claimed");
  const reward = dungeon.claimFloorReward();
  assert.deepEqual(reward, {
    claimed: true, floor: 1, itemId: "small-potion", quantity: 1, gold: 15,
  });
  assert.equal(dungeon.claimFloorReward().reason, "already-claimed");
  assert.equal(store.getState().inventory.items["small-potion"], 3);
  assert.equal(store.getState().inventory.gold, 15);
  assert.equal(dungeon.advance().floorCleared, true);
  assert.equal(dungeon.getProgress().floor, 2);
  assert.equal(store.getState().enemy.id, "bat");
  assert.equal(store.getState().phase, GAME_PHASE.BATTLE);
});

test("フロアを進むと敵が強くなり、プレイヤーの成長と所持品を維持する", () => {
  const store = createGameStore();
  const dungeon = createDungeonController(store);
  dungeon.start();
  store.dispatch({ type: GAME_ACTION.USE_ITEM, itemId: "small-potion" });
  winCurrentEnemy(store);
  dungeon.advance();
  winCurrentEnemy(store);
  dungeon.advance();
  winCurrentEnemy(store);
  const hpBefore = store.getState().player.hp;
  const levelBefore = store.getState().player.level;
  const potionsBefore = store.getState().inventory.items["small-potion"];
  dungeon.claimFloorReward();
  dungeon.advance();

  assert.equal(store.getState().enemy.maxHp, 4);
  assert.equal(store.getState().player.hp, hpBefore);
  assert.equal(store.getState().player.level, levelBefore);
  assert.equal(store.getState().inventory.items["small-potion"], potionsBefore + 1);
});

test("敗北時は進行操作できず、リセット後は1階から始められる", () => {
  const store = createGameStore({ playerMaxHp: 1 });
  const dungeon = createDungeonController(store);
  dungeon.start();
  store.dispatch({ type: GAME_ACTION.DAMAGE_PLAYER, amount: 1 });
  assert.equal(dungeon.advance().started, false);
  dungeon.reset();
  store.dispatch({ type: GAME_ACTION.RESET_GAME });
  assert.equal(dungeon.start().floor, 1);
});

test("敵の階層補正は入力を検証し、階層に応じて強化する", () => {
  assert.equal(createEnemy("slime").maxHp, 3);
  assert.equal(createEnemy("slime", { floor: 2 }).maxHp, 4);
  assert.equal(createEnemy("slime", { floor: 4 }).attackPower, 2);
  assert.throws(() => createEnemy("slime", { floor: 0 }), TypeError);
});


test("2階クリア報酬は大きな回復薬になり、次の階へ持ち越される", () => {
  const store = createGameStore();
  const dungeon = createDungeonController(store);
  dungeon.start();
  for (let i = 0; i < 3; i++) {
    winCurrentEnemy(store);
    if (i < 2) dungeon.advance();
  }
  dungeon.claimFloorReward();
  dungeon.advance();

  for (let i = 0; i < 3; i++) {
    winCurrentEnemy(store);
    if (i < 2) dungeon.advance();
  }
  const reward = dungeon.claimFloorReward();
  assert.equal(reward.itemId, "large-potion");
  assert.equal(reward.gold, 20);
  assert.equal(store.getState().inventory.items["large-potion"], 1);
  assert.equal(store.getState().inventory.gold, 35);
  assert.equal(dungeon.getProgress().rewardClaimed, true);
});

test("フロア未クリア時や敗北時は宝箱報酬を受け取れない", () => {
  const store = createGameStore({ playerMaxHp: 1 });
  const dungeon = createDungeonController(store);
  dungeon.start();
  assert.equal(dungeon.claimFloorReward().reason, "floor-not-cleared");
  store.dispatch({ type: GAME_ACTION.DAMAGE_PLAYER, amount: 1 });
  assert.equal(dungeon.claimFloorReward().reason, "floor-not-cleared");
  assert.equal(store.getState().inventory.gold, 0);
});


test("階層ごとに敵編成が変わり、3階の最後にボスが登場する", () => {
  const store = createGameStore();
  const dungeon = createDungeonController(store);
  dungeon.start();
  for (let i = 0; i < 3; i++) {
    winCurrentEnemy(store);
    if (i < 2) dungeon.advance();
  }
  dungeon.claimFloorReward();
  dungeon.advance();
  assert.equal(store.getState().enemy.id, "bat");

  for (let i = 0; i < 3; i++) {
    winCurrentEnemy(store);
    if (i < 2) dungeon.advance();
  }
  dungeon.claimFloorReward();
  dungeon.advance();
  assert.equal(store.getState().enemy.id, "goblin");
  winCurrentEnemy(store);
  dungeon.advance();
  assert.equal(store.getState().enemy.id, "moss-golem");
  winCurrentEnemy(store);
  dungeon.advance();
  assert.equal(store.getState().enemy.id, "forest-dragon");
  assert.equal(store.getState().enemy.isBoss, true);
});

test("旧セーブの進行中フロアは旧編成で継続し、次の階から新編成へ切り替わる", () => {
  const store = createGameStore();
  store.dispatch({
    type: GAME_ACTION.START_BATTLE,
    enemy: createEnemy("slime", { floor: 2 }),
  });
  const dungeon = createDungeonController(store);
  assert.equal(dungeon.restoreSaveData({
    floor: 2, enemyIndex: 0, started: true, rewardClaimed: false,
  }), true);

  for (let i = 0; i < 3; i++) {
    winCurrentEnemy(store);
    if (i < 2) {
      const next = dungeon.advance();
      assert.equal(next.enemy.id, ["bat", "goblin"][i]);
    }
  }
  dungeon.claimFloorReward();
  dungeon.advance();
  assert.equal(dungeon.getProgress().floor, 3);
  assert.equal(store.getState().enemy.id, "goblin");
  assert.equal(dungeon.getSaveData().encounterSetVersion, 2);
});


test("ダンジョンコントローラーはカタログIDを受け取り、セーブにIDを保持する", () => {
  const store = createGameStore();
  assert.throws(
    () => createDungeonController(store, { dungeonId: "unknown-dungeon" }),
    RangeError,
  );

  const dungeon = createDungeonController(store, { dungeonId: "forest-ruins" });
  assert.equal(dungeon.getDungeonInfo().id, "forest-ruins");
  assert.equal(dungeon.getDungeonInfo().name, "はじまりの森");
  dungeon.start();
  assert.equal(dungeon.getSaveData().dungeonId, "forest-ruins");

  const legacy = dungeon.getSaveData();
  delete legacy.dungeonId;
  assert.equal(dungeon.isValidSaveData(legacy), true);
  assert.equal(dungeon.restoreSaveData(legacy), true);
  assert.equal(dungeon.getDungeonInfo().id, "forest-ruins");
});


test("出発前にダンジョンを選択でき、開始後は切り替えられない", () => {
  const store = createGameStore();
  const dungeon = createDungeonController(store);

  assert.equal(dungeon.selectDungeon("missing").reason, "unknown-dungeon");
  const selected = dungeon.selectDungeon("frozen-cavern");
  assert.equal(selected.selected, true);
  assert.equal(selected.dungeon.name, "氷結の洞窟");
  assert.equal(dungeon.getDungeonInfo().id, "frozen-cavern");

  const started = dungeon.start();
  assert.equal(started.started, true);
  assert.equal(store.getState().enemy.id, "ice-wolf");
  assert.equal(dungeon.getSaveData().dungeonId, "frozen-cavern");
  assert.equal(dungeon.selectDungeon("forest-ruins").reason, "adventure-already-started");
  assert.equal(dungeon.getDungeonInfo().id, "frozen-cavern");
});

test("選択したダンジョンIDをセーブから復元して同じ敵編成で続けられる", () => {
  const firstStore = createGameStore();
  const firstDungeon = createDungeonController(firstStore);
  firstDungeon.selectDungeon("frozen-cavern");
  firstDungeon.start();
  const saved = firstDungeon.getSaveData();

  const secondStore = createGameStore();
  secondStore.dispatch({
    type: GAME_ACTION.START_BATTLE,
    enemy: createEnemy("ice-wolf"),
  });
  const secondDungeon = createDungeonController(secondStore);
  assert.equal(secondDungeon.restoreSaveData(saved), true);
  assert.equal(secondDungeon.getDungeonInfo().id, "frozen-cavern");
  assert.equal(secondDungeon.start().reason, "already-started");
  assert.equal(secondDungeon.getSaveData().dungeonId, "frozen-cavern");
});

test("氷結の洞窟は専用の敵編成とボスを順番に登場させる", () => {
  const store = createGameStore();
  const dungeon = createDungeonController(store);
  dungeon.selectDungeon("frozen-cavern");
  dungeon.start();
  assert.equal(store.getState().enemy.id, "ice-wolf");

  winCurrentEnemy(store);
  assert.equal(dungeon.advance().enemy.id, "orc");
  winCurrentEnemy(store);
  assert.equal(dungeon.advance().enemy.id, "ice-golem");
  winCurrentEnemy(store);
  assert.equal(dungeon.getProgress().floorCleared, true);

  const reward = dungeon.claimFloorReward();
  assert.deepEqual(reward, {
    claimed: true, floor: 1, itemId: "large-potion", quantity: 1, gold: 22,
  });
  dungeon.advance();
  assert.equal(store.getState().enemy.id, "ice-wolf");
});


test("敗北後のリセットと再挑戦でも選んだダンジョンを維持する", () => {
  const store = createGameStore({ playerMaxHp: 1 });
  const dungeon = createDungeonController(store);
  dungeon.selectDungeon("frozen-cavern");
  dungeon.start();
  store.dispatch({ type: GAME_ACTION.DAMAGE_PLAYER, amount: 1 });

  dungeon.reset();
  store.dispatch({ type: GAME_ACTION.RESET_GAME });
  assert.equal(dungeon.getDungeonInfo().id, "frozen-cavern");
  assert.equal(dungeon.start().started, true);
  assert.equal(store.getState().enemy.id, "ice-wolf");
});
