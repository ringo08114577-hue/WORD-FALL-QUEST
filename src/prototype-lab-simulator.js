/**
 * Isolated test-room helpers. These use the real combat resolver but never create
 * an app session, load/save player progress, or mutate the main game state.
 */
import { GAME_PHASE } from "./game-state.js";
import { GAME_CONFIG } from "./game-config.js";
import { COMBAT_EVENT, resolveCombatEvent } from "./combat.js";
import { EQUIPMENT_SLOTS, ITEM_DEFINITIONS, getEquipmentBonuses } from "./items.js";
import { createEnemy, ENEMY_DEFINITIONS } from "./enemies.js";
import { SKILL_DEFINITIONS } from "./skills.js";
import { WORD_DIFFICULTY_DEFINITIONS } from "./word-difficulty.js";

export function getPrototypePlayerBaseStats(level) {
  requirePositiveInteger(level, "プレイヤーレベル");
  return Object.freeze({
    maxHp: GAME_CONFIG.player.startingMaxHp +
      (level - 1) * GAME_CONFIG.progression.hpPerLevel,
    attackPower: GAME_CONFIG.player.startingAttackPower +
      (level - 1) * GAME_CONFIG.progression.attackPowerPerLevel,
  });
}

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

export function createPrototypeBattleState(options = {}) {
  const {
    equipment = {},
    enemy = ENEMY_DEFINITIONS["forest-dragon"],
    playerLevel,
    baseAttackPower,
    baseMaxHp,
    baseDefensePower = 0,
    skillId = "gou-basic",
  } = options;
  const levelStats = playerLevel === undefined
    ? { attackPower: 100, maxHp: 100 }
    : getPrototypePlayerBaseStats(playerLevel);
  const resolvedAttackPower = baseAttackPower ?? levelStats.attackPower;
  const resolvedMaxHp = baseMaxHp ?? levelStats.maxHp;
  requirePositiveInteger(resolvedAttackPower, "基本攻撃力");
  requirePositiveInteger(resolvedMaxHp, "基本最大HP");
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
      hp: resolvedMaxHp + equipmentBonuses.maxHpBonus,
      maxHp: resolvedMaxHp + equipmentBonuses.maxHpBonus,
      attackPower: resolvedAttackPower + equipmentBonuses.attackBonus,
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
    skillId: options.skillId ?? "gou-basic",
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


/**
 * Compare every registered enemy using the same player configuration and the
 * real combat resolver. The selected floor applies the game's normal scaling.
 */
export function comparePrototypeEnemies(options = {}) {
  const floor = options.floor ?? 1;
  requirePositiveInteger(floor, "敵の階層");
  const enemyIds = options.enemyIds ?? Object.keys(ENEMY_DEFINITIONS);
  if (!Array.isArray(enemyIds) || enemyIds.length === 0 ||
      enemyIds.some((id) => typeof id !== "string" || !Object.hasOwn(ENEMY_DEFINITIONS, id)) ||
      new Set(enemyIds).size !== enemyIds.length) {
    throw new RangeError("比較する敵IDは登録済みの重複しない一覧にしてください。");
  }

  return Object.freeze(enemyIds.map((enemyId) => {
    const enemy = createEnemy(enemyId, { floor });
    const simulationOptions = {
      ...options,
      enemy,
    };
    const outgoing = simulatePrototypeAttack(simulationOptions);
    const incoming = simulatePrototypeIncomingAttack(simulationOptions);
    const outgoingDamage = outgoing.damage;
    const incomingDamage = incoming.damage;
    if (!Number.isSafeInteger(outgoingDamage) || outgoingDamage < 1 ||
        !Number.isSafeInteger(incomingDamage) || incomingDamage < 0) {
      throw new Error("敵の比較計算に失敗しました: " + enemy.name);
    }

    return Object.freeze({
      id: enemy.id,
      name: enemy.name,
      rank: ENEMY_DEFINITIONS[enemyId].rank,
      maxHp: enemy.maxHp,
      attackPower: enemy.attackPower,
      attackElement: enemy.attackElement ?? null,
      elementalWeakness: enemy.elementalWeakness ?? null,
      elementalResistance: enemy.elementalResistance ?? null,
      playerAttackDamage: outgoingDamage,
      attacksToDefeat: Math.ceil(enemy.maxHp / outgoingDamage),
      enemyAttackDamage: incomingDamage,
      hitsToPlayerDefeat: incomingDamage > 0
        ? Math.ceil(incoming.effectiveStats.hp / incomingDamage)
        : null,
      playerMaxHp: incoming.effectiveStats.hp,
    });
  }));
}
