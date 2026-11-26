/**
 * WORD FALL QUEST - Combat event resolver (Step 4)
 *
 * Word collection emits events. This module is the only place that converts
 * those events into HP actions, keeping game-state and word logic separate.
 */
import { GAME_ACTION, GAME_PHASE } from "./game-state.js";
import { ENEMY_ABILITY_DEFINITIONS, getEnemyAbilityEffects } from "./enemies.js";
import { SKILL_DEFINITIONS, getSkillEffectForLevel, getSkillDisplayName } from "./skills.js";
import { WORD_DIFFICULTY_DEFINITIONS } from "./word-difficulty.js";
import { ITEM_DEFINITIONS, getEquipmentElementalBonuses, getElementalResistanceMultiplier } from "./items.js";
import { getElementLabel, getElementalMatchup } from "./elements.js";
import { resolveEnemyDrops } from "./enemy-drops.js";
import {
  createInitialGoukiState, normalizeGoukiState, getGoukiAbilityMultiplier,
  gainGouki, setNextGoukiGainMultiplier, spendGouki, spendAllGouki,
} from "./gouki.js";

export const COMBAT_EVENT = Object.freeze({
  CORRECT: "correct",
  WRONG: "wrong",
  WORD_COMPLETE: "word-complete",
  TIMED_ATTACK: "timed-attack",
});

const VALID_EVENTS = new Set(Object.values(COMBAT_EVENT));

function getEventSkillId(gameState, event) {
  if (typeof event?.skillId === "string") return event.skillId;
  return gameState.equippedSkillIds?.find((id) => {
    const skill = SKILL_DEFINITIONS[id];
    return skill && skill.category === "attack" && !skill.passive &&
      (!event?.characterId || skill.characterId === event.characterId);
  }) ?? gameState.equippedSkillIds?.find((id) => {
    const skill = SKILL_DEFINITIONS[id];
    return skill && !skill.passive && (!event?.characterId || skill.characterId === event.characterId);
  }) ?? null;
}

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
    const goukiState = event.characterId === "gou-swordsman"
      ? normalizeGoukiState(event.goukiState) : createInitialGoukiState();
    const goukiMultiplier = event.characterId === "gou-swordsman"
      ? getGoukiAbilityMultiplier(goukiState.stacks) : 1;
    const baseDefensePower = Number.isSafeInteger(gameState.player?.defensePower) && gameState.player.defensePower >= 0
      ? gameState.player.defensePower : 0;
    const defensePower = Math.floor(baseDefensePower * goukiMultiplier);
    const effects = getEnemyAbilityEffects(gameState.enemy);
    const battleDefenseBonus = gameState.battleEffects?.defenseHitsRemaining > 0
      ? gameState.battleEffects.defenseBonus : 0;
    const effectiveDefense = Math.max(0, defensePower - effects.defensePiercing) + battleDefenseBonus;
    const minimumDamage = battleDefenseBonus > 0 ? 0 : 1;
    const rawAmount = Math.max(
      minimumDamage,
      enemyPower + effects.counterAttackBonus - effectiveDefense,
    );
    const incomingElement = gameState.enemy.attackElement ?? null;
    const incomingResistanceMultiplier = getElementalResistanceMultiplier(
      gameState.inventory?.equipment, incomingElement,
    );
    const amount = rawAmount === 0 ? 0 : Math.max(1, Math.ceil(rawAmount * incomingResistanceMultiplier));
    const resistanceValue = incomingElement
      ? getEquipmentElementalBonuses(gameState.inventory?.equipment).resistance[incomingElement] ?? 0
      : 0;
    const incomingElementNote = incomingElement
      ? "（" + getElementLabel(incomingElement) + "属性攻撃" +
        (resistanceValue > 0 ? "・耐性" : resistanceValue < 0 ? "・弱点" : "") + "）"
      : "";
    const counterAbility = (gameState.enemy.abilities ?? []).map((id)=>ENEMY_ABILITY_DEFINITIONS[id]).find((ability)=>ability?.counterAttackBonus>0);
    const abilityNote = counterAbility ? "（"+counterAbility.name+"）" : "";
    const piercingNote = effects.defensePiercing>0 ? " 防御力を一部無視！" : "";
    return {
      ignored:false, action:{
        type:GAME_ACTION.DAMAGE_PLAYER,
        amount,
        consumeDefenseBuff: battleDefenseBonus > 0,
        logReason: event.type === COMBAT_EVENT.TIMED_ATTACK ? "時間攻撃" : "反撃",
      }, damageTarget:"player", damage:amount,
      message: amount === 0
        ? gameState.enemy.name + "の攻撃を「鉄壁の構え」で完全に防いだ！ダメージ0。" + incomingElementNote
        : event.type === COMBAT_EVENT.TIMED_ATTACK
          ? gameState.enemy.name + "の時間攻撃！ HP -" + amount + "。" + abilityNote + piercingNote + incomingElementNote
          : gameState.enemy.name + "の反撃" + abilityNote + "！「" + (event.letter || "?") + "」は違う文字。HP -" + amount + "。" + piercingNote + incomingElementNote,
      tone:"bad",
    };
  }
  const skillId = getEventSkillId(gameState, event);
  const skill = typeof skillId === "string" &&
    Object.hasOwn(SKILL_DEFINITIONS, skillId)
    ? SKILL_DEFINITIONS[skillId]
    : null;
  if (skill && event.characterId && skill.characterId !== event.characterId) {
    return { ignored: true, reason: "skill-not-for-character" };
  }
  if (!skill || skill.passive === true || !Array.isArray(gameState.equippedSkillIds) ||
      !gameState.equippedSkillIds.includes(skillId)) {
    return { ignored: true, reason: "skill-not-equipped" };
  }

  const wordDifficulty = event.wordDifficulty === undefined ? 1 : event.wordDifficulty;
  if (!Number.isInteger(wordDifficulty) ||
      !Object.hasOwn(WORD_DIFFICULTY_DEFINITIONS, wordDifficulty)) {
    return { ignored: true, reason: "invalid-word-difficulty" };
  }

  const skillLevel = gameState.skillLevels?.[skillId] ?? skill.startingLevel ?? 1;
  const isEvolved = gameState.evolvedSkillIds?.includes(skillId) === true;
  const skillEffect = getSkillEffectForLevel(skillId, skillLevel, isEvolved);
  const skillNote = "「" + getSkillDisplayName(skillId, isEvolved) + "」！";
  const activeCharacterId = event.characterId ?? skill.characterId;
  const isGouSwordsman = activeCharacterId === "gou-swordsman";
  const goukiState = isGouSwordsman ? normalizeGoukiState(event.goukiState) : createInitialGoukiState();

  if (skillEffect?.type === "gouki-charge" || skillEffect?.type === "gouki-low-hp-charge") {
    const remainingHpRatio = gameState.player.maxHp > 0
      ? Math.min(1, Math.max(0, gameState.player.hp / gameState.player.maxHp)) : 1;
    const lowHpRatio = 1 - remainingHpRatio;
    const baseAmount = skillEffect.type === "gouki-charge"
      ? skillEffect.amount
      : skillEffect.baseAmount + Math.floor(skillEffect.missingHpBonus * lowHpRatio);
    const gained = gainGouki(goukiState, baseAmount);
    return {
      ignored: false, action: null, damageTarget: null, goukiState: gained.state,
      goukiGained: gained.gained,
      message: skillNote + "ダメージを与えず轟気を " + gained.gained + " 個獲得！現在 " + gained.state.stacks + " 個。",
      tone: "good",
    };
  }

  if (skillEffect?.type === "gouki-limit-break") {
    const nextState = setNextGoukiGainMultiplier(goukiState, skillEffect.multiplier);
    return {
      ignored: false, action: null, damageTarget: null, goukiState: nextState,
      message: skillNote + "次に獲得する轟気が ×" + skillEffect.multiplier + " になる！",
      tone: "good",
    };
  }

  if (skillEffect?.type === "gouki-defense") {
    const spent = spendGouki(goukiState, skillEffect.consumeAmount);
    if (!spent.success) return {
      ignored: true, reason: "insufficient-gouki", required: skillEffect.consumeAmount, available: goukiState.stacks,
    };
    return {
      ignored: false, action: {
        type: GAME_ACTION.APPLY_DEFENSE_BUFF, bonus: skillEffect.bonus, hits: skillEffect.hits, skillId,
      }, damageTarget: null, goukiState: spent.state, goukiSpent: spent.spent,
      message: skillNote + "轟気を " + spent.spent + " 個防御力に変換！防御 +" + skillEffect.bonus + " が " + skillEffect.hits + " 回続く。",
      tone: "good",
    };
  }

  if (skillEffect?.type === "heal") {
    const scaledHeal = Math.ceil(gameState.player.maxHp * (skillEffect.hpRatio ?? 0));
    const healAmount = Math.max(skillEffect.amount ?? 0, scaledHeal);
    const actualHeal = Math.min(healAmount, gameState.player.maxHp - gameState.player.hp);
    return {
      ignored: false,
      action: { type: GAME_ACTION.HEAL_PLAYER, amount: healAmount, skillId },
      damageTarget: null,
      message: actualHeal > 0
        ? skillNote + "HPを " + actualHeal + " 回復！"
        : skillNote + "HPは満タンだ！",
      tone: "good",
    };
  }

  if (skillEffect?.type === "defense") {
    return {
      ignored: false,
      action: {
        type: GAME_ACTION.APPLY_DEFENSE_BUFF,
        bonus: skillEffect.bonus,
        hits: skillEffect.hits,
        skillId,
      },
      damageTarget: null,
      message: skillNote + "防御力 +" + skillEffect.bonus +
        "！次の敵の攻撃 " + skillEffect.hits + "回を軽減するよ。",
      tone: "good",
    };
  }

  if (skillEffect?.type === "attack-buff") {
    return {
      ignored: false,
      action: {
        type: GAME_ACTION.APPLY_ATTACK_BUFF,
        multiplier: skillEffect.multiplier,
        uses: skillEffect.uses,
        skillId,
      },
      damageTarget: null,
      message: skillNote + "攻撃倍率 ×" + skillEffect.multiplier +
        "！次の攻撃 " + skillEffect.uses + "回が強化されるよ。",
      tone: "good",
    };
  }

  const effects = getEnemyAbilityEffects(gameState.enemy);
  let goukiAfterAttack = null;
  let goukiSpent = 0;
  let goukiGained = 0;
  let goukiAttackMultiplier = 1;
  let breakGuard = skillEffect?.breakGuard === true;
  const isGoukiAttack = isGouSwordsman;
  if (isGoukiAttack) {
    const passiveSkills = gameState.equippedSkillIds
      .filter((id) => SKILL_DEFINITIONS[id]?.passive === true);
    const breakerId = passiveSkills.find((id) => SKILL_DEFINITIONS[id]?.effect?.type === "gouki-passive-breaker");
    const resonanceId = passiveSkills.find((id) => SKILL_DEFINITIONS[id]?.effect?.type === "gouki-passive-resonance");
    if (breakerId) {
      const passive = getSkillEffectForLevel(breakerId, gameState.skillLevels?.[breakerId] ?? 1,
        gameState.evolvedSkillIds?.includes(breakerId) === true);
      if (goukiState.stacks >= passive.threshold && (gameState.enemy.isBoss || gameState.enemy.isMiniBoss)) {
        breakGuard = true;
        goukiAttackMultiplier *= passive.damageMultiplier;
      }
    }
    if (resonanceId) {
      const passive = getSkillEffectForLevel(resonanceId, gameState.skillLevels?.[resonanceId] ?? 1,
        gameState.evolvedSkillIds?.includes(resonanceId) === true);
      if (goukiState.stacks >= passive.highThreshold) goukiAttackMultiplier *= passive.highDamageMultiplier;
      else if (goukiState.stacks >= passive.threshold) goukiAttackMultiplier *= passive.damageMultiplier;
    }
    if (skillEffect?.type === "gouki-consume-attack") {
      const spent = spendGouki(goukiState, skillEffect.consumeAmount);
      if (!spent.success) return {
        ignored: true, reason: "insufficient-gouki", required: skillEffect.consumeAmount, available: goukiState.stacks,
      };
      goukiSpent = spent.spent;
      goukiAfterAttack = spent.state;
      goukiAttackMultiplier *= 1 + goukiSpent * skillEffect.bonusPerStack;
      breakGuard ||= skillEffect.breakGuard;
    } else if (skillEffect?.type === "gouki-consume-all") {
      const spent = spendAllGouki(goukiState);
      if (!spent.success) return {
        ignored: true, reason: "insufficient-gouki", required: 1, available: goukiState.stacks,
      };
      goukiSpent = spent.spent;
      goukiAfterAttack = spent.state;
      goukiAttackMultiplier *= 1 + goukiSpent * skillEffect.bonusPerStack;
      breakGuard ||= skillEffect.breakGuard;
    } else if (skillEffect?.type === "gouki-attack") {
      const gained = gainGouki(goukiState, skillEffect.gainAmount);
      goukiAfterAttack = gained.state;
      goukiGained = gained.gained;
    }
  }
  const isSpecialEnemy = gameState.enemy.isBoss || gameState.enemy.isMiniBoss;
  const hasGuardAbility = gameState.enemy.abilities?.includes("guard") === true;
  const breaksBossGuard = isGoukiAttack && breakGuard && isSpecialEnemy && hasGuardAbility;
  const activeAttackMultiplier = gameState.battleEffects?.attackUsesRemaining > 0
    ? gameState.battleEffects.attackMultiplier : 1;
  const equipmentElements = getEquipmentElementalBonuses(gameState.inventory?.equipment);
  const isMagicAttack = skillEffect?.type === "magic";
  const attackElement = skillEffect?.element ?? skill?.element ??
    (isMagicAttack ? null : equipmentElements.attackElement);
  const goukiMultiplier = isGouSwordsman
    ? getGoukiAbilityMultiplier(goukiState.stacks) : 1;
  const offensivePower = (isMagicAttack
    ? positivePower(gameState.player.magicPower)
    : positivePower(gameState.player.attackPower)) * goukiMultiplier;
  const elementalMatchup = getElementalMatchup(attackElement, gameState.enemy);
  const elementalAttackBonus = attackElement ? equipmentElements.attackBonus[attackElement] ?? 0 : 0;
  const elementalAttackMultiplier = attackElement
    ? (1 + elementalAttackBonus) * elementalMatchup.multiplier : 1;
  const baseDamage = Math.ceil(
    offensivePower *
    (skillEffect?.damageMultiplier ?? skill?.damageMultiplier ?? 1) *
    activeAttackMultiplier *
    elementalAttackMultiplier *
    goukiAttackMultiplier,
  );
  const guardReduction = breaksBossGuard
    ? (ENEMY_ABILITY_DEFINITIONS.guard?.damageReduction ?? 0) : 0;
  const effectiveDamageReduction = Math.max(0, effects.damageReduction - guardReduction);
  const amount = Math.max(1, baseDamage - effectiveDamageReduction);
  const outgoingElementNote = attackElement
    ? "（" + getElementLabel(attackElement) + "属性" +
      (elementalMatchup.label ? "・" + elementalMatchup.label : "") +
      (elementalAttackBonus > 0 ? "・装備効果 +" + Math.round(elementalAttackBonus * 100) + "%" : "") + "）"
    : "";
  const guardAbility = (gameState.enemy.abilities ?? []).map((id)=>ENEMY_ABILITY_DEFINITIONS[id]).find((ability)=>ability?.damageReduction>0);
  const abilityNote = guardAbility && !breaksBossGuard ? "（"+guardAbility.name+"でダメージ軽減）" : "";
  const extraActions = breaksBossGuard ? [{ type: GAME_ACTION.BREAK_ENEMY_GUARD }] : [];
  const goukiNotes = [
    goukiSpent > 0 ? "轟気 -" + goukiSpent + " 個" : "",
    goukiGained > 0 ? "轟気 +" + goukiGained + " 個" : "",
    goukiAttackMultiplier > 1 ? "轟気技倍率 ×" + goukiAttackMultiplier.toFixed(2) : "",
    breaksBossGuard ? "ボスの防御ギミックを破壊！" : "",
  ].filter(Boolean).join(" · ");
  return {
    ignored:false,
    ...(extraActions.length > 0 ? { extraActions } : {}),
    ...(goukiAfterAttack ? { goukiState: goukiAfterAttack, goukiSpent, goukiGained } : {}),
    action: {
      type: GAME_ACTION.DAMAGE_ENEMY,
      amount,
      consumeAttackBuff: activeAttackMultiplier > 1,
    },
    damageTarget:"enemy",
    damage:amount,
    message:skillNote + "単語完成！難易度Lv."+wordDifficulty+"。"+gameState.enemy.name+"に"+amount+"ダメージ！"+outgoingElementNote+
      (activeAttackMultiplier > 1 ? " 攻撃強化が発動！" : "") + abilityNote +
      (goukiNotes ? " [" + goukiNotes + "]" : ""),
    tone:"good",
  };
}

/**
 * Stateful adapter that applies each word event at most once.
 * Events must carry a stable eventId supplied by the word-battle engine.
 */
export function createCombatController(store, {
  random = Math.random,
  getCharacterId = null,
  getGoukiState = null,
  setGoukiState = null,
} = {}) {
  if (
    !store ||
    typeof store.getState !== "function" ||
    typeof store.dispatch !== "function"
  ) {
    throw new TypeError("combat controllerにはgame storeが必要です。");
  }

  if (typeof random !== "function" ||
      (getCharacterId !== null && typeof getCharacterId !== "function") ||
      (getGoukiState !== null && typeof getGoukiState !== "function") ||
      (setGoukiState !== null && typeof setGoukiState !== "function")) {
    throw new TypeError("combat controllerには乱数関数が必要です。");
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
      const activeCharacterId = typeof getCharacterId === "function" ? getCharacterId() : null;
      const combatEvent = {
        ...event,
        ...(activeCharacterId ? { characterId: activeCharacterId } : {}),
        ...(activeCharacterId === "gou-swordsman" && typeof getGoukiState === "function"
          ? { goukiState: getGoukiState() } : {}),
      };
      const resolution = resolveCombatEvent(previousState, combatEvent);
      if (resolution.ignored) return resolution;

      processedEventIds.add(event.eventId);
      if (resolution.goukiState && typeof setGoukiState === "function") {
        setGoukiState(resolution.goukiState);
      }
      for (const extraAction of resolution.extraActions ?? []) {
        store.dispatch(extraAction);
      }
      if (resolution.action) {
        store.dispatch(resolution.action);
      }

      let state = store.getState();
      if (event.type === COMBAT_EVENT.WRONG) {
        store.dispatch({
          type: GAME_ACTION.LOG_EVENT,
          category: "combat",
          message: "文字選択ミス：" + (event.letter || "?"),
        });
      } else if (event.type === COMBAT_EVENT.WORD_COMPLETE) {
        const usedSkillId = getEventSkillId(previousState, combatEvent);
        const skill = usedSkillId ? SKILL_DEFINITIONS[usedSkillId] : null;
        store.dispatch({
          type: GAME_ACTION.LOG_EVENT,
          category: "skill",
          message: (event.japanese ? "「" + event.japanese + "」" : "単語") +
            (event.word ? "（" + event.word + "）" : "") +
            "を完成：" + getSkillDisplayName(
              usedSkillId,
              state.evolvedSkillIds?.includes(usedSkillId) === true,
            ) +
            "・難易度Lv." + (event.wordDifficulty ?? 1),
        });
      }

      let message = resolution.message;
      let tone = resolution.tone;
      let experienceGained = 0;
      let levelUps = 0;
      let drops = [];
      if (
        previousState.phase === GAME_PHASE.BATTLE &&
        state.phase === GAME_PHASE.VICTORY
      ) {
        const defeatedEnemy = state.enemy;
        experienceGained = defeatedEnemy?.experienceReward ?? 0;
        levelUps = state.player.level - previousState.player.level;
        drops = resolveEnemyDrops(defeatedEnemy?.id, random);
        for (const drop of drops) {
          store.dispatch({
            type: GAME_ACTION.ADD_ITEM,
            itemId: drop.itemId,
            quantity: drop.quantity,
            sourceLabel: defeatedEnemy.name + "のドロップ",
          });
        }
        state = store.getState();
        message =
          defeatedEnemy.name + "を倒した！ EXP +" + experienceGained + "！";
        if (levelUps > 0) {
          message += " レベルアップ！ LV." + state.player.level + "になった！";
        }
        if (drops.length > 0) {
          const dropSummary = drops.map(({ itemId, quantity }) =>
            (ITEM_DEFINITIONS[itemId]?.name ?? itemId) + " ×" + quantity
          ).join("、");
          message += " 素材ドロップ！ " + dropSummary + "を手に入れた！";
        }
        tone = "good";
      } else if (state.phase === GAME_PHASE.DEFEAT) {
        if (activeCharacterId === "gou-swordsman" && typeof setGoukiState === "function") {
          setGoukiState(createInitialGoukiState());
        }
        message = "HPがなくなった！冒険失敗……";
        tone = "bad";
      }

      return {
        ...resolution,
        experienceGained,
        levelUps,
        drops,
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
