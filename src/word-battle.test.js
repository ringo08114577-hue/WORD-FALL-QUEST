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
  isValidSavedWordBattleState,
  restoreWordBattleState,
  selectChallengeForSkill,
  spawnLaneWave,
  advanceLaneWave,
  canCollectCurrentLaneLetter,
  collectCurrentLaneLetter,
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

test("同じフレームに取得ラインを越えた文字を複数拾わない", () => {
  const base = createWordBattleState();
  const lane = base.playerLane;
  let state = addLetter(base, {
    id: 1,
    value: "Z",
    lane,
    y: 260,
    speed: 100,
  });
  state = addLetter(state, {
    id: 2,
    value: "Y",
    lane,
    y: 265,
    speed: 100,
  });

  const result = advanceFallingLetters(state, 200, {
    boardHeight: 340,
    catchLine: 274,
  });

  assert.equal(result.events.length, 1);
  assert.equal(result.events[0].type, "wrong");
  assert.equal(result.events[0].letter, "Y");
  assert.equal(result.state.mistakes, 1);
  assert.equal(result.state.letters.length, 1);
  assert.equal(result.state.letters[0].value, "Z");

  // Once a letter has passed the catch line, later frames cannot pick it up.
  const next = advanceFallingLetters(result.state, 200, {
    boardHeight: 340,
    catchLine: 274,
  });
  assert.equal(next.events.length, 0);
  assert.equal(next.state.mistakes, 1);
});

test("取得イベントには同じ文字を二重処理しないためのIDが付く", () => {
  const base = createWordBattleState();
  const state = addLetter(base, {
    id: 77,
    value: "Z",
    lane: base.playerLane,
    y: 260,
    speed: 100,
  });
  const result = advanceFallingLetters(state, 200, {
    boardHeight: 340,
    catchLine: 274,
  });
  assert.equal(result.events[0].eventId, "challenge-0-letter-77");
});


test("乱数関数がNaNや無限大を返した場合は拒否する", () => {
  const state = createWordBattleState();
  assert.throws(
    () => spawnFallingLetter(state, { random: () => Number.NaN }),
    RangeError,
  );
  assert.throws(
    () => spawnFallingLetter(state, { random: () => Number.POSITIVE_INFINITY }),
    RangeError,
  );
});


test("セーブした英単語進行を検証して正しく復元できる", () => {
  const state = createWordBattleState();
  assert.equal(isValidSavedWordBattleState(state), true);
  assert.deepEqual(restoreWordBattleState(state), state);

  const invalid = { ...state, playerLane: 99 };
  assert.equal(isValidSavedWordBattleState(invalid), false);
  assert.equal(restoreWordBattleState(invalid), null);
});


test("技を選ぶと対応する文字数の英単語に切り替わる", () => {
  const state = createWordBattleState();
  const quick = selectChallengeForSkill(state, "quick-strike", { random: () => 0 });
  assert.ok(getCurrentChallenge(quick).word.length >= 3);
  assert.ok(getCurrentChallenge(quick).word.length <= 4);
  const power = selectChallengeForSkill(state, "power-strike", { random: () => 0 });
  assert.ok(getCurrentChallenge(power).word.length >= 5);
  assert.ok(getCurrentChallenge(power).word.length <= 6);
  const ultimate = selectChallengeForSkill(state, "ultimate-strike", { random: () => 0 });
  assert.ok(getCurrentChallenge(ultimate).word.length >= 7);
  assert.ok(getCurrentChallenge(ultimate).word.length <= 8);
  assert.throws(() => selectChallengeForSkill(state, "unknown-skill"), RangeError);
});

test("スキルLv.1では対応する文字数と難易度1〜2の単語が選ばれる", () => {
  for (const skillId of ["quick-strike", "power-strike", "ultimate-strike"]) {
    const selected = selectChallengeForSkill(createWordBattleState(), skillId, {
      skillLevel: 1, random: () => 0,
    });
    const challenge = getCurrentChallenge(selected);
    assert.ok(challenge.difficulty >= 1 && challenge.difficulty <= 2);
  }
});
test("回復・防御・補助スキルは強化後も簡単な単語を選ぶ", () => {
  for (const skillId of ["healing-light", "iron-guard", "battle-cry"]) {
    const selected = selectChallengeForSkill(createWordBattleState(), skillId, {
      skillLevel: 5, random: () => 0.99,
    });
    const challenge = getCurrentChallenge(selected);
    assert.ok(challenge.word.length >= 3 && challenge.word.length <= 4);
    assert.ok(challenge.difficulty >= 1 && challenge.difficulty <= 2);
  }
});

test("出題候補が複数難易度にまたがる場合、難易度ウェイトに沿って段階を選ぶ", () => {
  const easy = selectChallengeForSkill(createWordBattleState(), "power-strike", {
    skillLevel: 1, random: () => 0,
  });
  const harder = selectChallengeForSkill(createWordBattleState(), "power-strike", {
    skillLevel: 1, random: () => 0.99,
  });
  assert.equal(getCurrentChallenge(easy).difficulty, 1);
  assert.equal(getCurrentChallenge(harder).difficulty, 2);
});

test("未登録のスキルや無効なスキルレベルを拒否する", () => {
  const state = createWordBattleState();
  assert.throws(() => selectChallengeForSkill(state, "unknown-skill"), RangeError);
  assert.throws(() => selectChallengeForSkill(state, "power-strike", { skillLevel: 6 }), RangeError);
});

test("5レーンに固定された文字が出て、必要な文字は1レーンだけに配置される", () => {
  const state = createWordBattleState();
  const wave = spawnLaneWave(state, { random: () => 0 });
  assert.equal(wave.letters.length, 5);
  assert.deepEqual(wave.letters.map((letter) => letter.lane), [0, 1, 2, 3, 4]);
  assert.equal(wave.letters.filter((letter) => letter.role === "needed").length, 1);
  assert.equal(wave.letters.filter((letter) => letter.value === "A").length, 1);
  assert.ok(wave.letters.every((letter) => letter.y === 0 && letter.speed === 0));
});

test("時間が経過しても5レーンの文字は位置も内容も変わらない", () => {
  const wave = spawnLaneWave(createWordBattleState(), { random: () => 0 });
  const afterTime = advanceLaneWave(wave, 10000, {
    boardHeight: 270, catchLine: 206, window: 42,
  });
  assert.equal(afterTime.state, wave);
  assert.equal(afterTime.expired, false);
  assert.deepEqual(afterTime.state.letters, wave.letters);
});

test("決定ボタンで選択中レーンの固定文字を1つ判定し、行全体を更新待ちにする", () => {
  let state = spawnLaneWave(createWordBattleState(), { random: () => 0 });
  state = { ...state, playerLane: 0 };
  assert.equal(canCollectCurrentLaneLetter(state), true);
  const result = collectCurrentLaneLetter(state);
  assert.equal(result.result, "correct");
  assert.equal(result.event.type, "correct");
  assert.equal(result.state.progressIndex, 1);
  assert.equal(result.state.letters.length, 0);

  const refreshed = spawnLaneWave(result.state, { random: () => 0 });
  assert.equal(refreshed.letters.length, 5);
  assert.equal(refreshed.letters.filter((letter) => letter.role === "needed")[0].value, "P");
});

test("ミスした場合も決定後に5レーンの文字行を作り直せる", () => {
  let state = spawnLaneWave(createWordBattleState(), { random: () => 0 });
  state = { ...state, playerLane: 1 };
  const wrong = collectCurrentLaneLetter(state);
  assert.equal(wrong.result, "wrong");
  assert.equal(wrong.event.type, "wrong");
  assert.equal(wrong.state.progressIndex, 0);
  assert.equal(wrong.state.mistakes, 1);
  assert.equal(wrong.state.letters.length, 0);

  const refreshed = spawnLaneWave(wrong.state, { random: () => 0 });
  assert.equal(refreshed.letters.length, 5);
  assert.equal(refreshed.letters.filter((letter) => letter.role === "needed")[0].value, "A");
  assert.ok(refreshed.letters.every((letter) => letter.id >= state.nextLetterId));
});

test("選択中レーンに文字がない場合は何も消費しない", () => {
  const state = { ...createWordBattleState(), letters: [] };
  const result = collectCurrentLaneLetter(state);
  assert.equal(result.result, "waiting");
  assert.equal(result.state, state);
  assert.equal(result.event, null);
});
