import test from "node:test";
import assert from "node:assert/strict";

import { createGameStore, GAME_ACTION, GAME_PHASE } from "./game-state.js";
import { createCombatController, resolveCombatEvent } from "./combat.js";
import { createEnemy } from "./enemies.js";

function startBattle({ playerMaxHp = 3, playerAttackPower = 1, enemy } = {}) {
  const store = createGameStore({ playerMaxHp, playerAttackPower });
  store.dispatch({
    type: GAME_ACTION.START_BATTLE,
    enemy: enemy ?? createEnemy("slime"),
  });
  return store;
}

test("敵データはIDから作成され、呼び出し元で安全に変更できる", () => {
  const slime = createEnemy("slime");
  assert.deepEqual(slime, {
    id: "slime",
    name: "スライム",
    maxHp: 3,
    attackPower: 1,
    experienceReward: 10,
    abilities: [],
    isBoss: false,
  });
  slime.maxHp = 99;
  assert.equal(createEnemy("slime").maxHp, 3);
  assert.throws(() => createEnemy("dragon"), RangeError);
});

test("正しい文字ではHPを減らさず、メッセージだけを返す", () => {
  const store = startBattle();
  const result = resolveCombatEvent(store.getState(), {
    type: "correct",
    letter: "A",
  });
  assert.equal(result.action, null);
  assert.equal(store.getState().player.hp, 3);
  assert.equal(store.getState().enemy.hp, 3);
  assert.match(result.message, /正解/);
});

test("間違った文字では敵のattackPowerぶんプレイヤーがダメージを受ける", () => {
  const store = startBattle({
    enemy: { ...createEnemy("slime"), attackPower: 2 },
  });
  const combat = createCombatController(store);
  const result = combat.handle({
    eventId: "challenge-0-letter-1",
    type: "wrong",
    letter: "Z",
  });

  assert.equal(result.damageTarget, "player");
  assert.equal(result.damage, 2);
  assert.equal(store.getState().player.hp, 1);
  assert.match(result.message, /スライムの反撃/);
});

test("単語完成時はプレイヤーのattackPowerぶん敵にダメージを与える", () => {
  const store = startBattle({ playerAttackPower: 2 });
  const combat = createCombatController(store);
  const result = combat.handle({
    eventId: "challenge-0-letter-5",
    type: "word-complete",
  });

  assert.equal(result.damageTarget, "enemy");
  assert.equal(result.damage, 2);
  assert.equal(store.getState().enemy.hp, 1);
  assert.match(result.message, /2ダメージ/);
});

test("同じ戦闘イベントを2回処理してもダメージは1回だけ", () => {
  const store = startBattle();
  const combat = createCombatController(store);
  const event = {
    eventId: "challenge-0-letter-9",
    type: "wrong",
    letter: "X",
  };

  const first = combat.handle(event);
  const second = combat.handle(event);

  assert.equal(first.ignored, false);
  assert.equal(second.ignored, true);
  assert.equal(second.duplicate, true);
  assert.equal(store.getState().player.hp, 2);
});

test("敵を倒すと勝利になり、その後のイベントは無視される", () => {
  const store = startBattle({
    playerAttackPower: 3,
    enemy: { ...createEnemy("slime"), maxHp: 3 },
  });
  const combat = createCombatController(store);
  const result = combat.handle({
    eventId: "challenge-0-letter-20",
    type: "word-complete",
  });

  assert.equal(store.getState().phase, GAME_PHASE.VICTORY);
  assert.equal(store.getState().enemy.hp, 0);
  assert.equal(result.experienceGained, 10);
  assert.equal(result.levelUps, 1);
  assert.equal(store.getState().player.level, 2);
  assert.equal(store.getState().player.attackPower, 4);
  assert.match(result.message, /EXP \+10/);
  assert.match(result.message, /レベルアップ/);

  const ignored = combat.handle({
    eventId: "challenge-0-letter-21",
    type: "wrong",
    letter: "Z",
  });
  assert.equal(ignored.ignored, true);
  assert.equal(store.getState().player.hp, 4);
});

test("プレイヤーHPが0になると敗北になり、同じイベントで二重に減らない", () => {
  const store = startBattle({
    playerMaxHp: 1,
    enemy: { ...createEnemy("slime"), attackPower: 1 },
  });
  const combat = createCombatController(store);
  const event = {
    eventId: "challenge-0-letter-30",
    type: "wrong",
    letter: "Q",
  };

  const result = combat.handle(event);
  const duplicate = combat.handle(event);

  assert.equal(store.getState().phase, GAME_PHASE.DEFEAT);
  assert.equal(store.getState().player.hp, 0);
  assert.match(result.message, /失敗/);
  assert.equal(duplicate.duplicate, true);
  assert.equal(store.getState().stats.totalExperienceEarned, 0);
});

test("イベントIDのないイベントとバトル外のイベントは処理しない", () => {
  const store = startBattle();
  const combat = createCombatController(store);

  assert.equal(combat.handle({ type: "wrong" }).ignored, true);
  store.dispatch({ type: GAME_ACTION.DAMAGE_PLAYER, amount: 3 });
  const ignored = combat.handle({
    eventId: "challenge-0-letter-40",
    type: "word-complete",
  });
  assert.equal(ignored.ignored, true);
  assert.equal(store.getState().enemy.hp, 3);
});

test("同じ文字イベントをリセット後の新しい戦闘で再利用できる", () => {
  const store = startBattle();
  const combat = createCombatController(store);
  const event = {
    eventId: "challenge-0-letter-1",
    type: "wrong",
    letter: "Z",
  };
  combat.handle(event);
  assert.equal(store.getState().player.hp, 2);

  combat.reset();
  store.dispatch({ type: GAME_ACTION.RESET_GAME });
  store.dispatch({
    type: GAME_ACTION.START_BATTLE,
    enemy: createEnemy("slime"),
  });
  const again = combat.handle(event);

  assert.equal(again.ignored, false);
  assert.equal(store.getState().player.hp, 2);
});


test("盾は敵の反撃ダメージを1減らすが、最低1ダメージは受ける", () => {
  const store = startBattle({
    enemy: { ...createEnemy("slime"), attackPower: 2 },
  });
  store.dispatch({ type: GAME_ACTION.ADD_ITEM, itemId: "wooden-shield" });
  store.dispatch({
    type: GAME_ACTION.EQUIP_SHIELD,
    itemId: "wooden-shield",
  });
  const combat = createCombatController(store);
  const result = combat.handle({
    eventId: "shield-test-letter-1",
    type: "wrong",
    letter: "Z",
  });

  assert.equal(result.damage, 1);
  assert.equal(store.getState().player.hp, 2);
  assert.equal(store.getState().player.defensePower, 1);
});


test("防御力が敵の攻撃力以上でも最低1ダメージは受ける", () => {
  const store = startBattle({
    enemy: { ...createEnemy("slime"), attackPower: 1 },
  });
  store.dispatch({ type: GAME_ACTION.ADD_ITEM, itemId: "wooden-shield" });
  store.dispatch({
    type: GAME_ACTION.EQUIP_SHIELD,
    itemId: "wooden-shield",
  });
  const result = createCombatController(store).handle({
    eventId: "shield-minimum-damage",
    type: "wrong",
    letter: "Z",
  });
  assert.equal(result.damage, 1);
  assert.equal(store.getState().player.hp, 2);
});


test("コウモリの素早い反撃は間違った文字へのダメージを1増やす", () => {
  const store = startBattle({ enemy: createEnemy("bat") });
  const result = createCombatController(store).handle({
    eventId: "bat-swift-counter", type: "wrong", letter: "Z",
  });
  assert.equal(result.damage, 2);
  assert.match(result.message, /すばやい反撃/);
  assert.equal(store.getState().player.hp, 1);
});

test("ゴブリンのかたい体は単語攻撃のダメージを1減らす", () => {
  const store = startBattle({ playerAttackPower: 2, enemy: createEnemy("goblin") });
  const result = createCombatController(store).handle({
    eventId: "goblin-guard", type: "word-complete",
  });
  assert.equal(result.damage, 1);
  assert.equal(store.getState().enemy.hp, 3);
  assert.match(result.message, /かたい体/);
});

test("オークの防御突破はプレイヤーの防御力を1無視する", () => {
  const store = startBattle({ enemy: createEnemy("orc") });
  store.dispatch({ type: GAME_ACTION.ADD_ITEM, itemId: "wooden-shield" });
  store.dispatch({ type: GAME_ACTION.EQUIP_SHIELD, itemId: "wooden-shield" });
  assert.equal(store.getState().player.defensePower, 1);
  const result = createCombatController(store).handle({
    eventId: "orc-piercing", type: "wrong", letter: "X",
  });
  assert.equal(result.damage, 2);
  assert.match(result.message, /防御力を一部無視/);
});

test("ボスは複数の能力を組み合わせて持つ", () => {
  const dragon = createEnemy("forest-dragon");
  assert.equal(dragon.isBoss, true);
  assert.deepEqual(dragon.abilities, ["swift", "guard", "piercing"]);
});


test("技の種類によって単語完成時のダメージが変わる", () => {
  for (const [skillId, expectedDamage] of [
    ["quick-strike", 1],
    ["power-strike", 2],
    ["ultimate-strike", 3],
  ]) {
    const store = startBattle();
    const result = createCombatController(store).handle({
      eventId: "skill-" + skillId,
      type: "word-complete",
      skillId,
    });
    assert.equal(result.damage, expectedDamage);
    assert.equal(store.getState().enemy.hp, 3 - expectedDamage);
  }
});

test("単語難易度が高いほど攻撃ダメージが大きくなる", () => {
  const store = startBattle({
    playerAttackPower: 2,
    enemy: { ...createEnemy("slime"), maxHp: 100 },
  });
  const result = createCombatController(store).handle({
    eventId: "difficulty-six",
    type: "word-complete",
    skillId: "ultimate-strike",
    wordDifficulty: 6,
  });
  assert.equal(result.damage, 42);
  assert.equal(store.getState().enemy.hp, 58);
  assert.match(result.message, /難易度Lv.6/);
});

test("難易度が省略された旧形式の戦闘イベントは難易度1として処理する", () => {
  const store = startBattle();
  const result = createCombatController(store).handle({
    eventId: "legacy-word-complete",
    type: "word-complete",
    skillId: "quick-strike",
  });
  assert.equal(result.damage, 1);
});

test("時間経過の敵攻撃は防御力を適用してプレイヤーにダメージを与える", () => {
  const store = startBattle({
    enemy: { ...createEnemy("slime"), attackPower: 2 },
  });
  store.dispatch({ type: GAME_ACTION.ADD_ITEM, itemId: "wooden-shield" });
  store.dispatch({ type: GAME_ACTION.EQUIP_ITEM, itemId: "wooden-shield" });
  const result = createCombatController(store).handle({
    eventId: "timed-attack-1",
    type: "timed-attack",
  });
  assert.equal(result.damage, 1);
  assert.equal(store.getState().player.hp, 2);
  assert.match(result.message, /時間攻撃/);
});
