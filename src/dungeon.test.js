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
  assert.equal(store.getState().enemy.id, "slime");
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
  dungeon.advance();

  assert.equal(store.getState().enemy.maxHp, 4);
  assert.equal(store.getState().player.hp, hpBefore);
  assert.equal(store.getState().player.level, levelBefore);
  assert.equal(store.getState().inventory.items["small-potion"], potionsBefore);
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
