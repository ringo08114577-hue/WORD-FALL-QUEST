/** Skill lookup, progression, and upgrade-cost helpers. */
import { SKILL_DEFINITIONS } from "./data/skills.js";
import { getSkillLevelDifficultyRange } from "./word-difficulty.js";

export { SKILL_DEFINITIONS, getSkillLevelDifficultyRange };

export const SKILL_EQUIP_SLOT_COUNT = 4;
export function createInitialEquippedSkillIds() {
  const equipped = Object.values(SKILL_DEFINITIONS)
    .filter((skill) => skill.initiallyEquipped === true)
    .map((skill) => skill.id)
    .slice(0, SKILL_EQUIP_SLOT_COUNT);
  return [...equipped, ...Array(SKILL_EQUIP_SLOT_COUNT - equipped.length).fill(null)];
}
export function isValidEquippedSkillIds(skillIds) {
  if (!Array.isArray(skillIds) || skillIds.length !== SKILL_EQUIP_SLOT_COUNT || !skillIds.some((id) => id !== null)) return false;
  const seen = new Set();
  for (const id of skillIds) {
    if (id === null) continue;
    if (typeof id !== "string" || !Object.hasOwn(SKILL_DEFINITIONS, id) || seen.has(id)) return false;
    seen.add(id);
  }
  return true;
}
export function normalizeEquippedSkillIds(skillIds) {
  const normalized = Array(SKILL_EQUIP_SLOT_COUNT).fill(null);
  const seen = new Set();
  if (Array.isArray(skillIds)) {
    for (let index = 0; index < Math.min(skillIds.length, SKILL_EQUIP_SLOT_COUNT); index += 1) {
      const id = skillIds[index];
      if (typeof id === "string" && Object.hasOwn(SKILL_DEFINITIONS, id) && !seen.has(id)) {
        normalized[index] = id;
        seen.add(id);
      }
    }
  }
  return normalized.some((id) => id !== null) ? normalized : createInitialEquippedSkillIds();
}

export function getSkillDefinition(skillId) {
  return Object.hasOwn(SKILL_DEFINITIONS, skillId)
    ? SKILL_DEFINITIONS[skillId]
    : null;
}

export const SKILL_EVOLUTION_GOLD_COST = 200;
const FOREST_EVOLUTION_MATERIAL = "forest-dragon-seal";
const FROZEN_EVOLUTION_MATERIAL = "ice-dragon-core";

export function getSkillEvolutionRecipe(skillId) {
  const skill = getSkillDefinition(skillId);
  if (!skill) return null;
  return Object.freeze({
    materialId: skill.category === "attack" ? FOREST_EVOLUTION_MATERIAL : FROZEN_EVOLUTION_MATERIAL,
    materialQuantity: 1,
    gold: SKILL_EVOLUTION_GOLD_COST,
  });
}

export function getSkillDisplayName(skillId, evolved = false) {
  const skill = getSkillDefinition(skillId);
  if (!skill) return "スキル";
  return evolved && typeof skill.evolvedName === "string" ? skill.evolvedName : skill.name;
}

export function isValidEvolvedSkillIds(skillIds, skillLevels) {
  if (!Array.isArray(skillIds) || !skillLevels ||
      typeof skillLevels !== "object" || Array.isArray(skillLevels)) return false;
  const seen = new Set();
  for (const id of skillIds) {
    const skill = getSkillDefinition(id);
    if (!skill || seen.has(id) || skillLevels[id] !== (skill.maxLevel ?? 5)) return false;
    seen.add(id);
  }
  return true;
}

export function normalizeEvolvedSkillIds(skillIds, skillLevels) {
  if (!Array.isArray(skillIds)) return [];
  const normalized = [];
  const seen = new Set();
  for (const id of skillIds) {
    const skill = getSkillDefinition(id);
    if (!skill || seen.has(id) || skillLevels?.[id] !== (skill.maxLevel ?? 5)) continue;
    normalized.push(id);
    seen.add(id);
  }
  return normalized;
}

export const SKILL_CATEGORY_LABELS = Object.freeze({
  attack: "攻撃",
  heal: "回復",
  defense: "防御",
  support: "補助",
});

/** Return the difficulty range for a skill; support skills can stay deliberately easy. */
export function getSkillWordDifficultyRange(skillId, currentLevel) {
  const skill = getSkillDefinition(skillId);
  if (!skill) return null;
  const level = currentLevel ?? skill.startingLevel ?? 1;
  const progressionRange = getSkillLevelDifficultyRange(level);
  const range = skill.wordDifficultyRange ?? progressionRange;
  return { min: range.min, max: range.max };
}

/** Read the effect a skill has at its current level, including a permanent evolution bonus. */
export function getSkillEffectForLevel(skillId, currentLevel, evolved = false) {
  const skill = getSkillDefinition(skillId);
  if (!skill) return null;
  const level = currentLevel ?? skill.startingLevel ?? 1;
  if (!Number.isInteger(level) || level < 1 || level > (skill.maxLevel ?? 5)) return null;
  const index = level - 1;
  const effect = skill.effect;
  let result;
  if (!effect) result = { type: "attack", damageMultiplier: skill.damageMultiplier ?? 1 };
  else if (effect.type === "heal") result = {
    type: "heal",
    amount: effect.amountByLevel[index],
    hpRatio: effect.hpRatioByLevel?.[index] ?? 0,
  };
  else if (effect.type === "defense") result = { type: "defense", bonus: effect.bonusByLevel[index], hits: effect.hits };
  else if (effect.type === "attack-buff") result = { type: "attack-buff", multiplier: effect.multiplierByLevel[index], uses: effect.uses };
  else return null;
  if (!evolved) return result;
  if (result.type === "attack") return { ...result, damageMultiplier: Number((result.damageMultiplier * 1.2).toFixed(1)) };
  if (result.type === "heal") return {
    ...result,
    amount: result.amount + 20,
    hpRatio: Math.min(0.9, (result.hpRatio ?? 0) + 0.1),
  };
  if (result.type === "defense") return { ...result, bonus: result.bonus + 10 };
  if (result.type === "attack-buff") return { ...result, multiplier: Number((result.multiplier + 0.2).toFixed(1)) };
  return result;
}

export function createInitialSkillLevels() {
  return Object.fromEntries(
    Object.entries(SKILL_DEFINITIONS).map(([id, skill]) => [id, skill.startingLevel ?? 1]),
  );
}

export function isValidSkillLevels(levels) {
  if (!levels || typeof levels !== "object" || Array.isArray(levels)) return false;
  const skillIds = Object.keys(SKILL_DEFINITIONS);
  if (Object.keys(levels).length !== skillIds.length) return false;
  return skillIds.every((id) =>
    Number.isInteger(levels[id]) &&
    levels[id] >= 1 &&
    levels[id] <= (SKILL_DEFINITIONS[id].maxLevel ?? 5),
  );
}

/** Safely add newly introduced skills and reset invalid levels to their starting level. */
export function normalizeSkillLevels(levels) {
  const source = levels && typeof levels === "object" && !Array.isArray(levels) ? levels : {};
  return Object.fromEntries(Object.entries(SKILL_DEFINITIONS).map(([id, skill]) => {
    const level = source[id];
    const isValid = Number.isInteger(level) &&
      level >= 1 && level <= (skill.maxLevel ?? 5);
    return [id, isValid ? level : (skill.startingLevel ?? 1)];
  }));
}

/** Cost to move a skill from its current level to the next level; null means max/invalid. */
export function getSkillUpgradeCost(skillId, currentLevel) {
  const skill = getSkillDefinition(skillId);
  if (!skill || !Number.isInteger(currentLevel) ||
      currentLevel < 1 || currentLevel >= (skill.maxLevel ?? 5)) {
    return null;
  }
  const cost = skill.upgradeCosts?.[currentLevel - 1];
  return Number.isSafeInteger(cost) && cost > 0 ? cost : null;
}
