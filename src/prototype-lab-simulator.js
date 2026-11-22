/**
 * Isolated test-room helpers. These use the real combat resolver but never create
 * an app session, load/save player progress, or mutate the main game state.
 */
import { GAME_PHASE } from "./game-state.js";
import { COMBAT_EVENT, resolveCombatEvent } from "./combat.js";
import { EQUIPMENT_SLOTS, ITEM_DEFINITIONS, getEquipmentBonuses } from "./items.js";
import { ENEMY_DEFINITIONS } from "./enemies.js";
import { SKILL_DEFINITIONS } from "./skills.js";
import { WORD_DIFFICULTY_DEFINITIONS } from "./word-difficulty.js";

export function createEmptyPrototypeEquipment() {
  return Object.fromEntries(EQUIPMENT_SLOTS.map((slot) => [slot, null]));
}

export function normalizePrototypeEquipment(equipment = {}) {
  const source = equipment && typeof equipment === "object" && !Array.isArray(equipment)
    ? equipment : {};
  return Object.fromEntries(EQUIPMENT_SLOTS.map((slot) => {
    const itemId = source[slot];
    const item = typeof itemId === "string" && Object.hasOwn(ITEM_DEFINITIONS, itemId)
      ? ITEM_DEFINITIONS[itemId] : null;
    return [slot, item?.slot === slot ? itemId : null];
  }));
}

function requirePositiveInteger(value, label) {
  if (!Number.isSafeInteger(value) || value < 1 || value > 99999) {
    throw new RangeError(label + "は1〜99999の整数にしてください。");
  }
}

function requireNonNegativeInteger(value, label) {
  if (!Number.isSafeInteger(value) || value < 0 || value > 99999) {
    throw new RangeError(label + "は0〜99999の整数にしてください。");
  }
}

export function createPrototypeBattleState({
  equipment = {},
  enemy = ENEMY_DEFINITIONS["forest-dragon"],
  baseAttackPower = 100,
  baseDefensePower = 0,
  skillId = "quick-strike",
} = {}) {
  requirePositiveInteger(baseAttackPower, "基本攻撃力");
  requireNonNegativeInteger(baseDefensePower, "基本防御力");

  const safeEquipment = normalizePrototypeEquipment(equipment);
  const equipmentBonuses = getEquipmentBonuses(safeEquipment);
  const skill = typeof skillId === "string" && Object.hasOwn(SKILL_DEFINITIONS, skillId)
    ? SKILL_DEFINITIONS[skillId] : null;
  if (!skill || skill.category !== "attack") {
    throw new RangeError("攻撃スキルを選択してください。");
  }
  if (!enemy || typeof enemy !== "object" ||
      typeof enemy.id !== "string" || typeof enemy.name !== "string" ||
      !Number.isSafeInteger(enemy.maxHp) || enemy.maxHp < 1) {
    throw new TypeError("試験対象の敵データが正しくありません。");
  }
  requirePositiveInteger(enemy.attackPower, "敵の攻撃力");

  const testEnemy = {
    ...enemy,
    hp: enemy.maxHp,
    abilities: Array.isArray(enemy.abilities) ? [...enemy.abilities] : [],
  };

  return {
    phase: GAME_PHASE.BATTLE,
    enemy: testEnemy,
    player: {
      hp: 100,
      maxHp: 100 + equipmentBonuses.maxHpBonus,
      attackPower: baseAttackPower + equipmentBonuses.attackBonus,
      defensePower: baseDefensePower + equipmentBonuses.defenseBonus,
    },
    inventory: { equipment: safeEquipment },
    equippedSkillIds: [skillId],
    skillLevels: { [skillId]: skill.startingLevel ?? 1 },
    evolvedSkillIds: [],
    battleEffects: {
      attackMultiplier: 1,
      attackUsesRemaining: 0,
      defenseBonus: 0,
      defenseHitsRemaining: 0,
    },
  };
}

function validateDifficulty(wordDifficulty) {
  if (!Number.isInteger(wordDifficulty) ||
      !Object.hasOwn(WORD_DIFFICULTY_DEFINITIONS, wordDifficulty)) {
    throw new RangeError("単語難易度は1〜6で選択してください。");
  }
}

export function simulatePrototypeAttack(options = {}) {
  const wordDifficulty = options.wordDifficulty ?? 1;
  validateDifficulty(wordDifficulty);
  const state = createPrototypeBattleState(options);
  const result = resolveCombatEvent(state, {
    type: COMBAT_EVENT.WORD_COMPLETE,
    skillId: options.skillId ?? "quick-strike",
    wordDifficulty,
  });
  return Object.freeze({
    ...result,
    effectiveStats: Object.freeze({ ...state.player }),
    equipment: state.inventory.equipment,
  });
}

export function simulatePrototypeIncomingAttack(options = {}) {
  const state = createPrototypeBattleState(options);
  const result = resolveCombatEvent(state, {
    type: COMBAT_EVENT.TIMED_ATTACK,
  });
  return Object.freeze({
    ...result,
    effectiveStats: Object.freeze({ ...state.player }),
    equipment: state.inventory.equipment,
  });
}
