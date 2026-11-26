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
  attack: "攻撃", magic: "魔法", heal: "回復", defense: "防御", support: "補助", passive: "パッシブ",
});
export function getSkillWordDifficultyRange(skillId, currentLevel) {
  const skill = getSkillDefinition(skillId);
  if (!skill) return null;
  const level = currentLevel ?? skill.startingLevel ?? 1;
  const range = skill.wordDifficultyRange ?? getSkillLevelDifficultyRange(level);
  return { min: range.min, max: range.max };
}
function levelValue(values, index, fallback = 0) {
  return Array.isArray(values) && Number.isFinite(values[index]) ? values[index] : fallback;
}
export function getSkillEffectForLevel(skillId, currentLevel, evolved = false) {
  const skill = getSkillDefinition(skillId);
  if (!skill) return null;
  const level = currentLevel ?? skill.startingLevel ?? 1;
  if (!Number.isInteger(level) || level < 1 || level > (skill.maxLevel ?? 5)) return null;
  const index = level - 1, effect = skill.effect;
  let result;
  if (!effect && skill.category === "magic") result = {
    type: "magic", damageMultiplier: skill.damageMultiplier ?? 1, element: skill.element,
  };
  else if (!effect) result = { type: "attack", damageMultiplier: skill.damageMultiplier ?? 1 };
  else if (effect.type === "heal") result = {
    type: "heal", amount: levelValue(effect.amountByLevel, index),
    hpRatio: levelValue(effect.hpRatioByLevel, index),
  };
  else if (effect.type === "defense") result = {
    type: "defense", bonus: levelValue(effect.bonusByLevel, index), hits: effect.hits,
  };
  else if (effect.type === "attack-buff") result = {
    type: "attack-buff", multiplier: levelValue(effect.multiplierByLevel, index), uses: effect.uses,
  };
  else if (effect.type === "gouki-charge") result = {
    type: "gouki-charge", amount: levelValue(effect.amountByLevel, index),
  };
  else if (effect.type === "gouki-low-hp-charge") result = {
    type: "gouki-low-hp-charge",
    baseAmount: levelValue(effect.baseAmountByLevel, index),
    missingHpBonus: levelValue(effect.missingHpBonusByLevel, index),
  };
  else if (effect.type === "gouki-attack") result = {
    type: "gouki-attack",
    damageMultiplier: levelValue(effect.damageMultiplierByLevel, index, 1),
    gainAmount: levelValue(effect.gainAmountByLevel, index),
  };
  else if (effect.type === "gouki-consume-attack") result = {
    type: "gouki-consume-attack",
    consumeAmount: effect.consumeAmount,
    bonusPerStack: levelValue(effect.bonusPerStackByLevel, index),
    breakGuard: effect.breakGuard === true,
  };
  else if (effect.type === "gouki-consume-all") result = {
    type: "gouki-consume-all",
    bonusPerStack: levelValue(effect.bonusPerStackByLevel, index),
    breakGuard: effect.breakGuard === true,
  };
  else if (effect.type === "gouki-defense") result = {
    type: "gouki-defense",
    consumeAmount: effect.consumeAmount,
    bonus: levelValue(effect.bonusByLevel, index),
    hits: effect.hits,
  };
  else if (effect.type === "gouki-limit-break") result = {
    type: "gouki-limit-break", multiplier: levelValue(effect.multiplierByLevel, index, 2),
  };
  else if (effect.type === "gouki-passive-breaker") result = {
    type: "gouki-passive", passiveKind: "breaker",
    threshold: effect.threshold,
    damageMultiplier: levelValue(effect.damageMultiplierByLevel, index, 1),
  };
  else if (effect.type === "gouki-passive-resonance") result = {
    type: "gouki-passive", passiveKind: "resonance",
    threshold: levelValue(effect.thresholdByLevel, index, effect.highThreshold),
    damageMultiplier: levelValue(effect.multiplierByLevel, index, 1.2),
    highThreshold: effect.highThreshold,
    highDamageMultiplier: levelValue(effect.highMultiplierByLevel, index, 1.5),
  };
  else return null;

  if (!evolved) return result;
  if (result.type === "attack" || result.type === "magic") return {
    ...result, damageMultiplier: Number((result.damageMultiplier * 1.2).toFixed(2)),
  };
  if (result.type === "heal") return {
    ...result, amount: result.amount + 20,
    hpRatio: Math.min(0.9, Number(((result.hpRatio ?? 0) + 0.1).toFixed(1))),
  };
  if (result.type === "defense") return { ...result, bonus: result.bonus + 10 };
  if (result.type === "attack-buff") return { ...result, multiplier: Number((result.multiplier + 0.2).toFixed(1)) };
  if (result.type === "gouki-charge") return { ...result, amount: result.amount + 5 };
  if (result.type === "gouki-low-hp-charge") return {
    ...result, baseAmount: result.baseAmount + 2, missingHpBonus: result.missingHpBonus + 3,
  };
  if (result.type === "gouki-attack") return {
    ...result, damageMultiplier: Number((result.damageMultiplier + 0.2).toFixed(2)),
    gainAmount: result.gainAmount + 2,
  };
  if (result.type === "gouki-consume-attack" || result.type === "gouki-consume-all") return {
    ...result, bonusPerStack: Number((result.bonusPerStack + 0.1).toFixed(2)),
  };
  if (result.type === "gouki-defense") return { ...result, bonus: result.bonus + 15 };
  if (result.type === "gouki-limit-break") return {
    ...result, multiplier: Number((result.multiplier + 0.5).toFixed(2)),
  };
  if (result.type === "gouki-passive") return {
    ...result, damageMultiplier: Number((result.damageMultiplier + 0.1).toFixed(2)),
    highDamageMultiplier: result.highDamageMultiplier
      ? Number((result.highDamageMultiplier + 0.1).toFixed(2)) : undefined,
  };
  return result;
}
export function getSkillEffectLabel(effect) {
  if (!effect) return "効果情報なし";
  if (effect.type === "attack") return "攻撃威力 ×" + effect.damageMultiplier;
  if (effect.type === "magic") return "魔力 ×" + effect.damageMultiplier;
  if (effect.type === "heal") return "HPを回復";
  if (effect.type === "defense") return "防御力 +" + effect.bonus;
  if (effect.type === "attack-buff") return "次の攻撃 ×" + effect.multiplier;
  if (effect.type === "gouki-charge") return "轟気 +" + effect.amount + "（ダメージなし）";
  if (effect.type === "gouki-low-hp-charge") return "HPが減るほど轟気獲得量アップ（基本 +" + effect.baseAmount + "）";
  if (effect.type === "gouki-attack") return "攻撃 ×" + effect.damageMultiplier + " · 轟気 +" + effect.gainAmount;
  if (effect.type === "gouki-consume-attack") return "轟気 " + effect.consumeAmount + "個消費 · 消費数に応じて威力上昇";
  if (effect.type === "gouki-consume-all") return "轟気を全消費 · 消費数に応じて威力上昇";
  if (effect.type === "gouki-defense") return "轟気 " + effect.consumeAmount + "個消費 · 防御 +" + effect.bonus + "（" + effect.hits + "回）";
  if (effect.type === "gouki-limit-break") return "次の轟気獲得量 ×" + effect.multiplier;
  if (effect.type === "gouki-passive" && effect.passiveKind === "breaker") return "轟気 " + effect.threshold + "個以上でボス防御ギミックを破壊";
  if (effect.type === "gouki-passive" && effect.passiveKind === "resonance") return "轟気 " + effect.threshold + "個以上で攻撃 ×" + effect.damageMultiplier + " · 50個以上でさらに強化";
  return "効果あり";
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
