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


test("初期プレイヤーはレベル1で、次のレベルまで10EXP", () => {
  const state = createInitialGameState();
  assert.equal(state.player.level, 1);
  assert.equal(state.player.experience, 0);
  assert.equal(state.player.nextLevelXp, 10);
  assert.equal(state.player.maxHp, 3);
  assert.equal(state.player.attackPower, 1);
  assert.equal(state.player.defensePower, 0);
  assert.equal(state.player.baseDefensePower, 0);
  assert.equal(state.stats.totalExperienceEarned, 0);
});

test("敵を倒したときだけEXPを獲得し、レベルアップで能力が上がる", () => {
  let state = gameReducer(createInitialGameState(), {
    type: GAME_ACTION.START_BATTLE,
    enemy: { ...slime, experienceReward: 10 },
  });
  state = gameReducer(state, { type: GAME_ACTION.DAMAGE_PLAYER, amount: 1 });
  state = gameReducer(state, { type: GAME_ACTION.DAMAGE_ENEMY, amount: 2 });

  assert.equal(state.player.experience, 0);
  assert.equal(state.player.level, 1);
  assert.equal(state.stats.totalExperienceEarned, 0);
  assert.equal(state.phase, GAME_PHASE.BATTLE);

  state = gameReducer(state, { type: GAME_ACTION.DAMAGE_ENEMY, amount: 1 });
  assert.equal(state.phase, GAME_PHASE.VICTORY);
  assert.equal(state.player.level, 2);
  assert.equal(state.player.experience, 0);
  assert.equal(state.player.nextLevelXp, 20);
  assert.equal(state.player.maxHp, 4);
  assert.equal(state.player.hp, 3);
  assert.equal(state.player.attackPower, 2);
  assert.equal(state.stats.totalExperienceEarned, 10);

  const afterVictory = gameReducer(state, {
    type: GAME_ACTION.DAMAGE_ENEMY,
    amount: 99,
  });
  assert.equal(afterVictory, state);
  assert.equal(afterVictory.stats.totalExperienceEarned, 10);
});

test("余ったEXPを次のレベルに持ち越し、複数レベルも正しく上がる", () => {
  let state = gameReducer(createInitialGameState(), {
    type: GAME_ACTION.START_BATTLE,
    enemy: { ...slime, experienceReward: 35 },
  });
  state = gameReducer(state, { type: GAME_ACTION.DAMAGE_ENEMY, amount: 3 });

  assert.equal(state.player.level, 3);
  assert.equal(state.player.experience, 5);
  assert.equal(state.player.nextLevelXp, 30);
  assert.equal(state.player.maxHp, 5);
  assert.equal(state.player.hp, 5);
  assert.equal(state.player.attackPower, 3);
});

test("経験値報酬は0以上の整数で、リセットすると成長状態も初期化される", () => {
  assert.throws(
    () => gameReducer(createInitialGameState(), {
      type: GAME_ACTION.START_BATTLE,
      enemy: { ...slime, experienceReward: -1 },
    }),
    TypeError,
  );
  assert.throws(
    () => gameReducer(createInitialGameState(), {
      type: GAME_ACTION.START_BATTLE,
      enemy: { ...slime, experienceReward: 1.5 },
    }),
    TypeError,
  );

  let state = gameReducer(createInitialGameState(), {
    type: GAME_ACTION.START_BATTLE,
    enemy: { ...slime, experienceReward: 10 },
  });
  state = gameReducer(state, { type: GAME_ACTION.DAMAGE_ENEMY, amount: 3 });
  state = gameReducer(state, { type: GAME_ACTION.RESET_GAME });

  assert.equal(state.player.level, 1);
  assert.equal(state.player.experience, 0);
  assert.equal(state.player.nextLevelXp, 10);
  assert.equal(state.player.hp, 3);
  assert.equal(state.player.maxHp, 3);
  assert.equal(state.player.attackPower, 1);
  assert.equal(state.stats.totalExperienceEarned, 0);
});


test("勝利後に次の戦闘へ進んでもレベルと能力値を引き継ぐ", () => {
  let state = gameReducer(createInitialGameState(), {
    type: GAME_ACTION.START_BATTLE,
    enemy: { ...slime, experienceReward: 10 },
  });
  state = gameReducer(state, { type: GAME_ACTION.DAMAGE_ENEMY, amount: 3 });
  state = gameReducer(state, {
    type: GAME_ACTION.START_BATTLE,
    enemy: slime,
  });

  assert.equal(state.phase, GAME_PHASE.BATTLE);
  assert.equal(state.player.level, 2);
  assert.equal(state.player.maxHp, 4);
  assert.equal(state.player.attackPower, 2);
  assert.equal(state.player.experience, 0);
});


test("初期所持品は回復薬2個と木の剣1本で、武器は未装備", () => {
  const state = createInitialGameState();
  assert.deepEqual(state.inventory, {
    items: { "small-potion": 2, "large-potion": 0, "wooden-sword": 1, "wooden-shield": 0, "iron-sword": 0, "leather-armor": 0, "copper-charm": 0, "forest-dragon-seal": 0, "ice-dragon-core": 0 },
    equipment: { weapon: null, shield: null, armor: null, accessory: null },
    gold: 0,
  });
});

test("回復薬はHPが減っているときだけ消費し、最大HPを超えて回復しない", () => {
  let state = gameReducer(createInitialGameState(), {
    type: GAME_ACTION.START_BATTLE,
    enemy: slime,
  });

  const fullHpState = gameReducer(state, {
    type: GAME_ACTION.USE_ITEM,
    itemId: "small-potion",
  });
  assert.equal(fullHpState, state);
  assert.equal(fullHpState.inventory.items["small-potion"], 2);

  state = gameReducer(state, { type: GAME_ACTION.DAMAGE_PLAYER, amount: 1 });
  state = gameReducer(state, {
    type: GAME_ACTION.USE_ITEM,
    itemId: "small-potion",
  });
  assert.equal(state.player.hp, 3);
  assert.equal(state.inventory.items["small-potion"], 1);

  state = gameReducer(state, { type: GAME_ACTION.DAMAGE_PLAYER, amount: 2 });
  state = gameReducer(state, {
    type: GAME_ACTION.USE_ITEM,
    itemId: "small-potion",
  });
  assert.equal(state.player.hp, 3);
  assert.equal(state.inventory.items["small-potion"], 0);

  const noPotionState = gameReducer(state, {
    type: GAME_ACTION.USE_ITEM,
    itemId: "small-potion",
  });
  assert.equal(noPotionState, state);
});

test("武器装備は攻撃力を上げ、レベルアップ分と別々に計算する", () => {
  let state = gameReducer(createInitialGameState({ playerAttackPower: 2 }), {
    type: GAME_ACTION.START_BATTLE,
    enemy: { ...slime, experienceReward: 10 },
  });
  state = gameReducer(state, {
    type: GAME_ACTION.EQUIP_WEAPON,
    itemId: "wooden-sword",
  });

  assert.equal(state.player.baseAttackPower, 2);
  assert.equal(state.player.attackPower, 3);
  assert.equal(state.inventory.items["wooden-sword"], 0);
  assert.equal(state.inventory.equipment.weapon, "wooden-sword");

  const duplicateEquip = gameReducer(state, {
    type: GAME_ACTION.EQUIP_WEAPON,
    itemId: "wooden-sword",
  });
  assert.equal(duplicateEquip, state);

  state = gameReducer(state, { type: GAME_ACTION.DAMAGE_ENEMY, amount: 3 });
  assert.equal(state.player.level, 2);
  assert.equal(state.player.baseAttackPower, 3);
  assert.equal(state.player.attackPower, 4);
});

test("アイテムはバトル中以外には使えず、敗北時のリセットで所持品と装備も戻る", () => {
  let state = createInitialGameState({ playerMaxHp: 4, playerAttackPower: 2 });
  const beforeBattle = state;
  state = gameReducer(state, {
    type: GAME_ACTION.EQUIP_WEAPON,
    itemId: "wooden-sword",
  });
  assert.equal(state, beforeBattle);

  state = gameReducer(state, {
    type: GAME_ACTION.START_BATTLE,
    enemy: slime,
  });
  state = gameReducer(state, {
    type: GAME_ACTION.EQUIP_WEAPON,
    itemId: "wooden-sword",
  });
  state = gameReducer(state, { type: GAME_ACTION.DAMAGE_PLAYER, amount: 4 });
  state = gameReducer(state, { type: GAME_ACTION.RESET_GAME });

  assert.equal(state.player.maxHp, 4);
  assert.equal(state.player.attackPower, 2);
  assert.deepEqual(state.inventory, {
    items: { "small-potion": 2, "large-potion": 0, "wooden-sword": 1, "wooden-shield": 0, "iron-sword": 0, "leather-armor": 0, "copper-charm": 0, "forest-dragon-seal": 0, "ice-dragon-core": 0 },
    equipment: { weapon: null, shield: null, armor: null, accessory: null },
    gold: 0,
  });
});

test("未登録アイテムや装備できない種類は無視される", () => {
  let state = gameReducer(createInitialGameState(), {
    type: GAME_ACTION.START_BATTLE,
    enemy: slime,
  });

  const unknownItem = gameReducer(state, {
    type: GAME_ACTION.USE_ITEM,
    itemId: "unknown",
  });
  const invalidWeapon = gameReducer(state, {
    type: GAME_ACTION.EQUIP_WEAPON,
    itemId: "small-potion",
  });
  assert.equal(unknownItem, state);
  assert.equal(invalidWeapon, state);
});


test("宝箱報酬で登録済みアイテムとゴールドを追加できる", () => {
  let state = createInitialGameState();
  state = gameReducer(state, {
    type: GAME_ACTION.ADD_ITEM,
    itemId: "large-potion",
    quantity: 2,
  });
  state = gameReducer(state, { type: GAME_ACTION.ADD_GOLD, amount: 15 });
  assert.equal(state.inventory.items["large-potion"], 2);
  assert.equal(state.inventory.gold, 15);

  const invalidItem = gameReducer(state, {
    type: GAME_ACTION.ADD_ITEM,
    itemId: "unknown",
    quantity: 1,
  });
  const invalidQuantity = gameReducer(state, {
    type: GAME_ACTION.ADD_ITEM,
    itemId: "small-potion",
    quantity: 0,
  });
  const invalidGold = gameReducer(state, {
    type: GAME_ACTION.ADD_GOLD,
    amount: -1,
  });
  assert.equal(invalidItem, state);
  assert.equal(invalidQuantity, state);
  assert.equal(invalidGold, state);
});

test("大きな回復薬は定義された回復量だけHPを回復する", () => {
  let state = createInitialGameState();
  state = gameReducer(state, {
    type: GAME_ACTION.START_BATTLE,
    enemy: slime,
  });
  state = gameReducer(state, { type: GAME_ACTION.ADD_ITEM, itemId: "large-potion" });
  state = gameReducer(state, { type: GAME_ACTION.DAMAGE_PLAYER, amount: 2 });
  state = gameReducer(state, { type: GAME_ACTION.USE_ITEM, itemId: "large-potion" });
  assert.equal(state.player.hp, 3);
  assert.equal(state.inventory.items["large-potion"], 0);
});


test("ショップ価格はゲーム状態側でも固定され、不正な商品キーを追加できない", () => {
  let state = createInitialGameState();
  state = gameReducer(state, { type: GAME_ACTION.ADD_GOLD, amount: 30 });
  state = gameReducer(state, {
    type: GAME_ACTION.START_BATTLE,
    enemy: { ...slime, maxHp: 1 },
  });
  state = gameReducer(state, { type: GAME_ACTION.DAMAGE_ENEMY, amount: 1 });
  const victoryState = state;

  const underpriced = gameReducer(state, {
    type: GAME_ACTION.BUY_ITEM,
    itemId: "large-potion",
    cost: 1,
  });
  assert.equal(underpriced, victoryState);

  state = gameReducer(state, {
    type: GAME_ACTION.BUY_ITEM,
    itemId: "large-potion",
    cost: 30,
  });
  assert.equal(state.inventory.gold, 0);
  assert.equal(state.inventory.items["large-potion"], 1);

  const invalidKey = gameReducer(state, {
    type: GAME_ACTION.ADD_ITEM,
    itemId: "toString",
    quantity: 1,
  });
  assert.equal(invalidKey, state);
});


test("木の盾を装備すると防御力が上がり、装備状態と所持数が更新される", () => {
  let state = createInitialGameState();
  state = gameReducer(state, {
    type: GAME_ACTION.ADD_ITEM,
    itemId: "wooden-shield",
    quantity: 1,
  });
  state = gameReducer(state, {
    type: GAME_ACTION.START_BATTLE,
    enemy: slime,
  });
  state = gameReducer(state, {
    type: GAME_ACTION.EQUIP_SHIELD,
    itemId: "wooden-shield",
  });

  assert.equal(state.player.baseDefensePower, 0);
  assert.equal(state.player.defensePower, 1);
  assert.equal(state.inventory.items["wooden-shield"], 0);
  assert.equal(state.inventory.equipment.shield, "wooden-shield");

  const duplicate = gameReducer(state, {
    type: GAME_ACTION.EQUIP_SHIELD,
    itemId: "wooden-shield",
  });
  assert.equal(duplicate, state);

  state = gameReducer(state, { type: GAME_ACTION.DAMAGE_ENEMY, amount: 3 });
  assert.equal(state.phase, GAME_PHASE.VICTORY);
  state = gameReducer(state, { type: GAME_ACTION.RESET_GAME });
  assert.equal(state.player.defensePower, 0);
  assert.equal(state.inventory.equipment.shield, null);
});

test("所持していない盾や防具以外は装備できない", () => {
  let state = gameReducer(createInitialGameState(), {
    type: GAME_ACTION.START_BATTLE,
    enemy: slime,
  });
  const noShield = gameReducer(state, {
    type: GAME_ACTION.EQUIP_SHIELD,
    itemId: "wooden-shield",
  });
  const potionAsShield = gameReducer(state, {
    type: GAME_ACTION.EQUIP_SHIELD,
    itemId: "small-potion",
  });
  assert.equal(noShield, state);
  assert.equal(potionAsShield, state);
});


test("盾を装備したままレベルアップしても防御力を維持する", () => {
  let state = createInitialGameState();
  state = gameReducer(state, {
    type: GAME_ACTION.ADD_ITEM,
    itemId: "wooden-shield",
  });
  state = gameReducer(state, {
    type: GAME_ACTION.START_BATTLE,
    enemy: { ...slime, maxHp: 1, experienceReward: 10 },
  });
  state = gameReducer(state, {
    type: GAME_ACTION.EQUIP_SHIELD,
    itemId: "wooden-shield",
  });
  state = gameReducer(state, { type: GAME_ACTION.DAMAGE_ENEMY, amount: 1 });
  assert.equal(state.player.level, 2);
  assert.equal(state.player.attackPower, 2);
  assert.equal(state.player.defensePower, 1);
});


test("汎用装備アクションで複数スロットの能力ボーナスを合算できる", () => {
  let state = createInitialGameState();
  for (const itemId of ["iron-sword", "leather-armor", "copper-charm"]) {
    state = gameReducer(state, { type: GAME_ACTION.ADD_ITEM, itemId });
  }
  state = gameReducer(state, {
    type: GAME_ACTION.START_BATTLE,
    enemy: slime,
  });

  state = gameReducer(state, { type: GAME_ACTION.EQUIP_ITEM, itemId: "iron-sword" });
  state = gameReducer(state, { type: GAME_ACTION.EQUIP_ITEM, itemId: "leather-armor" });
  state = gameReducer(state, { type: GAME_ACTION.EQUIP_ITEM, itemId: "copper-charm" });

  assert.deepEqual(state.inventory.equipment, {
    weapon: "iron-sword",
    shield: null,
    armor: "leather-armor",
    accessory: "copper-charm",
  });
  assert.equal(state.player.attackPower, 4);
  assert.equal(state.player.defensePower, 2);
  assert.equal(state.inventory.items["iron-sword"], 0);
  assert.equal(state.inventory.items["leather-armor"], 0);
  assert.equal(state.inventory.items["copper-charm"], 0);
});

test("同じ装備スロットの付け替えで旧装備が戻り、能力値を再計算する", () => {
  let state = createInitialGameState();
  state = gameReducer(state, { type: GAME_ACTION.ADD_ITEM, itemId: "iron-sword" });
  state = gameReducer(state, { type: GAME_ACTION.START_BATTLE, enemy: slime });
  state = gameReducer(state, { type: GAME_ACTION.EQUIP_ITEM, itemId: "iron-sword" });
  state = gameReducer(state, { type: GAME_ACTION.EQUIP_ITEM, itemId: "wooden-sword" });

  assert.equal(state.inventory.equipment.weapon, "wooden-sword");
  assert.equal(state.inventory.items["iron-sword"], 1);
  assert.equal(state.inventory.items["wooden-sword"], 0);
  assert.equal(state.player.attackPower, 2);
});

test("未所持・戦闘外の汎用装備アクションは状態を変更しない", () => {
  const titleState = createInitialGameState();
  assert.equal(
    gameReducer(titleState, { type: GAME_ACTION.EQUIP_ITEM, itemId: "iron-sword" }),
    titleState,
  );
  let battleState = gameReducer(titleState, {
    type: GAME_ACTION.START_BATTLE,
    enemy: slime,
  });
  assert.equal(
    gameReducer(battleState, { type: GAME_ACTION.EQUIP_ITEM, itemId: "iron-sword" }),
    battleState,
  );
});

test("冒険者ホームでは冒険前に装備を整え、同じ枠の旧装備を所持品へ戻せる", () => {
  let state = createInitialGameState();

  state = gameReducer(state, {
    type: GAME_ACTION.PREPARE_EQUIPMENT,
    itemId: "wooden-sword",
  });
  assert.equal(state.phase, GAME_PHASE.TITLE);
  assert.equal(state.inventory.equipment.weapon, "wooden-sword");
  assert.equal(state.player.attackPower, 2);
  assert.equal(state.inventory.items["wooden-sword"], 0);

  state = gameReducer(state, {
    type: GAME_ACTION.ADD_ITEM,
    itemId: "iron-sword",
  });
  state = gameReducer(state, {
    type: GAME_ACTION.PREPARE_EQUIPMENT,
    itemId: "iron-sword",
  });
  assert.equal(state.inventory.equipment.weapon, "iron-sword");
  assert.equal(state.inventory.items["iron-sword"], 0);
  assert.equal(state.inventory.items["wooden-sword"], 1);
  assert.equal(state.player.attackPower, 3);
});

test("事前装備アクションは一時停止中に使え、敗北状態では使えない", () => {
  let state = gameReducer(createInitialGameState(), {
    type: GAME_ACTION.START_BATTLE,
    enemy: slime,
  });
  state = gameReducer(state, { type: GAME_ACTION.PAUSE_BATTLE });
  const paused = gameReducer(state, {
    type: GAME_ACTION.PREPARE_EQUIPMENT,
    itemId: "wooden-sword",
  });
  assert.notEqual(paused, state);
  assert.equal(paused.inventory.equipment.weapon, "wooden-sword");
  assert.equal(paused.player.attackPower, 2);

  state = gameReducer(gameReducer(createInitialGameState(), {
    type: GAME_ACTION.START_BATTLE,
    enemy: slime,
  }), { type: GAME_ACTION.DAMAGE_PLAYER, amount: 3 });
  const defeated = gameReducer(state, {
    type: GAME_ACTION.PREPARE_EQUIPMENT,
    itemId: "wooden-sword",
  });
  assert.equal(defeated, state);
});


test("一時停止と再開を繰り返してもHP・敵・ダンジョン進行は変化しない", () => {
  let state = gameReducer(createInitialGameState(), {
    type: GAME_ACTION.START_BATTLE,
    enemy: { ...slime, maxHp: 7, attackPower: 2 },
  });
  state = gameReducer(state, { type: GAME_ACTION.DAMAGE_PLAYER, amount: 1 });
  state = gameReducer(state, { type: GAME_ACTION.DAMAGE_ENEMY, amount: 2 });
  const beforePause = structuredClone(state);

  state = gameReducer(state, { type: GAME_ACTION.PAUSE_BATTLE });
  assert.equal(state.phase, GAME_PHASE.PAUSED);
  assert.equal(state.pausedFrom, GAME_PHASE.BATTLE);
  assert.equal(state.player.hp, beforePause.player.hp);
  assert.equal(state.enemy.hp, beforePause.enemy.hp);
  assert.equal(state.battle.number, beforePause.battle.number);

  state = gameReducer(state, { type: GAME_ACTION.RESUME_BATTLE });
  assert.equal(state.phase, GAME_PHASE.BATTLE);
  assert.equal(state.pausedFrom, null);
  assert.equal(state.player.hp, beforePause.player.hp);
  assert.equal(state.enemy.hp, beforePause.enemy.hp);
});


test("スキルはゴールドで強化でき、レベルごとの出題範囲も保存される", () => {
  let state = createInitialGameState();
  assert.deepEqual(state.skillLevels, {
    "quick-strike": 1,
    "power-strike": 1,
    "ultimate-strike": 1,
  });

  state = gameReducer(state, { type: GAME_ACTION.ADD_GOLD, amount: 50 });
  state = gameReducer(state, {
    type: GAME_ACTION.UPGRADE_SKILL,
    skillId: "quick-strike",
  });

  assert.equal(state.skillLevels["quick-strike"], 2);
  assert.equal(state.skillLevels["power-strike"], 1);
  assert.equal(state.inventory.gold, 0);
});

test("スキル強化は50・100・200・400Gで上昇し、Lv.5が上限", () => {
  let state = createInitialGameState();
  state = gameReducer(state, { type: GAME_ACTION.ADD_GOLD, amount: 750 });

  for (let expectedLevel = 2; expectedLevel <= 5; expectedLevel += 1) {
    state = gameReducer(state, {
      type: GAME_ACTION.UPGRADE_SKILL,
      skillId: "power-strike",
    });
    assert.equal(state.skillLevels["power-strike"], expectedLevel);
  }

  const atMax = gameReducer(state, {
    type: GAME_ACTION.UPGRADE_SKILL,
    skillId: "power-strike",
  });
  assert.equal(atMax, state);
  assert.equal(state.inventory.gold, 0);
});

test("ゴールド不足・未登録スキル・戦闘中の強化は拒否する", () => {
  const poor = createInitialGameState();
  assert.equal(gameReducer(poor, {
    type: GAME_ACTION.UPGRADE_SKILL,
    skillId: "quick-strike",
  }), poor);

  const invalid = gameReducer(
    gameReducer(poor, { type: GAME_ACTION.ADD_GOLD, amount: 500 }),
    { type: GAME_ACTION.UPGRADE_SKILL, skillId: "unknown-skill" },
  );
  assert.equal(invalid.inventory.gold, 500);
  assert.equal(invalid.skillLevels["quick-strike"], 1);

  let battle = gameReducer(
    gameReducer(poor, { type: GAME_ACTION.ADD_GOLD, amount: 500 }),
    { type: GAME_ACTION.START_BATTLE, enemy: slime },
  );
  const rejected = gameReducer(battle, {
    type: GAME_ACTION.UPGRADE_SKILL,
    skillId: "quick-strike",
  });
  assert.equal(rejected, battle);
  assert.equal(rejected.inventory.gold, 500);
});

test("ゲームをリセットするとスキルレベルも初期状態に戻る", () => {
  let state = gameReducer(createInitialGameState(), { type: GAME_ACTION.ADD_GOLD, amount: 50 });
  state = gameReducer(state, {
    type: GAME_ACTION.UPGRADE_SKILL,
    skillId: "ultimate-strike",
  });
  assert.equal(state.skillLevels["ultimate-strike"], 2);

  state = gameReducer(state, { type: GAME_ACTION.RESET_GAME });
  assert.equal(state.skillLevels["ultimate-strike"], 1);
});


test("ホームへ戻るとHPと戦闘状態だけを整え、冒険者の成長を維持する", () => {
  let state = gameReducer(createInitialGameState(), {
    type: GAME_ACTION.ADD_GOLD,
    amount: 80,
  });
  state = gameReducer(state, {
    type: GAME_ACTION.START_BATTLE,
    enemy: slime,
  });
  state = gameReducer(state, { type: GAME_ACTION.DAMAGE_PLAYER, amount: 2 });
  state = gameReducer(state, { type: GAME_ACTION.PAUSE_BATTLE });
  state = gameReducer(state, {
    type: GAME_ACTION.UPGRADE_SKILL,
    skillId: "quick-strike",
  });
  const before = state;

  state = gameReducer(state, { type: GAME_ACTION.RETURN_TO_TOWN });
  assert.equal(state.phase, GAME_PHASE.TITLE);
  assert.equal(state.pausedFrom, null);
  assert.equal(state.enemy, null);
  assert.equal(state.lastBattleResult, null);
  assert.equal(state.player.hp, state.player.maxHp);
  assert.equal(state.inventory.gold, before.inventory.gold);
  assert.deepEqual(state.skillLevels, before.skillLevels);
  assert.equal(state.stats.enemiesDefeated, before.stats.enemiesDefeated);
});


test("スキルは4枠まで装備でき、重複と最後の1枠の解除はできない", () => {
  let state = createInitialGameState();
  assert.deepEqual(state.equippedSkillIds, ["quick-strike", "power-strike", "ultimate-strike", null]);
  const duplicate = gameReducer(state, { type: GAME_ACTION.EQUIP_SKILL, slotIndex: 3, skillId: "quick-strike" });
  assert.equal(duplicate, state);
  state = gameReducer(state, { type: GAME_ACTION.EQUIP_SKILL, slotIndex: 1, skillId: null });
  assert.deepEqual(state.equippedSkillIds, ["quick-strike", null, "ultimate-strike", null]);
  state = gameReducer(state, { type: GAME_ACTION.EQUIP_SKILL, slotIndex: 0, skillId: null });
  assert.equal(state.equippedSkillIds[0], null);
  const lastSkill = gameReducer(state, { type: GAME_ACTION.EQUIP_SKILL, slotIndex: 2, skillId: null });
  assert.equal(lastSkill, state);
});

test("スキル装備の変更は街でのみ行え、登録外の技は装備できない", () => {
  const title = createInitialGameState();
  const unknown = gameReducer(title, { type: GAME_ACTION.EQUIP_SKILL, slotIndex: 3, skillId: "unknown-skill" });
  assert.equal(unknown, title);
  const battle = gameReducer(title, { type: GAME_ACTION.START_BATTLE, enemy: slime });
  const duringBattle = gameReducer(battle, { type: GAME_ACTION.EQUIP_SKILL, slotIndex: 3, skillId: "quick-strike" });
  assert.equal(duringBattle, battle);
});
