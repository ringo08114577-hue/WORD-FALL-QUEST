/** Skill lookup, progression, and character-specific loadout helpers. */
import { SKILL_DEFINITIONS } from "./data/skills.js";
import { CHARACTERS, DEFAULT_CHARACTER_ID, isValidCharacterId } from "./characters.js";
import { getSkillLevelDifficultyRange } from "./word-difficulty.js";
export { SKILL_DEFINITIONS, getSkillLevelDifficultyRange };

export const SKILL_EQUIP_SLOT_COUNT = 4;
export function getSkillsForCharacter(characterId) {
  if (!isValidCharacterId(characterId)) return [];
  return Object.entries(SKILL_DEFINITIONS).filter(([, skill]) => skill.characterId === characterId);
}
export function isSkillAvailableForCharacter(skillId, characterId) {
  return Boolean(isValidCharacterId(characterId) &&
    Object.hasOwn(SKILL_DEFINITIONS, skillId) &&
    SKILL_DEFINITIONS[skillId].characterId === characterId);
}
export function createInitialEquippedSkillIds(characterId = DEFAULT_CHARACTER_ID) {
  const selectedId = isValidCharacterId(characterId) ? characterId : DEFAULT_CHARACTER_ID;
  const equipped = getSkillsForCharacter(selectedId)
    .filter(([, skill]) => skill.initiallyEquipped === true)
    .map(([id]) => id).slice(0, SKILL_EQUIP_SLOT_COUNT);
  return [...equipped, ...Array(SKILL_EQUIP_SLOT_COUNT - equipped.length).fill(null)];
}
export function isValidEquippedSkillIds(skillIds, characterId = null) {
  if (!Array.isArray(skillIds) || skillIds.length !== SKILL_EQUIP_SLOT_COUNT ||
      !skillIds.some((id) => id !== null)) return false;
  if (characterId !== null && !isValidCharacterId(characterId)) return false;
  const seen = new Set();
  for (const id of skillIds) {
    if (id === null) continue;
    if (typeof id !== "string" || !Object.hasOwn(SKILL_DEFINITIONS, id) || seen.has(id)) return false;
    if (characterId !== null && !isSkillAvailableForCharacter(id, characterId)) return false;
    seen.add(id);
  }
  return true;
}
export function normalizeEquippedSkillIds(skillIds, characterId = DEFAULT_CHARACTER_ID) {
  const selectedId = isValidCharacterId(characterId) ? characterId : DEFAULT_CHARACTER_ID;
  const normalized = Array(SKILL_EQUIP_SLOT_COUNT).fill(null);
  const seen = new Set();
  if (Array.isArray(skillIds)) {
    for (let index = 0; index < Math.min(skillIds.length, SKILL_EQUIP_SLOT_COUNT); index += 1) {
      const id = skillIds[index];
      if (isSkillAvailableForCharacter(id, selectedId) && !seen.has(id)) {
        normalized[index] = id;
        seen.add(id);
      }
    }
  }
  return normalized.some((id) => id !== null) ? normalized : createInitialEquippedSkillIds(selectedId);
}
export function createInitialCharacterSkillLoadouts() {
  return Object.fromEntries(CHARACTERS.map((character) => [
    character.id, createInitialEquippedSkillIds(character.id),
  ]));
}
export function isValidCharacterSkillLoadouts(loadouts) {
  if (!loadouts || typeof loadouts !== "object" || Array.isArray(loadouts)) return false;
  const ids = CHARACTERS.map((character) => character.id);
  if (Object.keys(loadouts).length !== ids.length || !ids.every((id) => Object.hasOwn(loadouts, id))) return false;
  return CHARACTERS.every((character) => isValidEquippedSkillIds(loadouts[character.id], character.id));
}
export function normalizeCharacterSkillLoadouts(loadouts) {
  const source = loadouts && typeof loadouts === "object" && !Array.isArray(loadouts) ? loadouts : {};
  return Object.fromEntries(CHARACTERS.map((character) => [
    character.id, normalizeEquippedSkillIds(source[character.id], character.id),
  ]));
}
export function getSkillDefinition(skillId) {
  return Object.hasOwn(SKILL_DEFINITIONS, skillId) ? SKILL_DEFINITIONS[skillId] : null;
}
export const SKILL_EVOLUTION_GOLD_COST = 200;
const FOREST_EVOLUTION_MATERIAL = "forest-dragon-seal";
const FROZEN_EVOLUTION_MATERIAL = "ice-dragon-core";
export function getSkillEvolutionRecipe(skillId) {
  const skill = getSkillDefinition(skillId);
  if (!skill) return null;
  return Object.freeze({
    materialId: skill.characterId === "elemental-mage" ? FROZEN_EVOLUTION_MATERIAL : FOREST_EVOLUTION_MATERIAL,
    materialQuantity: 1, gold: SKILL_EVOLUTION_GOLD_COST,
  });
}
export function getSkillDisplayName(skillId, evolved = false) {
  const skill = getSkillDefinition(skillId);
  if (!skill) return "スキル";
  return evolved && typeof skill.evolvedName === "string" ? skill.evolvedName : skill.name;
}
export function isValidEvolvedSkillIds(skillIds, skillLevels) {
  if (!Array.isArray(skillIds) || !skillLevels || typeof skillLevels !== "object" || Array.isArray(skillLevels)) return false;
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
    normalized.push(id); seen.add(id);
  }
  return normalized;
}
export const SKILL_CATEGORY_LABELS = Object.freeze({
  attack: "攻撃", magic: "魔法", heal: "回復", defense: "防御", support: "補助",
});
export function getSkillWordDifficultyRange(skillId, currentLevel) {
  const skill = getSkillDefinition(skillId);
  if (!skill) return null;
  const level = currentLevel ?? skill.startingLevel ?? 1;
  const range = skill.wordDifficultyRange ?? getSkillLevelDifficultyRange(level);
  return { min: range.min, max: range.max };
}
export function getSkillEffectForLevel(skillId, currentLevel, evolved = false) {
  const skill = getSkillDefinition(skillId);
  if (!skill) return null;
  const level = currentLevel ?? skill.startingLevel ?? 1;
  if (!Number.isInteger(level) || level < 1 || level > (skill.maxLevel ?? 5)) return null;
  const index = level - 1, effect = skill.effect;
  let result;
  if (!effect && skill.category === "magic") result = { type: "magic", damageMultiplier: skill.damageMultiplier ?? 1, element: skill.element };
  else if (!effect) result = { type: "attack", damageMultiplier: skill.damageMultiplier ?? 1 };
  else if (effect.type === "heal") result = { type: "heal", amount: effect.amountByLevel[index], hpRatio: effect.hpRatioByLevel?.[index] ?? 0 };
  else if (effect.type === "defense") result = { type: "defense", bonus: effect.bonusByLevel[index], hits: effect.hits };
  else if (effect.type === "attack-buff") result = { type: "attack-buff", multiplier: effect.multiplierByLevel[index], uses: effect.uses };
  else return null;
  if (!evolved) return result;
  if (result.type === "attack" || result.type === "magic") return { ...result, damageMultiplier: Number((result.damageMultiplier * 1.2).toFixed(1)) };
  if (result.type === "heal") return { ...result, amount: result.amount + 20, hpRatio: Math.min(0.9, Number(((result.hpRatio ?? 0) + 0.1).toFixed(1))) };
  if (result.type === "defense") return { ...result, bonus: result.bonus + 10 };
  if (result.type === "attack-buff") return { ...result, multiplier: Number((result.multiplier + 0.2).toFixed(1)) };
  return result;
}
export function createInitialSkillLevels() {
  return Object.fromEntries(Object.entries(SKILL_DEFINITIONS).map(([id, skill]) => [id, skill.startingLevel ?? 1]));
}
export function isValidSkillLevels(levels) {
  if (!levels || typeof levels !== "object" || Array.isArray(levels)) return false;
  const ids = Object.keys(SKILL_DEFINITIONS);
  if (Object.keys(levels).length !== ids.length) return false;
  return ids.every((id) => Number.isInteger(levels[id]) && levels[id] >= 1 && levels[id] <= (SKILL_DEFINITIONS[id].maxLevel ?? 5));
}
export function normalizeSkillLevels(levels) {
  const source = levels && typeof levels === "object" && !Array.isArray(levels) ? levels : {};
  return Object.fromEntries(Object.entries(SKILL_DEFINITIONS).map(([id, skill]) => {
    const level = source[id];
    return [id, Number.isInteger(level) && level >= 1 && level <= (skill.maxLevel ?? 5) ? level : (skill.startingLevel ?? 1)];
  }));
}
export function getSkillUpgradeCost(skillId, currentLevel) {
  const skill = getSkillDefinition(skillId);
  if (!skill || !Number.isInteger(currentLevel) || currentLevel < 1 || currentLevel >= (skill.maxLevel ?? 5)) return null;
  const cost = skill.upgradeCosts?.[currentLevel - 1];
  return Number.isSafeInteger(cost) && cost > 0 ? cost : null;
}
