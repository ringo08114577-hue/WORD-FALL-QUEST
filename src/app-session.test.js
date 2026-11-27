import test from "node:test";
import assert from "node:assert/strict";
import { createAppSession } from "./app-session.js";
import { GAME_ACTION, GAME_PHASE } from "./game-state.js";

function memoryStorage() {
  const values = new Map();
  return {
    getItem(key) { return values.has(key) ? values.get(key) : null; },
    setItem(key, value) { values.set(key, String(value)); },
    removeItem(key) { values.delete(key); },
  };
}

test("新規冒険では職業を選ぶまで未選択で、決定後は保存して引き継ぐ", () => {
  const storage = memoryStorage();
  const first = createAppSession({ storage });
  assert.equal(first.getSelectedJobId(), null);
  assert.equal(first.getSelectedJob(), null);

  const selected = first.selectJob("swordsman");
  assert.equal(selected.selected, true);
  assert.equal(selected.changed, true);
  assert.equal(selected.saved, true);
  assert.equal(first.getSelectedJob().name, "轟剣士");

  const restored = createAppSession({ storage });
  assert.equal(restored.initialLoad.loaded, true);
  assert.equal(restored.getSelectedJobId(), "swordsman");
  assert.equal(restored.getSelectedJob().name, "轟剣士");
});

test("4つの職業を選ぶと対応する戦闘スタイルも設定される", () => {
  const cases = [
    ["swordsman", "gou-swordsman", "轟剣士"],
    ["regen-knight", "regen-knight", "再生騎士"],
    ["shadow-blade", "shadow-blade", "影刃"],
    ["elemental-mage", "elemental-mage", "元素術師"],
  ];
  for (const [jobId, characterId, name] of cases) {
    const session = createAppSession({ storage: memoryStorage() });
    const result = session.selectJob(jobId);
    assert.equal(result.selected, true);
    assert.equal(result.saved, true);
    assert.equal(session.getSelectedJob().name, name);
    assert.equal(session.getSelectedCharacterId(), characterId);
    assert.equal(session.getSelectedCharacter().name, name);
  }
});

test("職業選択は未実装の職業や冒険中の変更を受け付けない", () => {
  const session = createAppSession({ storage: memoryStorage() });
  assert.equal(session.selectJob("cleric").reason, "invalid-job");
  session.dungeon.start();
  assert.equal(session.selectJob("swordsman").reason, "not-in-town");
  assert.equal(session.getSelectedJobId(), null);
});

test("共通セッションはホームと施設ページで同じ保存データを読み書きできる", () => {
  const storage = memoryStorage();
  const first = createAppSession({ storage });
  assert.equal(first.initialLoad.reason, "save-not-found");
  first.store.dispatch({ type: GAME_ACTION.ADD_GOLD, amount: 42 });
  assert.equal(first.save().saved, true);

  const second = createAppSession({ storage });
  assert.equal(second.initialLoad.loaded, true);
  assert.equal(second.store.getState().inventory.gold, 42);
  assert.equal(second.store.getState().phase, GAME_PHASE.TITLE);
});

test("共通セッションからホームへ戻ると挑戦中の階層をリセットしHPを全回復する", () => {
  const storage = memoryStorage();
  const session = createAppSession({ storage });
  session.dungeon.start();
  session.store.dispatch({ type: GAME_ACTION.DAMAGE_PLAYER, amount: 1 });
  session.store.dispatch({ type: GAME_ACTION.PAUSE_BATTLE });

  const result = session.returnToTown();
  assert.equal(result.phase, GAME_PHASE.TITLE);
  assert.equal(session.store.getState().player.hp, session.store.getState().player.maxHp);
  assert.equal(session.store.getState().enemy, null);
  assert.equal(session.dungeon.getProgress().started, false);
  assert.equal(session.dungeon.getProgress().enemyNumber, 1);
  assert.equal(session.saves.save().saved, true);

  const restored = createAppSession({ storage });
  assert.equal(restored.initialLoad.loaded, true);
  assert.equal(restored.store.getState().phase, GAME_PHASE.TITLE);
  assert.equal(restored.dungeon.getProgress().enemyNumber, 1);
});

test("苦手単語帳はバトルの記録を施設ページ間で保存し、覚えた単語を削除できる", () => {
  const storage = memoryStorage();
  const first = createAppSession({ storage });
  const apple = { id: "apple", japanese: "りんご", word: "APPLE" };
  first.recordWeakWordMistake(apple, 100);
  first.recordWeakWordMistake(apple, 200);
  assert.equal(first.getWeakWords()[0].mistakes, 2);

  const second = createAppSession({ storage });
  assert.equal(second.initialLoad.loaded, true);
  assert.equal(second.getWeakWords()[0].wordId, "apple");
  assert.equal(second.getWeakWords()[0].mistakes, 2);

  const removed = second.markWeakWordMastered("apple");
  assert.equal(removed.removed, true);
  assert.equal(removed.saved, true);
  const third = createAppSession({ storage });
  assert.deepEqual(third.getWeakWords(), []);
});

test("苦手単語帳は古いセーブデータに苦手単語の項目がなくても読み込める", () => {
  const storage = memoryStorage();
  const first = createAppSession({ storage });
  first.save();
  const raw = JSON.parse(storage.getItem("word-fall-quest.save.v1"));
  delete raw.extra.weakWords;
  storage.setItem("word-fall-quest.save.v1", JSON.stringify(raw));

  const restored = createAppSession({ storage });
  assert.equal(restored.initialLoad.loaded, true);
  assert.deepEqual(restored.getWeakWords(), []);
});


test("選択したキャラクターは共通セーブに保存され、別ページでも引き継がれる", () => {
  const storage = memoryStorage();
  const first = createAppSession({ storage });
  assert.equal(first.getSelectedCharacterId(), "gou-swordsman");
  assert.equal(first.getSelectedCharacter().name, "轟剣士");
  const changed = first.selectCharacter("shadow-blade");
  assert.equal(changed.selected, true);
  assert.equal(changed.changed, true);
  assert.equal(changed.saved, true);
  const restored = createAppSession({ storage });
  assert.equal(restored.initialLoad.loaded, true);
  assert.equal(restored.getSelectedCharacterId(), "shadow-blade");
  assert.equal(restored.getSelectedCharacter().name, "影刃");
});

test("キャラクターは町にいるときだけ変更できる", () => {
  const session = createAppSession({ storage: memoryStorage() });
  session.dungeon.start();
  const result = session.selectCharacter("regen-knight");
  assert.equal(result.selected, false);
  assert.equal(result.reason, "not-in-town");
  assert.equal(session.getSelectedCharacterId(), "gou-swordsman");
});

test("旧セーブにキャラクターIDがなくても初期キャラクターを補完する", () => {
  const storage = memoryStorage();
  const first = createAppSession({ storage });
  first.save();
  const raw = JSON.parse(storage.getItem("word-fall-quest.save.v1"));
  delete raw.extra.characterId;
  delete raw.extra.jobId;
  raw.version = 16;
  storage.setItem("word-fall-quest.save.v1", JSON.stringify(raw));
  const restored = createAppSession({ storage });
  assert.equal(restored.initialLoad.loaded, true);
  assert.equal(restored.getSelectedCharacterId(), "gou-swordsman");
  assert.equal(restored.getSelectedJobId(), "swordsman");
});


test("キャラクターごとのスキル装備は切り替え後も別々に保存される", () => {
  const storage = memoryStorage();
  const session = createAppSession({ storage });
  assert.deepEqual(session.store.getState().equippedSkillIds, ["gou-focus", "gou-advance-cut", "gou-slash", "gou-roaring-blade", null, null]);

  const passiveEquipped = session.store.dispatch({
    type: GAME_ACTION.EQUIP_SKILL, slotIndex: 4, skillId: "gou-destruction", characterId: "gou-swordsman",
  });
  assert.equal(passiveEquipped.equippedSkillIds[4], "gou-destruction");

  const switched = session.selectCharacter("regen-knight");
  assert.equal(switched.selected, true);
  assert.deepEqual(session.store.getState().equippedSkillIds, ["regen-drain-slash", "regen-life-breaker", "regen-prayer", "regen-aegis", "regen-eternal-vessel", null]);

  session.store.dispatch({ type: GAME_ACTION.ADD_GOLD, amount: 50 });
  session.store.dispatch({ type: GAME_ACTION.UPGRADE_SKILL, skillId: "regen-drain-slash" });
  assert.equal(session.store.getState().skillLevels["regen-drain-slash"], 2);
  assert.equal(session.save().saved, true);

  const restored = createAppSession({ storage });
  assert.equal(restored.initialLoad.loaded, true);
  assert.equal(restored.getSelectedCharacterId(), "regen-knight");
  assert.deepEqual(restored.store.getState().equippedSkillIds, ["regen-drain-slash", "regen-life-breaker", "regen-prayer", "regen-aegis", "regen-eternal-vessel", null]);

  restored.selectCharacter("gou-swordsman");
  assert.deepEqual(restored.store.getState().equippedSkillIds, [
    "gou-focus", "gou-advance-cut", "gou-slash", "gou-roaring-blade", "gou-destruction", null,
  ]);
  restored.selectCharacter("regen-knight");
  assert.deepEqual(restored.store.getState().equippedSkillIds, ["regen-drain-slash", "regen-life-breaker", "regen-prayer", "regen-aegis", "regen-eternal-vessel", null]);
  assert.equal(restored.store.getState().skillLevels["regen-drain-slash"], 2);
});
