import test from "node:test";
import assert from "node:assert/strict";

import {
  WORD_CHALLENGES,
  WORD_BATTLE_PHASE,
  createWordBattleState,
  getCurrentChallenge,
  getExpectedLetter,
  getSpawnLetterPool,
  getSpellingProgress,
  spawnFallingLetter,
  movePlayer,
  setPlayerLane,
  collectLetter,
  advanceFallingLetters,
  advanceToNextChallenge,
} from "./word-battle.js";

function addLetter(state, { id = 1, value, lane = state.playerLane, y = 0, speed = 100 }) {
  return {
    ...state,
    nextLetterId: Math.max(state.nextLetterId, id + 1),
    letters: [...state.letters, { id, value, lane, y, speed }],
  };
}

test("単語データには日本語のお題と英単語が入っている", () => {
  assert.deepEqual(
    WORD_CHALLENGES.slice(0, 3).map((item) => [item.japanese, item.word]),
    [["りんご", "APPLE"], ["いぬ", "DOG"], ["ねこ", "CAT"]],
  );
});

test("開始時は最初のお題と先頭文字が設定される", () => {
  const state = createWordBattleState();
  assert.equal(getCurrentChallenge(state).word, "APPLE");
  assert.equal(getExpectedLetter(state), "A");
  assert.equal(getSpellingProgress(state), "_ _ _ _ _");
});

test("出現する文字の種類は最大4種類で、必要文字が最も出やすい", () => {
  const pool = getSpawnLetterPool(createWordBattleState());
  assert.ok(pool.length <= 4);
  assert.equal(pool[0].letter, "A");
  assert.equal(pool[0].weight, 6);
  assert.ok(pool.some((item) => item.role === "future-word"));
  assert.ok(pool.some((item) => item.role === "distractor"));
});

test("乱数を指定して落下文字を再現できる", () => {
  const state = createWordBattleState();
  const spawned = spawnFallingLetter(state, {
    random: () => 0,
    speed: 100,
  });
  assert.equal(spawned.letters.length, 1);
  assert.equal(spawned.letters[0].value, "A");
  assert.equal(spawned.letters[0].lane, 0);
  assert.equal(spawned.letters[0].y, -36);
  assert.equal(spawned.nextLetterId, 2);
});

test("左右移動はレーン端で止まり、直接レーン指定もできる", () => {
  let state = createWordBattleState({ laneCount: 5 });
  assert.equal(state.playerLane, 2);
  state = setPlayerLane(state, 0);
  assert.equal(state.playerLane, 0);
  assert.equal(movePlayer(state, -1), state);
  state = movePlayer(state, 1);
  assert.equal(state.playerLane, 1);
});

test("正しい文字を拾うとスペルが1文字進み、得点が入る", () => {
  let state = addLetter(createWordBattleState(), { value: "A" });
  const result = collectLetter(state, 1);
  assert.equal(result.result, "correct");
  assert.equal(result.state.progressIndex, 1);
  assert.equal(result.state.score, 10);
  assert.equal(getExpectedLetter(result.state), "P");
  assert.equal(getSpellingProgress(result.state), "A _ _ _ _");
});

test("間違った文字を拾ってもスペルは進まず、ミス数だけ増える", () => {
  let state = addLetter(createWordBattleState(), { value: "Z" });
  const result = collectLetter(state, 1);
  assert.equal(result.result, "wrong");
  assert.equal(result.state.progressIndex, 0);
  assert.equal(result.state.mistakes, 1);
  assert.equal(result.expected, "A");
});

test("最後の文字を拾うと単語完成になり、ボーナス得点が入る", () => {
  let state = createWordBattleState();
  for (const [index, value] of ["A", "P", "P", "L"].entries()) {
    state = addLetter(state, { id: index + 1, value });
    state = collectLetter(state, index + 1).state;
  }
  state = addLetter(state, { id: 5, value: "E" });
  const result = collectLetter(state, 5);
  assert.equal(result.result, "word-complete");
  assert.equal(result.state.phase, WORD_BATTLE_PHASE.WORD_COMPLETE);
  assert.equal(result.state.score, 70);
  assert.equal(getExpectedLetter(result.state), null);
});

test("落下文字がプレイヤーのレーンで取得ラインを越えると判定される", () => {
  const base = createWordBattleState();
  const state = addLetter(base, {
    value: "A",
    lane: base.playerLane,
    y: 260,
    speed: 100,
  });
  const result = advanceFallingLetters(state, 200, {
    boardHeight: 340,
    catchLine: 274,
  });
  assert.equal(result.events.length, 1);
  assert.equal(result.events[0].type, "correct");
  assert.equal(result.state.progressIndex, 1);
  assert.equal(result.state.letters.length, 0);
});

test("別レーンの文字は取得されず、画面外で消える", () => {
  const base = createWordBattleState();
  const otherLane = (base.playerLane + 1) % base.laneCount;
  let state = addLetter(base, {
    value: "A",
    lane: otherLane,
    y: 330,
    speed: 100,
  });
  const result = advanceFallingLetters(state, 200, {
    boardHeight: 340,
    catchLine: 274,
  });
  assert.equal(result.events.length, 0);
  assert.equal(result.state.letters.length, 0);
  assert.equal(result.state.progressIndex, 0);
});

test("単語完成後は次のお題に進み、進捗と落下文字がリセットされる", () => {
  let state = createWordBattleState();
  for (const [index, value] of ["A", "P", "P", "L", "E"].entries()) {
    state = addLetter(state, { id: index + 1, value });
    state = collectLetter(state, index + 1).state;
  }
  const next = advanceToNextChallenge(state);
  assert.equal(getCurrentChallenge(next).word, "DOG");
  assert.equal(next.phase, WORD_BATTLE_PHASE.ACTIVE);
  assert.equal(next.progressIndex, 0);
  assert.equal(next.letters.length, 0);
  assert.equal(getExpectedLetter(next), "D");
});

test("完成後や未登録の文字IDでは状態が変わらない", () => {
  const state = createWordBattleState();
  assert.equal(collectLetter(state, 999).state, state);
  const complete = { ...state, phase: WORD_BATTLE_PHASE.WORD_COMPLETE };
  assert.equal(spawnFallingLetter(complete), complete);
  assert.equal(advanceToNextChallenge(state), state);
});

test("時間とレーンの不正な値を拒否する", () => {
  const state = createWordBattleState();
  assert.throws(() => movePlayer(state, 0), RangeError);
  assert.throws(() => setPlayerLane(state, 9), RangeError);
  assert.throws(() => advanceFallingLetters(state, -1), RangeError);
  assert.throws(() => spawnFallingLetter(state, { random: () => 1 }), RangeError);
});
