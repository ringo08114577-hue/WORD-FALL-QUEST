import test from "node:test";
import assert from "node:assert/strict";

import { createGameStore, GAME_ACTION, GAME_PHASE } from "./game-state.js";
import { createCombatController, resolveCombatEvent } from "./combat.js";
import { createEnemy } from "./enemies.js";
import { ITEM_DEFINITIONS } from "./items.js";

function createTestStore(options = {}) {
  return createGameStore({ playerMaxHp: 3, playerAttackPower: 1, ...options });
}

const testSlime = { ...createEnemy("slime"), maxHp: 3, attackPower: 1, experienceReward: 10 };
const testEnemyStats = {
  bat: { maxHp: 3, attackPower: 1, experienceReward: 12 },
  goblin: { maxHp: 4, attackPower: 1, experienceReward: 15 },
  orc: { maxHp: 5, attackPower: 2, experienceReward: 20 },
};
function createTestEnemy(id) {
  const enemy = createEnemy(id);
  return { ...enemy, ...(testEnemyStats[id] ?? {}) };
}

function startBattle({ playerMaxHp = 3, playerAttackPower = 1, enemy } = {}) {
  const store = createTestStore({ playerMaxHp, playerAttackPower });
  store.dispatch({
    type: GAME_ACTION.START_BATTLE,
    enemy: enemy ?? testSlime,
  });
  return store;
}

test("敵データはIDから作成され、呼び出し元で安全に変更できる", () => {
  const slime = createEnemy("slime");
  assert.deepEqual(slime, {
    id: "slime",
    name: "グリーンスライム",
    maxHp: 165,
    attackPower: 18,
    experienceReward: 30,
    abilities: [],
    isBoss: false,
  });
  slime.maxHp = 99;
  assert.equal(createEnemy("slime").maxHp, 165);
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
    enemy: { ...testSlime, attackPower: 2 },
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

test("魔法は攻撃力ではなく魔力を参照して弱点1.3倍を適用する", () => {
  const store = createTestStore({ playerAttackPower: 2, playerMagicPower: 30 });
  store.dispatch({ type: GAME_ACTION.EQUIP_SKILL, slotIndex: 0, skillId: "fireball" });
  store.dispatch({
    type: GAME_ACTION.START_BATTLE,
    enemy: { ...testSlime, maxHp: 100, elementalWeakness: "fire" },
  });
  const result = createCombatController(store).handle({
    eventId: "fireball-magic-power-test", type: "word-complete",
    skillId: "fireball", wordDifficulty: 1,
  });
  assert.equal(result.damage, 39);
  assert.equal(store.getState().enemy.hp, 61);
  assert.match(result.message, /炎属性/);
  assert.match(result.message, /弱点/);
});

test("魔法にも属性耐性0.8倍を適用する", () => {
  const store = createTestStore({ playerAttackPower: 99, playerMagicPower: 30 });
  store.dispatch({ type: GAME_ACTION.EQUIP_SKILL, slotIndex: 0, skillId: "water-shot" });
  store.dispatch({
    type: GAME_ACTION.START_BATTLE,
    enemy: { ...testSlime, maxHp: 100, elementalResistance: "water" },
  });
  const result = createCombatController(store).handle({
    eventId: "water-shot-magic-resistance-test", type: "word-complete",
    skillId: "water-shot", wordDifficulty: 1,
  });
  assert.equal(result.damage, 24);
  assert.equal(store.getState().enemy.hp, 76);
  assert.match(result.message, /耐性/);
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
    enemy: { ...testSlime, maxHp: 3, experienceReward: 100 },
  });
  const combat = createCombatController(store);
  const result = combat.handle({
    eventId: "challenge-0-letter-20",
    type: "word-complete",
  });

  assert.equal(store.getState().phase, GAME_PHASE.VICTORY);
  assert.equal(store.getState().enemy.hp, 0);
  assert.equal(result.experienceGained, 100);
  assert.equal(result.levelUps, 1);
  assert.equal(store.getState().player.level, 2);
  assert.equal(store.getState().player.attackPower, 13);
  assert.match(result.message, /EXP \+100/);
  assert.match(result.message, /レベルアップ/);

  const ignored = combat.handle({
    eventId: "challenge-0-letter-21",
    type: "wrong",
    letter: "Z",
  });
  assert.equal(ignored.ignored, true);
  assert.equal(store.getState().player.hp, 83);
});

test("プレイヤーHPが0になると敗北になり、同じイベントで二重に減らない", () => {
  const store = startBattle({
    playerMaxHp: 1,
    enemy: { ...testSlime, attackPower: 1 },
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
    enemy: testSlime,
  });
  const again = combat.handle(event);

  assert.equal(again.ignored, false);
  assert.equal(store.getState().player.hp, 2);
});


test("盾は敵の反撃ダメージを1減らすが、最低1ダメージは受ける", () => {
  const store = startBattle({
    enemy: { ...testSlime, attackPower: 2 },
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
  assert.equal(store.getState().player.defensePower, 10);
});


test("防御力が敵の攻撃力以上でも最低1ダメージは受ける", () => {
  const store = startBattle({
    enemy: { ...testSlime, attackPower: 1 },
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


test("コウモリの素早い反撃は間違った文字へのダメージを10増やす", () => {
  const store = startBattle({ playerMaxHp: 100, enemy: { ...createTestEnemy("bat"), maxHp: 3, attackPower: 1 } });
  const result = createCombatController(store).handle({
    eventId: "bat-swift-counter", type: "wrong", letter: "Z",
  });
  assert.equal(result.damage, 11);
  assert.match(result.message, /すばやい反撃/);
  assert.equal(store.getState().player.hp, 89);
});

test("ゴブリンのかたい体は単語攻撃のダメージを10減らす", () => {
  const store = startBattle({ playerAttackPower: 2, enemy: createTestEnemy("goblin") });
  const result = createCombatController(store).handle({
    eventId: "goblin-guard", type: "word-complete",
  });
  assert.equal(result.damage, 1);
  assert.equal(store.getState().enemy.hp, 3);
  assert.match(result.message, /かたい体/);
});

test("オークの防御突破はプレイヤーの防御力を10無視する", () => {
  const store = startBattle({ enemy: createTestEnemy("orc") });
  store.dispatch({ type: GAME_ACTION.ADD_ITEM, itemId: "wooden-shield" });
  store.dispatch({ type: GAME_ACTION.EQUIP_SHIELD, itemId: "wooden-shield" });
  assert.equal(store.getState().player.defensePower, 10);
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
test("いやしの光は簡単な単語の完成でHPを回復し、敵にはダメージを与えない", () => {
  const store = createTestStore();
  store.dispatch({ type: GAME_ACTION.EQUIP_SKILL, slotIndex: 1, skillId: "healing-light" });
  store.dispatch({ type: GAME_ACTION.START_BATTLE, enemy: testSlime });
  store.dispatch({ type: GAME_ACTION.DAMAGE_PLAYER, amount: 2 });
  const result = createCombatController(store).handle({
    eventId: "healing-light-word", type: "word-complete",
    skillId: "healing-light", wordDifficulty: 2,
  });
  assert.equal(result.ignored, false);
  assert.equal(result.damageTarget, null);
  assert.equal(store.getState().player.hp, 3);
  assert.equal(store.getState().enemy.hp, 3);
  assert.match(result.message, /回復/);
});


test("いやしの光はプレイヤー最大HPに応じて回復量が増える", () => {
  const store = createTestStore({ playerMaxHp: 300 });
  store.dispatch({ type: GAME_ACTION.EQUIP_SKILL, slotIndex: 1, skillId: "healing-light" });
  store.dispatch({ type: GAME_ACTION.START_BATTLE, enemy: testSlime });
  store.dispatch({ type: GAME_ACTION.DAMAGE_PLAYER, amount: 150 });
  const result = createCombatController(store).handle({
    eventId: "healing-light-scaled-word",
    type: "word-complete",
    skillId: "healing-light",
    wordDifficulty: 2,
  });
  assert.equal(result.ignored, false);
  assert.equal(result.action.amount, 90);
  assert.equal(store.getState().player.hp, 240);
  assert.equal(store.getState().enemy.hp, testSlime.maxHp);
});

test("鉄壁の構えは次の2回の敵攻撃を軽減する", () => {
  const store = createTestStore({ playerMaxHp: 100 });
  store.dispatch({ type: GAME_ACTION.EQUIP_SKILL, slotIndex: 1, skillId: "iron-guard" });
  store.dispatch({
    type: GAME_ACTION.START_BATTLE,
    enemy: { ...testSlime, attackPower: 30 },
  });
  const combat = createCombatController(store);
  const guard = combat.handle({
    eventId: "iron-guard-word", type: "word-complete",
    skillId: "iron-guard", wordDifficulty: 1,
  });
  assert.equal(guard.ignored, false);
  assert.equal(store.getState().battleEffects.defenseBonus, 20);
  assert.equal(store.getState().battleEffects.defenseHitsRemaining, 2);

  const firstHit = combat.handle({ eventId: "iron-guard-hit-1", type: "timed-attack" });
  assert.equal(firstHit.damage, 10);
  assert.equal(store.getState().battleEffects.defenseHitsRemaining, 1);

  const secondHit = combat.handle({ eventId: "iron-guard-hit-2", type: "timed-attack" });
  assert.equal(secondHit.damage, 10);
  assert.equal(store.getState().battleEffects.defenseHitsRemaining, 0);
  assert.equal(store.getState().battleEffects.defenseBonus, 0);
});

test("鉄壁の構えは弱い敵の攻撃を0ダメージにして、使用回数を消費する", () => {
  const store = createTestStore();
  store.dispatch({ type: GAME_ACTION.EQUIP_SKILL, slotIndex: 1, skillId: "iron-guard" });
  store.dispatch({ type: GAME_ACTION.START_BATTLE, enemy: testSlime });
  const combat = createCombatController(store);
  combat.handle({
    eventId: "iron-guard-block-word", type: "word-complete",
    skillId: "iron-guard", wordDifficulty: 1,
  });

  const blocked = combat.handle({
    eventId: "iron-guard-block-hit", type: "timed-attack",
  });
  assert.equal(blocked.damage, 0);
  assert.match(blocked.message, /完全に防いだ/);
  assert.equal(store.getState().player.hp, 3);
  assert.equal(store.getState().battleEffects.defenseHitsRemaining, 1);
});

test("力の咆哮は次の2回の攻撃を強化し、回数を使い切ると解除される", () => {
  const store = createTestStore();
  store.dispatch({ type: GAME_ACTION.EQUIP_SKILL, slotIndex: 1, skillId: "battle-cry" });
  store.dispatch({
    type: GAME_ACTION.START_BATTLE,
    enemy: { ...testSlime, maxHp: 20 },
  });
  const combat = createCombatController(store);
  const buff = combat.handle({
    eventId: "battle-cry-word", type: "word-complete",
    skillId: "battle-cry", wordDifficulty: 1,
  });
  assert.equal(buff.ignored, false);
  assert.equal(store.getState().battleEffects.attackMultiplier, 1.2);
  assert.equal(store.getState().battleEffects.attackUsesRemaining, 2);

  const firstAttack = combat.handle({
    eventId: "battle-cry-hit-1", type: "word-complete",
    skillId: "quick-strike", wordDifficulty: 1,
  });
  assert.equal(firstAttack.damage, 2);
  assert.equal(store.getState().battleEffects.attackUsesRemaining, 1);

  const secondAttack = combat.handle({
    eventId: "battle-cry-hit-2", type: "word-complete",
    skillId: "quick-strike", wordDifficulty: 1,
  });
  assert.equal(secondAttack.damage, 2);
  assert.equal(store.getState().battleEffects.attackUsesRemaining, 0);
  assert.equal(store.getState().battleEffects.attackMultiplier, 1);
});


test("単語難易度が高いほど攻撃ダメージが大きくなる", () => {
  const store = startBattle({
    playerAttackPower: 2,
    enemy: { ...testSlime, maxHp: 100 },
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
    enemy: { ...testSlime, attackPower: 2 },
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


test("未装備のスキルや登録外スキルでは攻撃できない", () => {
  const store = createTestStore();
  store.dispatch({ type: GAME_ACTION.EQUIP_SKILL, slotIndex: 1, skillId: null });
  store.dispatch({
    type: GAME_ACTION.START_BATTLE,
    enemy: testSlime,
  });
  const combat = createCombatController(store);

  const unequipped = combat.handle({
    eventId: "unequipped-skill",
    type: "word-complete",
    skillId: "power-strike",
  });
  assert.equal(unequipped.ignored, true);
  assert.equal(unequipped.reason, "skill-not-equipped");
  assert.equal(store.getState().enemy.hp, 3);

  const unknown = combat.handle({
    eventId: "unknown-skill",
    type: "word-complete",
    skillId: "not-a-skill",
  });
  assert.equal(unknown.ignored, true);
  assert.equal(unknown.reason, "skill-not-equipped");
  assert.equal(store.getState().enemy.hp, 3);
});

test("範囲外の単語難易度では攻撃ダメージを発生させない", () => {
  const store = startBattle();
  const result = createCombatController(store).handle({
    eventId: "invalid-difficulty",
    type: "word-complete",
    skillId: "quick-strike",
    wordDifficulty: 7,
  });
  assert.equal(result.ignored, true);
  assert.equal(result.reason, "invalid-word-difficulty");
  assert.equal(store.getState().enemy.hp, 3);
});


test("進化した攻撃スキルは実際のバトルダメージが上昇する", () => {
  const store = createTestStore();
  store.dispatch({ type: GAME_ACTION.ADD_GOLD, amount: 950 });
  store.dispatch({ type: GAME_ACTION.ADD_ITEM, itemId: "forest-dragon-seal", quantity: 1 });
  for (let i = 0; i < 4; i += 1) store.dispatch({ type: GAME_ACTION.UPGRADE_SKILL, skillId: "quick-strike" });
  store.dispatch({ type: GAME_ACTION.EVOLVE_SKILL, skillId: "quick-strike" });
  store.dispatch({ type: GAME_ACTION.START_BATTLE, enemy: { ...testSlime, maxHp: 10 } });
  const result = createCombatController(store).handle({
    eventId: "evolved-quick-strike", type: "word-complete",
    skillId: "quick-strike", wordDifficulty: 1,
  });
  assert.equal(result.damage, 2);
  assert.match(result.message, /疾風の斬撃/);
});


test("敵を倒すと素材が一度だけ所持品に追加され、戦闘メッセージにも表示される", () => {
  const enemy = { ...createEnemy("slime"), maxHp: 3, experienceReward: 10 };
  const store = startBattle({ playerAttackPower: 3, enemy });
  const combat = createCombatController(store, { random: () => 0 });
  const result = combat.handle({
    eventId: "slime-drop-once",
    type: "word-complete",
  });

  assert.deepEqual(result.drops, [
    { itemId: "slime-gel", quantity: 1 },
    { itemId: "green-slime-moss-mucus", quantity: 1 },
    { itemId: "slime-core", quantity: 1 },
  ]);
  assert.equal(store.getState().inventory.items["slime-gel"], 1);
  assert.equal(store.getState().inventory.items["green-slime-moss-mucus"], 1);
  assert.equal(store.getState().inventory.items["slime-core"], 1);
  assert.match(result.message, /グリーンスライムのゼリー ×1/);
  assert.ok(store.getState().actionLog.some((entry) =>
    entry.message.includes("グリーンスライムのドロップ") &&
    entry.message.includes(ITEM_DEFINITIONS["slime-gel"].name)));

  const nextEvent = combat.handle({
    eventId: "slime-drop-after-victory",
    type: "word-complete",
  });
  assert.equal(nextEvent.ignored, true);
  assert.equal(store.getState().inventory.items["slime-gel"], 1);
});

test("ドロップ抽選に外れた敵は素材を追加しない", () => {
  const enemy = { ...createEnemy("slime"), maxHp: 3, experienceReward: 10 };
  const store = startBattle({ playerAttackPower: 3, enemy });
  const result = createCombatController(store, { random: () => 0.99 }).handle({
    eventId: "slime-drop-miss",
    type: "word-complete",
  });

  assert.deepEqual(result.drops, []);
  assert.equal(store.getState().inventory.items["slime-gel"], 0);
  assert.doesNotMatch(result.message, /素材ドロップ/);
});
