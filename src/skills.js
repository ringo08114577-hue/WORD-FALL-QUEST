/** Skill lookup, progression, and upgrade-cost helpers. */
import { SKILL_DEFINITIONS } from "./data/skills.js";
import { getSkillLevelDifficultyRange } from "./word-difficulty.js";

export { SKILL_DEFINITIONS, getSkillLevelDifficultyRange };

export function getSkillDefinition(skillId) {
  return Object.hasOwn(SKILL_DEFINITIONS, skillId)
    ? SKILL_DEFINITIONS[skillId]
    : null;
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
