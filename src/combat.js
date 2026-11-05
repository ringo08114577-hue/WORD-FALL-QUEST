/**
 * WORD FALL QUEST - Combat event resolver (Step 3)
 *
 * Word collection emits events. This module is the only place that converts
 * those events into HP actions, keeping game-state and word logic separate.
 */
import { GAME_ACTION, GAME_PHASE } from "./game-state.js";

export const COMBAT_EVENT = Object.freeze({
  CORRECT: "correct",
  WRONG: "wrong",
  WORD_COMPLETE: "word-complete",
});

const VALID_EVENTS = new Set(Object.values(COMBAT_EVENT));

function positivePower(value, fallback = 1) {
  return Number.isInteger(value) && value > 0 ? value : fallback;
}

export function resolveCombatEvent(gameState, event) {
  if (!gameState || gameState.phase !== GAME_PHASE.BATTLE) {
    return { ignored: true, reason: "battle-not-active" };
  }
  if (!event || !VALID_EVENTS.has(event.type)) {
    return { ignored: true, reason: "unknown-event" };
  }
  if (!gameState.enemy) {
    return { ignored: true, reason: "enemy-missing" };
  }

  if (event.type === COMBAT_EVENT.CORRECT) {
    return {
      ignored: false,
      action: null,
      damageTarget: null,
      message: (event.letter || "文字") + " は正解！次の文字を探そう。",
      tone: "good",
    };
  }

  if (event.type === COMBAT_EVENT.WRONG) {
    const amount = positivePower(gameState.enemy.attackPower);
    return {
      ignored: false,
      action: { type: GAME_ACTION.DAMAGE_PLAYER, amount },
      damageTarget: "player",
      damage: amount,
      message:
        gameState.enemy.name +
        "の反撃！「" +
        (event.letter || "?") +
        "」は違う文字。HP -" +
        amount,
      tone: "bad",
    };
  }

  const amount = positivePower(gameState.player.attackPower);
  return {
    ignored: false,
    action: { type: GAME_ACTION.DAMAGE_ENEMY, amount },
    damageTarget: "enemy",
    damage: amount,
    message:
      "単語完成！" +
      gameState.enemy.name +
      "に" +
      amount +
      "ダメージ！",
    tone: "good",
  };
}

/**
 * Stateful adapter that applies each word event at most once.
 * Events must carry a stable eventId supplied by the word-battle engine.
 */
export function createCombatController(store) {
  if (
    !store ||
    typeof store.getState !== "function" ||
    typeof store.dispatch !== "function"
  ) {
    throw new TypeError("combat controllerにはgame storeが必要です。");
  }

  const processedEventIds = new Set();

  return {
    handle(event) {
      if (!event || typeof event.eventId !== "string" || event.eventId === "") {
        return { ignored: true, reason: "event-id-missing" };
      }
      if (processedEventIds.has(event.eventId)) {
        return { ignored: true, duplicate: true, reason: "event-already-processed" };
      }

      const resolution = resolveCombatEvent(store.getState(), event);
      if (resolution.ignored) return resolution;

      processedEventIds.add(event.eventId);
      if (resolution.action) {
        store.dispatch(resolution.action);
      }

      const state = store.getState();
      let message = resolution.message;
      let tone = resolution.tone;
      if (state.phase === GAME_PHASE.VICTORY) {
        message = state.enemy.name + "を倒した！";
        tone = "good";
      } else if (state.phase === GAME_PHASE.DEFEAT) {
        message = "HPがなくなった！冒険失敗……";
        tone = "bad";
      }

      return {
        ...resolution,
        message,
        tone,
        state,
      };
    },

    reset() {
      processedEventIds.clear();
    },
  };
}
