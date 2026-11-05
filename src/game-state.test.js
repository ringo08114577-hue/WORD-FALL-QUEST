import test from "node:test";
import assert from "node:assert/strict";

import {
  createGameStore,
  createInitialGameState,
  gameReducer,
  GAME_ACTION,
  GAME_PHASE,
} from "./game-state.js";

const slime = { id: "slime", name: "スライム", maxHp: 3 };

test("初期状態はタイトル画面で、プレイヤーHPは3", () => {
  const state = createInitialGameState();
  assert.equal(state.phase, GAME_PHASE.TITLE);
  assert.equal(state.player.hp, 3);
  assert.equal(state.player.maxHp, 3);
  assert.equal(state.enemy, null);
});

test("バトル開始で敵とバトル番号が設定される", () => {
  const initial = createInitialGameState();
  const state = gameReducer(initial, {
    type: GAME_ACTION.START_BATTLE,
    enemy: slime,
  });

  assert.equal(state.phase, GAME_PHASE.BATTLE);
  assert.equal(state.enemy.name, "スライム");
  assert.equal(state.enemy.hp, 3);
  assert.equal(state.battle.number, 1);
});

test("敵へのダメージでHPが減り、0になると勝利になる", () => {
  let state = gameReducer(createInitialGameState(), {
    type: GAME_ACTION.START_BATTLE,
    enemy: slime,
  });

  state = gameReducer(state, { type: GAME_ACTION.DAMAGE_ENEMY, amount: 2 });
  assert.equal(state.enemy.hp, 1);
  assert.equal(state.phase, GAME_PHASE.BATTLE);

  state = gameReducer(state, { type: GAME_ACTION.DAMAGE_ENEMY, amount: 1 });
  assert.equal(state.enemy.hp, 0);
  assert.equal(state.phase, GAME_PHASE.VICTORY);
  assert.equal(state.stats.enemiesDefeated, 1);
  assert.equal(state.lastBattleResult, "victory");
});

test("プレイヤーHPが0になると敗北になり、0未満にはならない", () => {
  let state = gameReducer(createInitialGameState(), {
    type: GAME_ACTION.START_BATTLE,
    enemy: slime,
  });

  state = gameReducer(state, { type: GAME_ACTION.DAMAGE_PLAYER, amount: 99 });
  assert.equal(state.player.hp, 0);
  assert.equal(state.phase, GAME_PHASE.DEFEAT);
  assert.equal(state.lastBattleResult, "defeat");
});

test("一時停止中はダメージが適用されず、再開できる", () => {
  let state = gameReducer(createInitialGameState(), {
    type: GAME_ACTION.START_BATTLE,
    enemy: slime,
  });

  state = gameReducer(state, { type: GAME_ACTION.PAUSE_BATTLE });
  const pausedState = gameReducer(state, {
    type: GAME_ACTION.DAMAGE_PLAYER,
    amount: 1,
  });
  assert.equal(pausedState, state);
  assert.equal(pausedState.player.hp, 3);

  state = gameReducer(state, { type: GAME_ACTION.RESUME_BATTLE });
  assert.equal(state.phase, GAME_PHASE.BATTLE);
});

test("回復は最大HPを超えない", () => {
  let state = gameReducer(createInitialGameState(), {
    type: GAME_ACTION.START_BATTLE,
    enemy: slime,
  });
  state = gameReducer(state, { type: GAME_ACTION.DAMAGE_PLAYER, amount: 2 });
  state = gameReducer(state, { type: GAME_ACTION.HEAL_PLAYER, amount: 20 });
  assert.equal(state.player.hp, state.player.maxHp);
});

test("勝利後は次のバトルを開始できる", () => {
  let state = gameReducer(createInitialGameState(), {
    type: GAME_ACTION.START_BATTLE,
    enemy: { ...slime, maxHp: 1 },
  });
  state = gameReducer(state, { type: GAME_ACTION.DAMAGE_ENEMY, amount: 1 });
  state = gameReducer(state, {
    type: GAME_ACTION.START_BATTLE,
    enemy: slime,
  });

  assert.equal(state.phase, GAME_PHASE.BATTLE);
  assert.equal(state.battle.number, 2);
  assert.equal(state.stats.enemiesDefeated, 1);
});

test("敗北後の操作は無視され、リセットで初期状態に戻る", () => {
  let state = gameReducer(createInitialGameState(), {
    type: GAME_ACTION.START_BATTLE,
    enemy: slime,
  });
  state = gameReducer(state, { type: GAME_ACTION.DAMAGE_PLAYER, amount: 3 });
  const defeatedState = gameReducer(state, {
    type: GAME_ACTION.DAMAGE_ENEMY,
    amount: 1,
  });

  assert.equal(defeatedState, state);

  state = gameReducer(state, { type: GAME_ACTION.RESET_GAME });
  assert.equal(state.phase, GAME_PHASE.TITLE);
  assert.equal(state.player.hp, 3);
  assert.equal(state.battle.number, 0);
  assert.equal(state.stats.enemiesDefeated, 0);
});

test("storeは状態変更時に通知し、状態を直接変更できない", () => {
  const store = createGameStore();
  let notifications = 0;
  store.subscribe(() => notifications++);

  store.dispatch({ type: GAME_ACTION.START_BATTLE, enemy: slime });
  assert.equal(notifications, 1);
  assert.equal(Object.isFrozen(store.getState()), true);
  assert.equal(Object.isFrozen(store.getState().player), true);

  store.dispatch({ type: GAME_ACTION.PAUSE_BATTLE });
  assert.equal(notifications, 2);
});

test("プレイヤーと敵の攻撃力は正の整数で管理され、リセット後も維持される", () => {
  const store = createGameStore({ playerMaxHp: 5, playerAttackPower: 2 });
  store.dispatch({
    type: GAME_ACTION.START_BATTLE,
    enemy: { ...slime, attackPower: 3 },
  });

  assert.equal(store.getState().player.attackPower, 2);
  assert.equal(store.getState().enemy.attackPower, 3);

  store.dispatch({ type: GAME_ACTION.RESET_GAME });
  assert.equal(store.getState().player.maxHp, 5);
  assert.equal(store.getState().player.attackPower, 2);

  assert.throws(
    () => gameReducer(createInitialGameState(), {
      type: GAME_ACTION.START_BATTLE,
      enemy: { ...slime, attackPower: 0 },
    }),
    TypeError,
  );
  assert.throws(
    () => createGameStore({ playerAttackPower: 0 }),
    TypeError,
  );
});
