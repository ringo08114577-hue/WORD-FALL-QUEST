import test from "node:test";
import assert from "node:assert/strict";

import { createGameStore, GAME_ACTION, GAME_PHASE } from "./game-state.js";
import { createCombatController, resolveCombatEvent } from "./combat.js";
import { createEnemy } from "./enemies.js";
import { ITEM_DEFINITIONS } from "./items.js";
import { SKILL_DEFINITIONS } from "./skills.js";

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

test("各キャラクターの専用技は、そのキャラクターでのみ使用できる", () => {
  const classes = [
    ["gou-swordsman", "gou-slash"],
    ["regen-knight", "regen-drain-slash"],
    ["shadow-blade", "shadow-basic"],
    ["elemental-mage", "elemental-basic"],
  ];
  for (const [characterId, skillId] of classes) {
    const store = createTestStore();
    store.dispatch({
      type: GAME_ACTION.SET_EQUIPPED_SKILLS,
      skillIds: [skillId, null, null, null, null],
      characterId,
    });
    store.dispatch({ type: GAME_ACTION.START_BATTLE, enemy: { ...testSlime, maxHp: 100 } });
    const result = resolveCombatEvent(store.getState(), {
      type: "word-complete", skillId, characterId, wordDifficulty: 1,
    });
    assert.equal(result.ignored, false, characterId);
    assert.equal(result.damage, 1, characterId);
  }

  const store = startBattle({ enemy: { ...testSlime, maxHp: 100 } });
  const wrongClass = resolveCombatEvent(store.getState(), {
    type: "word-complete", skillId: "regen-drain-slash",
    characterId: "gou-swordsman", wordDifficulty: 1,
  });
  assert.equal(wrongClass.ignored, true);
  assert.equal(wrongClass.reason, "skill-not-for-character");
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


test("戦闘コントローラーは現在のキャラクター専用技だけを実行する", () => {
  const store = startBattle();
  const gouCombat = createCombatController(store, { getCharacterId: () => "gou-swordsman" });
  const result = gouCombat.handle({
    eventId: "gou-class-skill", type: "word-complete",
    skillId: "gou-slash", wordDifficulty: 1,
  });
  assert.equal(result.ignored, false);
  assert.equal(result.damage, 1);
  assert.match(result.message, /「基本斬撃」/);

  const otherClassCombat = createCombatController(store, { getCharacterId: () => "regen-knight" });
  const rejected = otherClassCombat.handle({
    eventId: "wrong-class-skill", type: "word-complete",
    skillId: "gou-slash", wordDifficulty: 1,
  });
  assert.equal(rejected.ignored, true);
  assert.equal(rejected.reason, "skill-not-for-character");
});

test("単語難易度が1でも5でも攻撃ダメージは変わらない", () => {
  const resolveDamage = (wordDifficulty, eventId) => {
    const store = startBattle({
      playerAttackPower: 2,
      enemy: { ...testSlime, maxHp: 100 },
    });
    const result = createCombatController(store).handle({
      eventId,
      type: "word-complete",
      skillId: "gou-slash",
      wordDifficulty,
    });
    return { result, store };
  };
  const easy = resolveDamage(1, "difficulty-one");
  const hard = resolveDamage(5, "difficulty-five");
  assert.equal(easy.result.damage, 2);
  assert.equal(hard.result.damage, 2);
  assert.equal(easy.store.getState().enemy.hp, 98);
  assert.equal(hard.store.getState().enemy.hp, 98);
  assert.match(hard.result.message, /難易度Lv.5/);
});

test("難易度が省略された旧形式の戦闘イベントは難易度1として処理する", () => {
  const store = startBattle();
  const result = createCombatController(store).handle({
    eventId: "legacy-word-complete",
    type: "word-complete",
    skillId: "gou-slash",
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
    skillId: "regen-holy-drain",
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
    skillId: "gou-slash",
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
  for (let i = 0; i < 4; i += 1) store.dispatch({ type: GAME_ACTION.UPGRADE_SKILL, skillId: "gou-slash" });
  store.dispatch({ type: GAME_ACTION.EVOLVE_SKILL, skillId: "gou-slash" });
  store.dispatch({ type: GAME_ACTION.START_BATTLE, enemy: { ...testSlime, maxHp: 10 } });
  const result = createCombatController(store).handle({
    eventId: "evolved-gou-slash", type: "word-complete",
    skillId: "gou-slash", wordDifficulty: 1,
  });
  assert.equal(result.damage, 2);
  assert.match(result.message, /基本斬撃・改/);
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


function createGoukiTestBattle({ skillIds, stacks = 0, nextGainMultiplier = 1, enemy } = {}) {
  const store = createTestStore({ playerMaxHp: 100, playerAttackPower: 20 });
  const activeSkillIds = skillIds.filter((id) => SKILL_DEFINITIONS[id]?.passive !== true);
  const passiveSkillIds = skillIds.filter((id) => SKILL_DEFINITIONS[id]?.passive === true);
  store.dispatch({
    type: GAME_ACTION.SET_EQUIPPED_SKILLS,
    skillIds: [
      ...activeSkillIds, ...Array(4 - activeSkillIds.length).fill(null),
      ...passiveSkillIds.slice(0, 1), ...Array(1 - Math.min(1, passiveSkillIds.length)).fill(null),
    ],
    characterId: "gou-swordsman",
  });
  store.dispatch({
    type: GAME_ACTION.START_BATTLE,
    enemy: enemy ?? { ...testSlime, maxHp: 100000 },
  });
  const resource = { value: { stacks, nextGainMultiplier } };
  const controller = createCombatController(store, {
    getCharacterId: () => "gou-swordsman",
    getGoukiState: () => resource.value,
    setGoukiState: (next) => { resource.value = next; },
  });
  return { store, controller, resource };
}

test("不屈の闘志は残りHPが少ないほど轟気を多く獲得する", () => {
  const gainAtHp = (remainingHp) => {
    const { store, controller } = createGoukiTestBattle({ skillIds: ["gou-unyielding"] });
    if (remainingHp < 100) {
      store.dispatch({ type: GAME_ACTION.DAMAGE_PLAYER, amount: 100 - remainingHp });
    }
    const result = controller.handle({
      eventId: "gou-unyielding-hp-" + remainingHp,
      type: "word-complete",
      skillId: "gou-unyielding",
      wordDifficulty: 2,
    });
    assert.equal(result.ignored, false);
    return result.goukiGained;
  };
  assert.equal(gainAtHp(100), 2);
  assert.equal(gainAtHp(50), 6);
  assert.equal(gainAtHp(1), 9);
});

test("パッシブ技は専用枠に装備して常時効果を発揮し、直接発動はできない", () => {
  const { store, controller } = createGoukiTestBattle({
    skillIds: ["gou-slash", "gou-destruction"],
    stacks: 20,
    enemy: {
      id: "gou-passive-activation-test", name: "試験用敵", maxHp: 100000, attackPower: 5,
      isBoss: true, abilities: ["guard"],
    },
  });
  const result = controller.handle({
    eventId: "gou-passive-manual-activation",
    type: "word-complete",
    skillId: "gou-destruction",
    wordDifficulty: 1,
  });
  assert.equal(result.ignored, true);
  assert.equal(result.reason, "skill-not-equipped");
  const normalAttack = controller.handle({
    eventId: "gou-passive-auto-trigger",
    type: "word-complete",
    skillId: "gou-slash",
    wordDifficulty: 1,
  });
  assert.equal(normalAttack.ignored, false);
  assert.ok(!store.getState().enemy.abilities.includes("guard"));
});

test("闘気集中はダメージを与えず轟気を蓄積し、限界突破は次の獲得量を増やす", () => {
  const { store, controller, resource } = createGoukiTestBattle({
    skillIds: ["gou-limit-break", "gou-focus"],
  });
  const limit = controller.handle({
    eventId: "gou-limit-break-event", type: "word-complete", skillId: "gou-limit-break",
    wordDifficulty: 1,
  });
  assert.equal(limit.ignored, false);
  assert.equal(resource.value.nextGainMultiplier, 2);
  const enemyHp = store.getState().enemy.hp;
  const charge = controller.handle({
    eventId: "gou-focus-event", type: "word-complete", skillId: "gou-focus",
    wordDifficulty: 1,
  });
  assert.equal(charge.ignored, false);
  assert.equal(charge.damageTarget, null);
  assert.equal(resource.value.stacks, 20);
  assert.equal(resource.value.nextGainMultiplier, 1);
  assert.equal(store.getState().enemy.hp, enemyHp);
});

test("轟進斬は攻撃しながら蓄積し、轟刃は必要な轟気だけを消費する", () => {
  const { controller, resource } = createGoukiTestBattle({
    skillIds: ["gou-advance-cut", "gou-roaring-blade"],
    stacks: 10,
  });
  const advance = controller.handle({
    eventId: "gou-advance-event", type: "word-complete", skillId: "gou-advance-cut",
    wordDifficulty: 1,
  });
  assert.equal(advance.ignored, false);
  assert.ok(advance.damage > 0);
  assert.equal(resource.value.stacks, 14);

  const roaring = controller.handle({
    eventId: "gou-roaring-event", type: "word-complete", skillId: "gou-roaring-blade",
    wordDifficulty: 1,
  });
  assert.equal(roaring.ignored, false);
  assert.equal(roaring.goukiSpent, 3);
  assert.equal(resource.value.stacks, 11);
  assert.ok(roaring.damage > advance.damage);
});

test("剛撃は攻撃しながら轟気を少し多めに蓄える", () => {
  const { controller, resource } = createGoukiTestBattle({
    skillIds: ["gou-heavy-charge"],
    stacks: 10,
  });
  const result = controller.handle({
    eventId: "gou-heavy-charge-event",
    type: "word-complete",
    skillId: "gou-heavy-charge",
    wordDifficulty: 2,
  });
  assert.equal(result.ignored, false);
  assert.ok(result.damage > 0);
  assert.equal(resource.value.stacks, 12);
});

test("轟気不足では消費スキルを発動できず、轟気も敵HPも変わらない", () => {
  const { store, controller, resource } = createGoukiTestBattle({
    skillIds: ["gou-overlord"],
    stacks: 49,
  });
  const beforeHp = store.getState().enemy.hp;
  const result = controller.handle({
    eventId: "gou-overlord-short", type: "word-complete", skillId: "gou-overlord",
    wordDifficulty: 3,
  });
  assert.equal(result.ignored, true);
  assert.equal(result.reason, "insufficient-gouki");
  assert.equal(resource.value.stacks, 49);
  assert.equal(store.getState().enemy.hp, beforeHp);
});

test("天轟一閃は轟気を全消費し、ボスの防御ギミックを破壊する", () => {
  const boss = {
    id: "gou-test-boss", name: "試験用ボス", maxHp: 100000, attackPower: 5,
    isBoss: true, abilities: ["guard"],
  };
  const { store, controller, resource } = createGoukiTestBattle({
    skillIds: ["gou-heaven-one-flash"],
    stacks: 99,
    enemy: boss,
  });
  const result = controller.handle({
    eventId: "gou-heaven-event", type: "word-complete",
    skillId: "gou-heaven-one-flash", wordDifficulty: 5,
  });
  assert.equal(result.ignored, false);
  assert.equal(result.goukiSpent, 99);
  assert.equal(resource.value.stacks, 0);
  assert.ok(result.damage > 1000);
  assert.ok(!store.getState().enemy.abilities.includes("guard"));
  assert.match(result.message, /防御ギミックを破壊/);
});

test("轟気変換は轟気を防御力へ変換する", () => {
  const { store, controller, resource } = createGoukiTestBattle({
    skillIds: ["gou-ki-convert"],
    stacks: 5,
  });
  const result = controller.handle({
    eventId: "gou-convert-event", type: "word-complete",
    skillId: "gou-ki-convert", wordDifficulty: 1,
  });
  assert.equal(result.ignored, false);
  assert.equal(result.goukiSpent, 5);
  assert.equal(resource.value.stacks, 0);
  assert.equal(store.getState().battleEffects.defenseBonus, 35);
  assert.equal(store.getState().battleEffects.defenseHitsRemaining, 2);
});

test("破壊の極意は轟気20個以上でボスの防御を自動で破壊する", () => {
  const boss = {
    id: "gou-passive-boss", name: "試験用守護ボス", maxHp: 100000, attackPower: 5,
    isBoss: true, abilities: ["guard"],
  };
  const { store, controller } = createGoukiTestBattle({
    skillIds: ["gou-slash", "gou-destruction"],
    stacks: 20,
    enemy: boss,
  });
  const result = controller.handle({
    eventId: "gou-passive-break-event", type: "word-complete",
    skillId: "gou-slash", wordDifficulty: 1,
  });
  assert.equal(result.ignored, false);
  assert.ok(!store.getState().enemy.abilities.includes("guard"));
  assert.match(result.message, /防御ギミックを破壊/);
});


function createRegenTestBattle({
  skillIds = [
    "regen-drain-slash", "regen-life-breaker", "regen-prayer", "regen-aegis",
    "regen-eternal-vessel",
  ],
  overHp = 0,
  playerMaxHp = 100,
  playerAttackPower = 20,
  enemy = { ...testSlime, maxHp: 100000, attackPower: 20 },
} = {}) {
  const store = createTestStore({ playerMaxHp, playerAttackPower });
  const activeSkills = skillIds.filter((id) => SKILL_DEFINITIONS[id]?.passive !== true);
  const passiveSkills = skillIds.filter((id) => SKILL_DEFINITIONS[id]?.passive === true);
  store.dispatch({
    type: GAME_ACTION.SET_EQUIPPED_SKILLS,
    skillIds: [
      ...activeSkills, ...Array(4 - activeSkills.length).fill(null),
      ...passiveSkills.slice(0, 1), ...Array(1 - Math.min(1, passiveSkills.length)).fill(null),
    ],
    characterId: "regen-knight",
  });
  store.dispatch({ type: GAME_ACTION.START_BATTLE, enemy });
  const resource = { value: { overHp } };
  const controller = createCombatController(store, {
    getCharacterId: () => "regen-knight",
    getRegenState: () => resource.value,
    setRegenState: (next) => { resource.value = next; },
  });
  return { store, controller, resource };
}

test("吸命斬はダメージの一部を回復し、HP上限を超えた分をオーバーHPにする", () => {
  const { store, controller, resource } = createRegenTestBattle();
  store.dispatch({ type: GAME_ACTION.DAMAGE_PLAYER, amount: 8 });
  const result = controller.handle({
    eventId: "regen-drain-slash",
    type: "word-complete",
    skillId: "regen-drain-slash",
    wordDifficulty: 1,
  });

  assert.equal(result.ignored, false);
  assert.equal(result.damage, 18);
  assert.equal(result.regenDrained, 15);
  assert.equal(result.regenHpHealed, 8);
  assert.equal(result.regenOverHpGained, 7);
  assert.equal(store.getState().player.hp, 100);
  assert.equal(resource.value.overHp, 7);
});

test("オーバーHPを蓄えていると生命断ちの威力が上がる", () => {
  const { controller, resource } = createRegenTestBattle({ overHp: 100 });
  const result = controller.handle({
    eventId: "regen-overhp-strike",
    type: "word-complete",
    skillId: "regen-life-breaker",
    wordDifficulty: 2,
  });

  assert.equal(result.ignored, false);
  assert.equal(result.damage, 29);
  assert.match(result.message, /オーバーHPで威力/);
  assert.equal(resource.value.overHp, 100);
});

test("オーバーHPが最大HPの2倍まで貯まると生命断ちの威力もさらに上がる", () => {
  const { controller } = createRegenTestBattle({ overHp: 200 });
  const result = controller.handle({
    eventId: "regen-overhp-double-strike",
    type: "word-complete",
    skillId: "regen-life-breaker",
    wordDifficulty: 2,
  });
  assert.equal(result.ignored, false);
  assert.ok(result.damage > 29);
  assert.match(result.message, /オーバーHPで威力/);
});

test("再生の祈りは序盤のLv.1から最大HPの30%を回復する", () => {
  const { store, controller } = createRegenTestBattle();
  store.dispatch({ type: GAME_ACTION.DAMAGE_PLAYER, amount: 70 });
  assert.equal(store.getState().player.hp, 30);
  const result = controller.handle({
    eventId: "regen-prayer-early-heal",
    type: "word-complete",
    skillId: "regen-prayer",
    wordDifficulty: 2,
  });
  assert.equal(result.ignored, false);
  assert.equal(store.getState().player.hp, 60);
  assert.match(result.message, /HPを 30 回復/);
});

test("敵の反撃はオーバーHPを先に削り、残りだけ通常HPへ与える", () => {
  const { store, controller, resource } = createRegenTestBattle({ overHp: 15 });
  const result = controller.handle({
    eventId: "regen-overhp-partial-guard",
    type: "wrong",
    letter: "Z",
  });

  assert.equal(result.damage, 20);
  assert.equal(store.getState().player.hp, 95);
  assert.equal(resource.value.overHp, 0);
  assert.match(result.message, /オーバーHPで 15 ダメージを吸収/);
});

test("十分なオーバーHPがあれば敵の攻撃をすべて吸収し、通常HPは減らない", () => {
  const { store, controller, resource } = createRegenTestBattle({ overHp: 20 });
  const result = controller.handle({
    eventId: "regen-overhp-full-guard",
    type: "timed-attack",
  });

  assert.equal(result.damage, 20);
  assert.equal(store.getState().player.hp, 100);
  assert.equal(resource.value.overHp, 0);
  assert.match(result.message, /HPへのダメージは0/);
});

test("敵を倒すとオーバーHPは即座に0へ戻り、次の敵に持ち越されない", () => {
  const { controller, resource } = createRegenTestBattle({
    overHp: 40,
    playerAttackPower: 1000,
    enemy: { ...testSlime, maxHp: 5, attackPower: 1 },
  });
  const result = controller.handle({
    eventId: "regen-overhp-victory-reset",
    type: "word-complete",
    skillId: "regen-life-breaker",
    wordDifficulty: 1,
  });

  assert.equal(result.state.phase, GAME_PHASE.VICTORY);
  assert.equal(resource.value.overHp, 0);
});

test("生命蓄積はオーバーHPを直接増やすが、専用上限を超えない", () => {
  const { controller, resource } = createRegenTestBattle({
    skillIds: ["regen-overflow", "regen-eternal-vessel"],
    overHp: 110,
  });
  const result = controller.handle({
    eventId: "regen-overflow-gain",
    type: "word-complete",
    skillId: "regen-overflow",
    wordDifficulty: 2,
  });

  assert.equal(result.ignored, false);
  assert.equal(result.regenOverHpGained, 25);
  assert.equal(resource.value.overHp, 135);
});
