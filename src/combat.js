/**
 * WORD FALL QUEST - Combat event resolver (Step 4)
 *
 * Word collection emits events. This module is the only place that converts
 * those events into HP actions, keeping game-state and word logic separate.
 */
import { GAME_ACTION, GAME_PHASE } from "./game-state.js";
import { ENEMY_ABILITY_DEFINITIONS, getEnemyAbilityEffects } from "./enemies.js";
import { SKILL_DEFINITIONS } from "./skills.js";
import { WORD_DIFFICULTY_DEFINITIONS } from "./word-difficulty.js";

export const COMBAT_EVENT = Object.freeze({
  CORRECT: "correct",
  WRONG: "wrong",
  WORD_COMPLETE: "word-complete",
  TIMED_ATTACK: "timed-attack",
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

  if (event.type === COMBAT_EVENT.WRONG || event.type === COMBAT_EVENT.TIMED_ATTACK) {
    const enemyPower = positivePower(gameState.enemy.attackPower);
    const defensePower = Number.isSafeInteger(gameState.player?.defensePower) && gameState.player.defensePower >= 0
      ? gameState.player.defensePower : 0;
    const effects = getEnemyAbilityEffects(gameState.enemy);
    const effectiveDefense = Math.max(0, defensePower - effects.defensePiercing);
    const amount = Math.max(1, enemyPower + effects.counterAttackBonus - effectiveDefense);
    const counterAbility = (gameState.enemy.abilities ?? []).map((id)=>ENEMY_ABILITY_DEFINITIONS[id]).find((ability)=>ability?.counterAttackBonus>0);
    const abilityNote = counterAbility ? "（"+counterAbility.name+"）" : "";
    const piercingNote = effects.defensePiercing>0 ? " 防御力を一部無視！" : "";
    return {
      ignored:false, action:{type:GAME_ACTION.DAMAGE_PLAYER,amount}, damageTarget:"player", damage:amount,
      message: event.type === COMBAT_EVENT.TIMED_ATTACK
        ? gameState.enemy.name + "の時間攻撃！ HP -" + amount + "。" + abilityNote + piercingNote
        : gameState.enemy.name + "の反撃" + abilityNote + "！「" + (event.letter || "?") + "」は違う文字。HP -" + amount + "。" + piercingNote,
      tone:"bad",
    };
  }
  const skillId = event.skillId === undefined ? "quick-strike" : event.skillId;
  const skill = typeof skillId === "string" &&
    Object.hasOwn(SKILL_DEFINITIONS, skillId)
    ? SKILL_DEFINITIONS[skillId]
    : null;
  if (!skill || !Array.isArray(gameState.equippedSkillIds) ||
      !gameState.equippedSkillIds.includes(skillId)) {
    return { ignored: true, reason: "skill-not-equipped" };
  }

  const wordDifficulty = event.wordDifficulty === undefined ? 1 : event.wordDifficulty;
  if (!Number.isInteger(wordDifficulty) ||
      !Object.hasOwn(WORD_DIFFICULTY_DEFINITIONS, wordDifficulty)) {
    return { ignored: true, reason: "invalid-word-difficulty" };
  }
  const effects = getEnemyAbilityEffects(gameState.enemy);
  const difficultyMultiplier = WORD_DIFFICULTY_DEFINITIONS[wordDifficulty].damageMultiplier;
  const baseDamage = Math.ceil(
    positivePower(gameState.player.attackPower) *
    (skill?.damageMultiplier ?? 1) *
    difficultyMultiplier,
  );
  const amount = Math.max(1, baseDamage - effects.damageReduction);
  const guardAbility = (gameState.enemy.abilities ?? []).map((id)=>ENEMY_ABILITY_DEFINITIONS[id]).find((ability)=>ability?.damageReduction>0);
  const abilityNote = guardAbility ? "（"+guardAbility.name+"でダメージ軽減）" : "";
  const skillNote = skill ? "「" + skill.name + "」！" : "";
  return {
    ignored:false, action:{type:GAME_ACTION.DAMAGE_ENEMY,amount}, damageTarget:"enemy", damage:amount,
    message:skillNote + "単語完成！難易度Lv."+wordDifficulty+"。"+gameState.enemy.name+"に"+amount+"ダメージ！"+abilityNote,
    tone:"good",
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

      const previousState = store.getState();
      const resolution = resolveCombatEvent(previousState, event);
      if (resolution.ignored) return resolution;

      processedEventIds.add(event.eventId);
      if (resolution.action) {
        store.dispatch(resolution.action);
      }

      const state = store.getState();
      let message = resolution.message;
      let tone = resolution.tone;
      let experienceGained = 0;
      let levelUps = 0;
      if (
        previousState.phase === GAME_PHASE.BATTLE &&
        state.phase === GAME_PHASE.VICTORY
      ) {
        experienceGained = state.enemy?.experienceReward ?? 0;
        levelUps = state.player.level - previousState.player.level;
        message =
          state.enemy.name + "を倒した！ EXP +" + experienceGained + "！";
        if (levelUps > 0) {
          message += " レベルアップ！ LV." + state.player.level + "になった！";
        }
        tone = "good";
      } else if (state.phase === GAME_PHASE.DEFEAT) {
        message = "HPがなくなった！冒険失敗……";
        tone = "bad";
      }

      return {
        ...resolution,
        experienceGained,
        levelUps,
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
