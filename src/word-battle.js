/**
 * WORD FALL QUEST - Word battle engine (Step 2)
 *
 * This module is independent from the game HP/state core.
 * It owns vocabulary, spelling progress, fixed five-lane letter rows,
 * lane movement, and correct/incorrect letter-selection results.
 */

import { SKILL_DEFINITIONS } from "./skills.js";

export const WORD_CHALLENGES = Object.freeze([
  Object.freeze({ id: "apple", japanese: "りんご", word: "APPLE" }),
  Object.freeze({ id: "dog", japanese: "いぬ", word: "DOG" }),
  Object.freeze({ id: "cat", japanese: "ねこ", word: "CAT" }),
  Object.freeze({ id: "book", japanese: "ほん", word: "BOOK" }),
  Object.freeze({ id: "water", japanese: "みず", word: "WATER" }),
  Object.freeze({ id: "sun", japanese: "たいよう", word: "SUN" }),
  Object.freeze({ id: "bird", japanese: "とり", word: "BIRD" }),
  Object.freeze({ id: "fish", japanese: "さかな", word: "FISH" }),
  Object.freeze({ id: "green", japanese: "みどり", word: "GREEN" }),
  Object.freeze({ id: "tiger", japanese: "とら", word: "TIGER" }),
  Object.freeze({ id: "orange", japanese: "オレンジ", word: "ORANGE" }),
  Object.freeze({ id: "planet", japanese: "わくせい", word: "PLANET" }),
  Object.freeze({ id: "monkey", japanese: "さる", word: "MONKEY" }),
  Object.freeze({ id: "morning", japanese: "あさ", word: "MORNING" }),
  Object.freeze({ id: "library", japanese: "としょかん", word: "LIBRARY" }),
  Object.freeze({ id: "journey", japanese: "たび", word: "JOURNEY" }),
  Object.freeze({ id: "elephant", japanese: "ぞう", word: "ELEPHANT" }),
  Object.freeze({ id: "notebook", japanese: "ノート", word: "NOTEBOOK" }),
]);

export const WORD_BATTLE_PHASE = Object.freeze({
  READY: "ready",
  ACTIVE: "active",
  WORD_COMPLETE: "word-complete",
});

const ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
const DEFAULT_LANES = 5;

function isFunction(value) {
  return typeof value === "function";
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function randomUnit(random) {
  if (!isFunction(random)) {
    throw new TypeError("randomには0以上1未満の乱数関数を指定してください。");
  }
  const value = random();
  if (typeof value !== "number" || !Number.isFinite(value) || value < 0 || value >= 1) {
    throw new RangeError("randomは0以上1未満の数値を返してください。");
  }
  return value;
}


/** Validate saved spelling progress and falling letters before restoring it. */
export function isValidSavedWordBattleState(saved) {
  if (!saved || typeof saved !== "object" || Array.isArray(saved)) return false;
  if (
    !Number.isInteger(saved.challengeIndex) ||
    saved.challengeIndex < 0 || saved.challengeIndex >= WORD_CHALLENGES.length ||
    !Number.isInteger(saved.laneCount) || saved.laneCount < 3 || saved.laneCount > 9 ||
    !Number.isInteger(saved.playerLane) || saved.playerLane < 0 || saved.playerLane >= saved.laneCount ||
    !Number.isInteger(saved.progressIndex) || saved.progressIndex < 0
  ) return false;
  const challenge = WORD_CHALLENGES[saved.challengeIndex];
  if (saved.progressIndex > challenge.word.length) return false;
  if (
    (saved.phase === WORD_BATTLE_PHASE.ACTIVE && saved.progressIndex >= challenge.word.length) ||
    (saved.phase === WORD_BATTLE_PHASE.WORD_COMPLETE && saved.progressIndex !== challenge.word.length) ||
    ![WORD_BATTLE_PHASE.ACTIVE, WORD_BATTLE_PHASE.WORD_COMPLETE].includes(saved.phase)
  ) return false;
  if (
    !Number.isSafeInteger(saved.nextLetterId) || saved.nextLetterId < 1 ||
    !Number.isSafeInteger(saved.score) || saved.score < 0 ||
    !Number.isSafeInteger(saved.mistakes) || saved.mistakes < 0 ||
    !Array.isArray(saved.letters)
  ) return false;
  const ids = new Set();
  for (const letter of saved.letters) {
    if (
      !letter || !Number.isSafeInteger(letter.id) || letter.id < 1 ||
      ids.has(letter.id) ||
      typeof letter.value !== "string" || !/^[A-Z]$/.test(letter.value) ||
      !Number.isInteger(letter.lane) || letter.lane < 0 || letter.lane >= saved.laneCount ||
      typeof letter.y !== "number" || !Number.isFinite(letter.y) ||
      typeof letter.speed !== "number" || !Number.isFinite(letter.speed) || letter.speed < 0 ||
      (letter.role !== undefined && typeof letter.role !== "string")
    ) return false;
    ids.add(letter.id);
  }
  if (saved.letters.some((letter) => letter.id >= saved.nextLetterId)) return false;
  if (saved.phase === WORD_BATTLE_PHASE.WORD_COMPLETE &&
      (saved.letters.length !== 0 || saved.lastResult !== "word-complete")) return false;
  return saved.lastResult === null ||
    ["correct", "wrong", "word-complete"].includes(saved.lastResult);
}

export function restoreWordBattleState(saved) {
  if (!isValidSavedWordBattleState(saved)) return null;
  return {
    ...saved,
    letters: saved.letters.map((letter) => ({ ...letter })),
  };
}

export function createWordBattleState({ laneCount = DEFAULT_LANES } = {}) {
  if (!Number.isInteger(laneCount) || laneCount < 3 || laneCount > 9) {
    throw new RangeError("laneCountは3以上9以下の整数にしてください。");
  }

  return {
    phase: WORD_BATTLE_PHASE.ACTIVE,
    challengeIndex: 0,
    progressIndex: 0,
    laneCount,
    playerLane: Math.floor(laneCount / 2),
    letters: [],
    nextLetterId: 1,
    score: 0,
    mistakes: 0,
    lastResult: null,
  };
}

export function getCurrentChallenge(state) {
  return WORD_CHALLENGES[state.challengeIndex];
}

export function getExpectedLetter(state) {
  if (state.phase !== WORD_BATTLE_PHASE.ACTIVE) return null;
  const challenge = getCurrentChallenge(state);
  return challenge.word[state.progressIndex] ?? null;
}

export function getSpellingProgress(state) {
  const challenge = getCurrentChallenge(state);
  const completed = challenge.word.slice(0, state.progressIndex).split("");
  const remaining = Array.from(
    { length: challenge.word.length - state.progressIndex },
    () => "_",
  );
  return [...completed, ...remaining].join(" ");
}

/**
 * Each spawn draws from at most four distinct letters:
 * the exact next answer letter, a later letter in the current word,
 * a letter useful in the next question, and one neutral distractor.
 */
export function getSpawnLetterPool(state) {
  const challenge = getCurrentChallenge(state);
  const nextExpected = getExpectedLetter(state);
  if (!nextExpected) return [];

  const entries = [];
  const add = (letter, weight, role) => {
    if (!letter || entries.some((entry) => entry.letter === letter)) return;
    entries.push({ letter, weight, role });
  };

  add(nextExpected, 6, "needed");

  const laterCurrentLetter = challenge.word
    .slice(state.progressIndex + 1)
    .split("")
    .find((letter) => letter !== nextExpected);
  add(laterCurrentLetter, 2, "current-word");

  const nextChallenge =
    WORD_CHALLENGES[(state.challengeIndex + 1) % WORD_CHALLENGES.length];
  const futureLetter = nextChallenge.word
    .split("")
    .find((letter) => letter !== nextExpected);
  add(futureLetter, 2, "future-word");

  const distractor = ALPHABET.split("").find(
    (letter) => !challenge.word.includes(letter) &&
      !entries.some((entry) => entry.letter === letter),
  );
  add(distractor, 1, "distractor");

  return entries;
}

export function spawnFallingLetter(
  state,
  { random = Math.random, speed = 82 } = {},
) {
  if (state.phase !== WORD_BATTLE_PHASE.ACTIVE) return state;
  if (typeof speed !== "number" || !Number.isFinite(speed) || speed <= 0) {
    throw new RangeError("speedは正の数値にしてください。");
  }

  const pool = getSpawnLetterPool(state);
  if (pool.length === 0) return state;

  const totalWeight = pool.reduce((sum, item) => sum + item.weight, 0);
  let ticket = randomUnit(random) * totalWeight;
  let selected = pool[pool.length - 1];
  for (const entry of pool) {
    ticket -= entry.weight;
    if (ticket < 0) {
      selected = entry;
      break;
    }
  }

  const lane = Math.floor(randomUnit(random) * state.laneCount);
  const letter = {
    id: state.nextLetterId,
    value: selected.letter,
    role: selected.role,
    lane,
    y: -36,
    speed,
  };

  return {
    ...state,
    letters: [...state.letters, letter],
    nextLetterId: state.nextLetterId + 1,
  };
}

export function movePlayer(state, direction) {
  if (state.phase !== WORD_BATTLE_PHASE.ACTIVE) return state;
  if (direction !== -1 && direction !== 1) {
    throw new RangeError("directionは-1または1にしてください。");
  }

  const playerLane = clamp(
    state.playerLane + direction,
    0,
    state.laneCount - 1,
  );
  if (playerLane === state.playerLane) return state;
  return { ...state, playerLane };
}

export function setPlayerLane(state, lane) {
  if (!Number.isInteger(lane) || lane < 0 || lane >= state.laneCount) {
    throw new RangeError("laneが移動可能な範囲外です。");
  }
  if (state.phase !== WORD_BATTLE_PHASE.ACTIVE || lane === state.playerLane) {
    return state;
  }
  return { ...state, playerLane: lane };
}

/**
 * Select a spelling challenge whose length matches the chosen skill.
 * The existing score, mistakes, lane position, and event counter are retained.
 */
export function selectChallengeForSkill(
  state,
  skillId,
  { random = Math.random } = {},
) {
  const skill = Object.hasOwn(SKILL_DEFINITIONS, skillId)
    ? SKILL_DEFINITIONS[skillId]
    : null;
  if (!skill) throw new RangeError("登録されていない技です: " + skillId);

  const candidates = WORD_CHALLENGES
    .map((challenge, index) => ({ challenge, index }))
    .filter(({ challenge }) =>
      challenge.word.length >= skill.minWordLength &&
      challenge.word.length <= skill.maxWordLength,
    );
  if (candidates.length === 0) {
    throw new Error("この技に対応する英単語が登録されていません。");
  }

  const selected = candidates[Math.floor(randomUnit(random) * candidates.length)];
  return {
    ...state,
    phase: WORD_BATTLE_PHASE.ACTIVE,
    challengeIndex: selected.index,
    progressIndex: 0,
    letters: [],
    lastResult: null,
  };
}

/**
 * Creates one fixed row across all five lanes. Exactly one lane contains
 * the next required letter; the other lanes contain distinct distractors.
 * The row is regenerated only after the player confirms a letter.
 */
export function spawnLaneWave(
  state,
  { random = Math.random } = {},
) {
  if (state.phase !== WORD_BATTLE_PHASE.ACTIVE || state.letters.length > 0) {
    return state;
  }

  const expected = getExpectedLetter(state);
  if (!expected) return state;

  const correctLane = Math.floor(randomUnit(random) * state.laneCount);
  const distractors = ALPHABET.split("").filter((letter) => letter !== expected);
  const letters = [];

  for (let lane = 0; lane < state.laneCount; lane += 1) {
    let value;
    let role;
    if (lane === correctLane) {
      value = expected;
      role = "needed";
    } else {
      const index = Math.floor(randomUnit(random) * distractors.length);
      value = distractors.splice(index, 1)[0];
      role = "distractor";
    }
    letters.push({
      id: state.nextLetterId + letters.length,
      value,
      role,
      lane,
      y: 0,
      speed: 0,
    });
  }

  return {
    ...state,
    letters,
    nextLetterId: state.nextLetterId + letters.length,
  };
}

/**
 * Legacy compatibility hook. Five-lane letters are now fixed in place:
 * elapsed time never moves, removes, or replaces them.
 */
export function advanceLaneWave(state, deltaMs) {
  if (!Number.isFinite(deltaMs) || deltaMs < 0) {
    throw new RangeError("deltaMsは0以上の数値にしてください。");
  }
  return { state, expired: false };
}

/** True when the selected lane contains a letter to confirm. */
export function canCollectCurrentLaneLetter(state) {
  if (state.phase !== WORD_BATTLE_PHASE.ACTIVE) return false;
  return state.letters.some((letter) => letter.lane === state.playerLane);
}

/**
 * Explicitly collect the letter in the player's lane after the player presses
 * the decision button. The whole row disappears after one decision.
 */
export function collectCurrentLaneLetter(state) {
  if (!canCollectCurrentLaneLetter(state)) {
    return { state, result: "waiting", event: null, letter: null };
  }

  const letter = state.letters.find((item) => item.lane === state.playerLane);
  const picked = collectLetter(state, letter.id);
  const nextState = { ...picked.state, letters: [] };
  const event = picked.result === "ignored" ? null : {
    eventId: "challenge-" + state.challengeIndex + "-letter-" + letter.id,
    type: picked.result,
    letter: letter.value,
    expected: picked.expected ?? null,
  };

  return {
    ...picked,
    state: nextState,
    event,
    letter,
  };
}

export function collectLetter(state, letterId) {
  if (state.phase !== WORD_BATTLE_PHASE.ACTIVE) {
    return { state, result: "ignored", letter: null };
  }

  const letter = state.letters.find((item) => item.id === letterId);
  if (!letter) return { state, result: "ignored", letter: null };

  const letters = state.letters.filter((item) => item.id !== letterId);
  const expected = getExpectedLetter(state);

  if (letter.value !== expected) {
    return {
      state: {
        ...state,
        letters,
        mistakes: state.mistakes + 1,
        lastResult: "wrong",
      },
      result: "wrong",
      letter,
      expected,
    };
  }

  const progressIndex = state.progressIndex + 1;
  const completed = progressIndex >= getCurrentChallenge(state).word.length;
  return {
    state: {
      ...state,
      letters,
      progressIndex,
      score: state.score + 10 + (completed ? 20 : 0),
      phase: completed
        ? WORD_BATTLE_PHASE.WORD_COMPLETE
        : WORD_BATTLE_PHASE.ACTIVE,
      lastResult: completed ? "word-complete" : "correct",
    },
    result: completed ? "word-complete" : "correct",
    letter,
    expected,
  };
}

/**
 * Advances falling letters and resolves a pickup when a letter crosses
 * the catch line in the player's lane. Returns events for the UI/combat layer.
 */
export function advanceFallingLetters(
  state,
  deltaMs,
  { boardHeight = 340, catchLine = 274 } = {},
) {
  if (state.phase !== WORD_BATTLE_PHASE.ACTIVE) {
    return { state, events: [] };
  }
  if (!Number.isFinite(deltaMs) || deltaMs < 0) {
    throw new RangeError("deltaMsは0以上の数値にしてください。");
  }
  if (
    !Number.isFinite(boardHeight) ||
    !Number.isFinite(catchLine) ||
    catchLine < 0 ||
    catchLine >= boardHeight
  ) {
    throw new RangeError("boardHeightとcatchLineの指定が正しくありません。");
  }

  let nextState = state;
  const events = [];
  const updated = [];
  let collectedThisFrame = false;

  // When several letters cross in one update, check the lowest one first.
  // The player can collect only one letter per update frame.
  const lettersByCatchPriority = [...state.letters].sort(
    (a, b) => b.y - a.y,
  );

  for (const letter of lettersByCatchPriority) {
    const y = letter.y + letter.speed * (deltaMs / 1000);
    const crossedCatchLine = letter.y < catchLine && y >= catchLine;

    if (
      crossedCatchLine &&
      letter.lane === nextState.playerLane &&
      !collectedThisFrame
    ) {
      const picked = collectLetter(nextState, letter.id);
      nextState = picked.state;
      if (picked.result !== "ignored") {
        events.push({
          eventId: "challenge-" + state.challengeIndex + "-letter-" + picked.letter.id,
          type: picked.result,
          letter: picked.letter.value,
          expected: picked.expected ?? null,
        });
        collectedThisFrame = true;
      }
      continue;
    }

    if (y <= boardHeight) updated.push({ ...letter, y });
  }

  if (nextState.phase === WORD_BATTLE_PHASE.ACTIVE) {
    nextState = { ...nextState, letters: updated };
  } else {
    // A completed word pauses new spawns and clears remaining letters.
    nextState = { ...nextState, letters: [] };
  }

  return { state: nextState, events };
}

export function advanceToNextChallenge(state) {
  if (state.phase !== WORD_BATTLE_PHASE.WORD_COMPLETE) return state;

  return {
    ...state,
    phase: WORD_BATTLE_PHASE.ACTIVE,
    challengeIndex: (state.challengeIndex + 1) % WORD_CHALLENGES.length,
    progressIndex: 0,
    letters: [],
    lastResult: null,
  };
}
