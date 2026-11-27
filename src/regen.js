/** Temporary over-HP resource used only by the Regen Knight during one enemy battle. */
import { SKILL_DEFINITIONS, getSkillEffectForLevel } from "./skills.js";

export function createInitialRegenState() {
  return { overHp: 0 };
}

export function isValidRegenState(value) {
  return Boolean(value && typeof value === "object" && !Array.isArray(value) &&
    Number.isSafeInteger(value.overHp) && value.overHp >= 0 && value.overHp <= 1_000_000_000);
}

export function normalizeRegenState(value) {
  return isValidRegenState(value) ? { overHp: value.overHp } : createInitialRegenState();
}

export function getRegenOverHpCap(gameState) {
  const maxHp = gameState?.player?.maxHp;
  if (!Number.isSafeInteger(maxHp) || maxHp <= 0) return 0;
  let capMultiplier = 1;
  for (const skillId of gameState.equippedSkillIds ?? []) {
    const skill = SKILL_DEFINITIONS[skillId];
    if (!skill || skill.characterId !== "regen-knight" || skill.passive !== true) continue;
    const effect = getSkillEffectForLevel(skillId, gameState.skillLevels?.[skillId] ?? skill.startingLevel ?? 1,
      gameState.evolvedSkillIds?.includes(skillId) === true);
    if (effect?.type === "regen-overhp-cap") capMultiplier = Math.max(capMultiplier, effect.capMultiplier);
  }
  return Math.ceil(maxHp * capMultiplier);
}

export function getRegenDrainRatio(gameState, baseRatio) {
  let bonus = 0;
  for (const skillId of gameState.equippedSkillIds ?? []) {
    const skill = SKILL_DEFINITIONS[skillId];
    if (!skill || skill.characterId !== "regen-knight" || skill.passive !== true) continue;
    const effect = getSkillEffectForLevel(skillId, gameState.skillLevels?.[skillId] ?? skill.startingLevel ?? 1,
      gameState.evolvedSkillIds?.includes(skillId) === true);
    if (effect?.type === "regen-drain-boost") bonus += effect.drainRatioBonus;
  }
  return Number(Math.min(1.25, Math.max(0, baseRatio + bonus)).toFixed(2));
}

export function gainRegenOverHp(regenState, amount, cap) {
  const state = normalizeRegenState(regenState);
  if (!Number.isSafeInteger(amount) || amount <= 0 ||
      !Number.isSafeInteger(cap) || cap < 0) {
    return { state, gained: 0 };
  }
  const next = Math.min(cap, state.overHp + amount);
  return { state: { overHp: next }, gained: next - state.overHp };
}

export function absorbRegenOverHp(regenState, incomingDamage) {
  const state = normalizeRegenState(regenState);
  if (!Number.isSafeInteger(incomingDamage) || incomingDamage < 0) {
    return { state, absorbed: 0, remainingDamage: incomingDamage };
  }
  const absorbed = Math.min(state.overHp, incomingDamage);
  return {
    state: { overHp: state.overHp - absorbed },
    absorbed,
    remainingDamage: incomingDamage - absorbed,
  };
}
