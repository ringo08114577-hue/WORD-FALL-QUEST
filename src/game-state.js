import { ITEM_DEFINITIONS, ITEM_SHOP_PRICES, EQUIPMENT_SLOTS, EQUIPMENT_SLOT_LABELS, getEquipmentBonuses, createInitialInventory } from "./items.js";
import { ENEMY_ABILITY_DEFINITIONS } from "./enemies.js";
import { GAME_CONFIG } from "./game-config.js";
import {
  SKILL_DEFINITIONS, createInitialSkillLevels, isValidSkillLevels, getSkillUpgradeCost,
  createInitialEquippedSkillIds, isValidEquippedSkillIds,
} from "./skills.js";

/**
 * WORD FALL QUEST - Game state core
 *
 * Owns the overall game flow, combat HP, and basic RPG progression.
 * Letter spawning and word validation remain separate systems.
 */

export const GAME_PHASE = Object.freeze({
  TITLE: "title",
  BATTLE: "battle",
  PAUSED: "paused",
  VICTORY: "victory",
  DEFEAT: "defeat",
});

export const GAME_ACTION = Object.freeze({
  START_BATTLE: "START_BATTLE",
  DAMAGE_PLAYER: "DAMAGE_PLAYER",
  DAMAGE_ENEMY: "DAMAGE_ENEMY",
  HEAL_PLAYER: "HEAL_PLAYER",
  USE_ITEM: "USE_ITEM",
  EQUIP_ITEM: "EQUIP_ITEM",
  PREPARE_EQUIPMENT: "PREPARE_EQUIPMENT",
  EQUIP_WEAPON: "EQUIP_WEAPON",
  EQUIP_SHIELD: "EQUIP_SHIELD",
  ADD_ITEM: "ADD_ITEM",
  ADD_GOLD: "ADD_GOLD",
  BUY_ITEM: "BUY_ITEM",
  UPGRADE_SKILL: "UPGRADE_SKILL",
  EQUIP_SKILL: "EQUIP_SKILL",
  RETURN_TO_TOWN: "RETURN_TO_TOWN",
  PAUSE_BATTLE: "PAUSE_BATTLE",
  RESUME_BATTLE: "RESUME_BATTLE",
  RESET_GAME: "RESET_GAME",
  LOG_EVENT: "LOG_EVENT",
  CLEAR_ACTION_LOG: "CLEAR_ACTION_LOG",
});

export const ACTION_LOG_CATEGORY = Object.freeze({
  BATTLE: "battle",
  COMBAT: "combat",
  SKILL: "skill",
  ITEM: "item",
  EQUIPMENT: "equipment",
  REWARD: "reward",
  PROGRESS: "progress",
  SYSTEM: "system",
});
export const ACTION_LOG_MAX_ENTRIES = 200;
const ACTION_LOG_CATEGORIES = new Set(Object.values(ACTION_LOG_CATEGORY));

function isPositiveInteger(value) {
  return Number.isSafeInteger(value) && value > 0;
}

function isNonNegativeInteger(value) {
  return Number.isSafeInteger(value) && value >= 0;
}

/** Required EXP is derived from the centralized progression balance. */
export function experienceRequiredForNextLevel(level) {
  if (!isPositiveInteger(level)) {
    throw new TypeError("levelは正の整数にしてください。");
  }
  return level * GAME_CONFIG.progression.experiencePerLevel;
}

function normalizeEnemy(enemy) {
  if (!enemy || typeof enemy !== "object") throw new TypeError("START_BATTLEには敵データが必要です。");
  const { id, name, maxHp } = enemy;
  const attackPower = enemy.attackPower === undefined ? 1 : enemy.attackPower;
  const experienceReward = enemy.experienceReward === undefined ? 0 : enemy.experienceReward;
  const abilities = enemy.abilities === undefined ? [] : enemy.abilities;
  const isBoss = enemy.isBoss === undefined ? false : enemy.isBoss;
  if (
    (typeof id !== "string" && typeof id !== "number") ||
    typeof name !== "string" || name.trim() === "" ||
    !isPositiveInteger(maxHp) || !isPositiveInteger(attackPower) ||
    !isNonNegativeInteger(experienceReward) || !Array.isArray(abilities) ||
    abilities.some((abilityId) => typeof abilityId !== "string" || !Object.hasOwn(ENEMY_ABILITY_DEFINITIONS,abilityId)) ||
    new Set(abilities).size !== abilities.length || typeof isBoss !== "boolean"
  ) throw new TypeError("敵データは有効な能力IDの配列とisBossを含む正しいステータスを指定してください。");
  const hp = enemy.hp === undefined ? maxHp : enemy.hp;
  if (!Number.isSafeInteger(hp) || hp < 1 || hp > maxHp) throw new TypeError("敵のhpは1以上maxHp以下の整数にしてください。");
  return {id,name:name.trim(),hp,maxHp,attackPower,experienceReward,abilities:[...abilities],isBoss};
}

function normalizeAmount(amount) {
  return amount === undefined ? 1 : amount;
}

/**
 * Add EXP and apply every level-up reached.
 * Each level grants +1 max HP, +1 current HP, and +1 attack power.
 */
function getEquippedWeaponBonus(inventory) {
  return getEquipmentBonuses(inventory?.equipment).attackBonus;
}

function getEquippedShieldBonus(inventory) {
  return getEquipmentBonuses(inventory?.equipment).defenseBonus;
}

function equipItem(state, action, requiredSlot = null) {
  const canEquipDuringBattle = state.phase === GAME_PHASE.BATTLE;
  const canPrepareEquipment = action.type === GAME_ACTION.PREPARE_EQUIPMENT &&
    [GAME_PHASE.TITLE, GAME_PHASE.BATTLE, GAME_PHASE.PAUSED, GAME_PHASE.VICTORY].includes(state.phase);
  if (!canEquipDuringBattle && !canPrepareEquipment) return state;
  const item = Object.hasOwn(ITEM_DEFINITIONS, action.itemId)
    ? ITEM_DEFINITIONS[action.itemId]
    : null;
  const slot = item?.slot;
  if (!item || !EQUIPMENT_SLOTS.includes(slot) ||
      (requiredSlot !== null && slot !== requiredSlot)) return state;

  const quantity = state.inventory.items[action.itemId] ?? 0;
  if (!isPositiveInteger(quantity) || state.inventory.equipment[slot] === action.itemId) {
    return state;
  }

  const previousItemId = state.inventory.equipment[slot];
  const nextItems = {
    ...state.inventory.items,
    [action.itemId]: quantity - 1,
  };
  if (previousItemId && Object.hasOwn(ITEM_DEFINITIONS, previousItemId) &&
      ITEM_DEFINITIONS[previousItemId].slot === slot) {
    nextItems[previousItemId] = (nextItems[previousItemId] ?? 0) + 1;
  }

  const equipment = {
    ...state.inventory.equipment,
    [slot]: action.itemId,
  };
  const bonuses = getEquipmentBonuses(equipment);
  return {
    ...state,
    player: {
      ...state.player,
      attackPower: state.player.baseAttackPower + bonuses.attackBonus,
      defensePower: (state.player.baseDefensePower ?? 0) + bonuses.defenseBonus,
    },
    inventory: {
      ...state.inventory,
      items: nextItems,
      equipment,
    },
  };
}

function addPlayerExperience(player, amount, inventory) {
  if (amount === 0) return player;

  let level = player.level;
  let experience = player.experience + amount;
  let nextLevelXp = player.nextLevelXp;
  let maxHp = player.maxHp;
  let hp = player.hp;
  let baseAttackPower = player.baseAttackPower ?? player.attackPower;

  while (experience >= nextLevelXp) {
    experience -= nextLevelXp;
    level += 1;
    maxHp += 1;
    hp = Math.min(maxHp, hp + 1);
    baseAttackPower += 1;
    nextLevelXp = experienceRequiredForNextLevel(level);
  }

  return {
    ...player,
    level,
    experience,
    nextLevelXp,
    maxHp,
    hp,
    baseAttackPower,
    attackPower: baseAttackPower + getEquippedWeaponBonus(inventory),
    defensePower: (player.baseDefensePower ?? 0) + getEquippedShieldBonus(inventory),
  };
}

/**
 * Create a fresh game state.
 * Initial HP remains 3 to match the current prototype baseline.
 */
export function createInitialGameState({
  playerMaxHp = GAME_CONFIG.player.startingMaxHp,
  playerAttackPower = GAME_CONFIG.player.startingAttackPower,
} = {}) {
  if (!isPositiveInteger(playerMaxHp) || !isPositiveInteger(playerAttackPower)) {
    throw new TypeError("playerMaxHpとplayerAttackPowerは正の整数にしてください。");
  }

  return {
    phase: GAME_PHASE.TITLE,
    pausedFrom: null,
    player: {
      hp: playerMaxHp,
      maxHp: playerMaxHp,
      attackPower: playerAttackPower,
      baseMaxHp: playerMaxHp,
      baseAttackPower: playerAttackPower,
      baseDefensePower: 0,
      defensePower: 0,
      startingAttackPower: playerAttackPower,
      level: 1,
      experience: 0,
      nextLevelXp: experienceRequiredForNextLevel(1),
    },
    enemy: null,
    skillLevels: createInitialSkillLevels(),
    equippedSkillIds: createInitialEquippedSkillIds(),
    inventory: { ...createInitialInventory(), gold: 0 },
    battle: {
      number: 0,
      startedAt: null,
      endedAt: null,
    },
    stats: {
      enemiesDefeated: 0,
      totalExperienceEarned: 0,
    },
    actionLog: [],
    lastBattleResult: null,
  };
}

/**
 * Pure state transition function.
 * Invalid phase transitions and invalid damage/heal amounts are ignored.
 */
export function gameReducer(state, action) {
  if (!state || !action || typeof action.type !== "string") {
    return state;
  }

  switch (action.type) {
    case GAME_ACTION.START_BATTLE: {
      if (![GAME_PHASE.TITLE, GAME_PHASE.VICTORY].includes(state.phase)) {
        return state;
      }

      const enemy = normalizeEnemy(action.enemy);
      return {
        ...state,
        phase: GAME_PHASE.BATTLE,
        pausedFrom: null,
        enemy,
        battle: {
          number: state.battle.number + 1,
          startedAt: action.at ?? null,
          endedAt: null,
        },
        lastBattleResult: null,
      };
    }

    case GAME_ACTION.DAMAGE_PLAYER: {
      if (state.phase !== GAME_PHASE.BATTLE) return state;
      const amount = normalizeAmount(action.amount);
      if (!isPositiveInteger(amount)) return state;

      const hp = Math.max(0, state.player.hp - amount);
      const defeated = hp === 0;
      return {
        ...state,
        phase: defeated ? GAME_PHASE.DEFEAT : GAME_PHASE.BATTLE,
        player: { ...state.player, hp },
        battle: {
          ...state.battle,
          endedAt: defeated ? (action.at ?? null) : state.battle.endedAt,
        },
        lastBattleResult: defeated ? "defeat" : null,
      };
    }

    case GAME_ACTION.DAMAGE_ENEMY: {
      if (state.phase !== GAME_PHASE.BATTLE || !state.enemy) return state;
      const amount = normalizeAmount(action.amount);
      if (!isPositiveInteger(amount)) return state;

      const hp = Math.max(0, state.enemy.hp - amount);
      const defeated = hp === 0;
      const experienceReward = defeated ? state.enemy.experienceReward : 0;
      const player = defeated
        ? addPlayerExperience(state.player, experienceReward, state.inventory)
        : state.player;

      return {
        ...state,
        phase: defeated ? GAME_PHASE.VICTORY : GAME_PHASE.BATTLE,
        player,
        enemy: { ...state.enemy, hp },
        battle: {
          ...state.battle,
          endedAt: defeated ? (action.at ?? null) : state.battle.endedAt,
        },
        stats: {
          ...state.stats,
          enemiesDefeated: state.stats.enemiesDefeated + (defeated ? 1 : 0),
          totalExperienceEarned:
            state.stats.totalExperienceEarned + experienceReward,
        },
        lastBattleResult: defeated ? "victory" : null,
      };
    }

    case GAME_ACTION.HEAL_PLAYER: {
      if (state.phase !== GAME_PHASE.BATTLE) return state;
      const amount = normalizeAmount(action.amount);
      if (!isPositiveInteger(amount)) return state;

      const hp = Math.min(state.player.maxHp, state.player.hp + amount);
      if (hp === state.player.hp) return state;
      return { ...state, player: { ...state.player, hp } };
    }

    case GAME_ACTION.USE_ITEM: {
      if (state.phase !== GAME_PHASE.BATTLE) return state;
      const item = Object.hasOwn(ITEM_DEFINITIONS, action.itemId)
        ? ITEM_DEFINITIONS[action.itemId]
        : null;
      if (!item || item.type !== "consumable" || item.effect !== "heal" || !isPositiveInteger(item.healAmount)) return state;

      const quantity = state.inventory.items[action.itemId] ?? 0;
      if (!isPositiveInteger(quantity) || state.player.hp >= state.player.maxHp) {
        return state;
      }

      const healedHp = Math.min(
        state.player.maxHp,
        state.player.hp + item.healAmount,
      );
      return {
        ...state,
        player: { ...state.player, hp: healedHp },
        inventory: {
          ...state.inventory,
          items: {
            ...state.inventory.items,
            [action.itemId]: quantity - 1,
          },
        },
      };
    }

    case GAME_ACTION.EQUIP_ITEM:
      return equipItem(state, action);

    // The adventurer home can prepare equipment before entering or resuming a dungeon.
    case GAME_ACTION.PREPARE_EQUIPMENT:
      return equipItem(state, action);

    // Compatibility aliases for existing callers.
    case GAME_ACTION.EQUIP_WEAPON:
      return equipItem(state, action, "weapon");

    case GAME_ACTION.EQUIP_SHIELD:
      return equipItem(state, action, "shield");

    case GAME_ACTION.ADD_ITEM: {
      const item = Object.hasOwn(ITEM_DEFINITIONS, action.itemId)
        ? ITEM_DEFINITIONS[action.itemId]
        : null;
      const quantity = action.quantity === undefined ? 1 : action.quantity;
      if (!item || !isPositiveInteger(quantity)) return state;
      const nextQuantity = (state.inventory.items[action.itemId] ?? 0) + quantity;
      if (!isNonNegativeInteger(nextQuantity)) return state;
      return {
        ...state,
        inventory: {
          ...state.inventory,
          items: {
            ...state.inventory.items,
            [action.itemId]: nextQuantity,
          },
        },
      };
    }

    case GAME_ACTION.ADD_GOLD: {
      const amount = action.amount;
      if (!isPositiveInteger(amount)) return state;
      const nextGold = state.inventory.gold + amount;
      if (!isNonNegativeInteger(nextGold)) return state;
      return {
        ...state,
        inventory: { ...state.inventory, gold: nextGold },
      };
    }

    case GAME_ACTION.BUY_ITEM: {
      if (![GAME_PHASE.TITLE, GAME_PHASE.PAUSED, GAME_PHASE.VICTORY].includes(state.phase)) return state;
      const itemExists = Object.hasOwn(ITEM_DEFINITIONS, action.itemId);
      const priceExists = Object.hasOwn(ITEM_SHOP_PRICES, action.itemId);
      const item = itemExists ? ITEM_DEFINITIONS[action.itemId] : null;
      const cost = action.cost;
      const expectedCost = priceExists ? ITEM_SHOP_PRICES[action.itemId] : null;
      const nextQuantity = (state.inventory.items[action.itemId] ?? 0) + 1;
      if (
        !item ||
        expectedCost === null ||
        cost !== expectedCost ||
        !isPositiveInteger(cost) ||
        state.inventory.gold < cost ||
        !isNonNegativeInteger(nextQuantity)
      ) {
        return state;
      }
      return {
        ...state,
        inventory: {
          ...state.inventory,
          gold: state.inventory.gold - cost,
          items: {
            ...state.inventory.items,
            [action.itemId]: nextQuantity,
          },
        },
      };
    }

    case GAME_ACTION.UPGRADE_SKILL: {
      if (![GAME_PHASE.TITLE, GAME_PHASE.PAUSED, GAME_PHASE.VICTORY].includes(state.phase)) return state;
      const skillId = action.skillId;
      if (!Object.hasOwn(SKILL_DEFINITIONS, skillId)) return state;
      const currentLevel = state.skillLevels?.[skillId];
      const cost = getSkillUpgradeCost(skillId, currentLevel);
      if (cost === null || state.inventory.gold < cost) return state;
      return {
        ...state,
        skillLevels: {
          ...state.skillLevels,
          [skillId]: currentLevel + 1,
        },
        inventory: {
          ...state.inventory,
          gold: state.inventory.gold - cost,
        },
      };
    }

    case GAME_ACTION.EQUIP_SKILL: {
      if (state.phase !== GAME_PHASE.TITLE) return state;
      const slotIndex = action.slotIndex;
      const skillId = action.skillId;
      if (!Number.isInteger(slotIndex) || slotIndex < 0 || slotIndex >= state.equippedSkillIds.length ||
          (skillId !== null && (typeof skillId !== "string" || !Object.hasOwn(SKILL_DEFINITIONS, skillId)))) return state;
      if (skillId !== null && state.equippedSkillIds.some((id, index) => index !== slotIndex && id === skillId)) return state;
      if (skillId === null && state.equippedSkillIds[slotIndex] !== null &&
          state.equippedSkillIds.filter((id) => id !== null).length <= 1) return state;
      if (state.equippedSkillIds[slotIndex] === skillId) return state;
      const equippedSkillIds = [...state.equippedSkillIds];
      equippedSkillIds[slotIndex] = skillId;
      return { ...state, equippedSkillIds };
    }

    case GAME_ACTION.RETURN_TO_TOWN: {
      if (state.phase === GAME_PHASE.TITLE &&
          state.player.hp === state.player.maxHp && state.enemy === null) return state;
      return {
        ...state,
        phase: GAME_PHASE.TITLE,
        pausedFrom: null,
        player: { ...state.player, hp: state.player.maxHp },
        enemy: null,
        lastBattleResult: null,
      };
    }

    case GAME_ACTION.PAUSE_BATTLE:
      if (state.phase !== GAME_PHASE.BATTLE) return state;
      return {
        ...state,
        phase: GAME_PHASE.PAUSED,
        pausedFrom: GAME_PHASE.BATTLE,
      };

    case GAME_ACTION.RESUME_BATTLE:
      if (state.phase !== GAME_PHASE.PAUSED) return state;
      return {
        ...state,
        phase: state.pausedFrom ?? GAME_PHASE.BATTLE,
        pausedFrom: null,
      };

    case GAME_ACTION.CLEAR_ACTION_LOG:
      if (state.actionLog.length === 0) return state;
      return { ...state, actionLog: [] };

    case GAME_ACTION.RESET_GAME:
      return createInitialGameState({
        playerMaxHp: state.player.baseMaxHp ?? state.player.maxHp,
        playerAttackPower: state.player.startingAttackPower ?? state.player.baseAttackPower ?? state.player.attackPower,
      });

    default:
      return state;
  }
}

function isValidActionLog(entries) {
  if (!Array.isArray(entries) || entries.length > ACTION_LOG_MAX_ENTRIES) return false;
  let previousId = 0;
  return entries.every((entry) => {
    if (!entry || typeof entry !== "object" || Array.isArray(entry) ||
        !isPositiveInteger(entry.id) || entry.id <= previousId ||
        !isNonNegativeInteger(entry.timestamp) || entry.timestamp > 8_640_000_000_000_000 ||
        !ACTION_LOG_CATEGORIES.has(entry.category) ||
        typeof entry.message !== "string" || entry.message.trim() === "" ||
        entry.message.length > 180) return false;
    previousId = entry.id;
    return true;
  });
}

function appendActionLog(state, payload, timestamp = Date.now()) {
  const previous = Array.isArray(state.actionLog) ? state.actionLog : [];
  const lastId = previous.at(-1)?.id ?? 0;
  const safeTimestamp = isNonNegativeInteger(timestamp) ? timestamp : Date.now();
  const entry = {
    id: lastId + 1,
    timestamp: safeTimestamp,
    category: payload.category,
    message: payload.message.trim().slice(0, 180),
  };
  return {
    ...state,
    actionLog: [...previous, entry].slice(-ACTION_LOG_MAX_ENTRIES),
  };
}

function describeActionLog(action, before, after) {
  if (!action || before === after) return null;
  const item = Object.hasOwn(ITEM_DEFINITIONS, action.itemId)
    ? ITEM_DEFINITIONS[action.itemId]
    : null;
  switch (action.type) {
    case GAME_ACTION.START_BATTLE: {
      const context = action.context && typeof action.context === "object" ? action.context : {};
      const location = typeof context.dungeonName === "string"
        ? context.dungeonName + " " + context.floor + "階 · "
        : "";
      const number = Number.isSafeInteger(context.enemyNumber) ? context.enemyNumber + "体目 · " : "";
      return { category: ACTION_LOG_CATEGORY.BATTLE,
        message: location + number + (after.enemy?.name ?? "敵") + "に遭遇した！" };
    }
    case GAME_ACTION.DAMAGE_PLAYER: {
      const amount = before.player.hp - after.player.hp;
      if (amount <= 0) return null;
      const reason = typeof action.logReason === "string" && action.logReason.trim()
        ? action.logReason.trim() + "で"
        : "";
      return { category: ACTION_LOG_CATEGORY.COMBAT,
        message: reason + "HP -" + amount + "（残り " + after.player.hp + "）" };
    }
    case GAME_ACTION.DAMAGE_ENEMY: {
      const amount = before.enemy?.hp - after.enemy?.hp;
      if (!Number.isSafeInteger(amount) || amount <= 0) return null;
      return {
        category: ACTION_LOG_CATEGORY.COMBAT,
        message: after.enemy?.hp === 0
          ? (before.enemy?.name ?? "敵") + "を撃破！ EXP +" + (after.enemy?.experienceReward ?? 0)
          : (before.enemy?.name ?? "敵") + "に " + amount + " ダメージ",
      };
    }
    case GAME_ACTION.HEAL_PLAYER: {
      const amount = after.player.hp - before.player.hp;
      return amount > 0 ? {
        category: ACTION_LOG_CATEGORY.ITEM,
        message: "HPを " + amount + " 回復（" + after.player.hp + " / " + after.player.maxHp + "）",
      } : null;
    }
    case GAME_ACTION.USE_ITEM: {
      const amount = after.player.hp - before.player.hp;
      return item && amount > 0 ? {
        category: ACTION_LOG_CATEGORY.ITEM,
        message: item.name + "を使用（HP +" + amount + "）",
      } : null;
    }
    case GAME_ACTION.EQUIP_ITEM:
    case GAME_ACTION.PREPARE_EQUIPMENT:
    case GAME_ACTION.EQUIP_WEAPON:
    case GAME_ACTION.EQUIP_SHIELD: {
      const slot = item?.slot;
      return slot && after.inventory.equipment[slot] === action.itemId ? {
        category: ACTION_LOG_CATEGORY.EQUIPMENT,
        message: item.name + "を" + (EQUIPMENT_SLOT_LABELS[slot] ?? "装備") + "に装備",
      } : null;
    }
    case GAME_ACTION.ADD_ITEM:
      return item ? {
        category: ACTION_LOG_CATEGORY.REWARD,
        message: (typeof action.sourceLabel === "string" && action.sourceLabel
          ? action.sourceLabel + "：" : "") +
          item.name + " ×" + (action.quantity ?? 1) + "を手に入れた！",
      } : null;
    case GAME_ACTION.ADD_GOLD:
      return isPositiveInteger(action.amount) ? {
        category: ACTION_LOG_CATEGORY.REWARD,
        message: (typeof action.sourceLabel === "string" && action.sourceLabel
          ? action.sourceLabel + "：" : "") + action.amount + "Gを手に入れた！",
      } : null;
    case GAME_ACTION.BUY_ITEM:
      return item ? {
        category: ACTION_LOG_CATEGORY.ITEM,
        message: item.name + "を購入（-" + action.cost + "G）",
      } : null;
    case GAME_ACTION.UPGRADE_SKILL: {
      const skill = SKILL_DEFINITIONS[action.skillId];
      return skill ? {
        category: ACTION_LOG_CATEGORY.SKILL,
        message: skill.name + "をLv." + after.skillLevels[action.skillId] + "に強化（-" +
          (before.inventory.gold - after.inventory.gold) + "G）",
      } : null;
    }
    case GAME_ACTION.EQUIP_SKILL: {
      const skill = action.skillId ? SKILL_DEFINITIONS[action.skillId] : null;
      return {
        category: ACTION_LOG_CATEGORY.SKILL,
        message: "スキル枠 " + (action.slotIndex + 1) + " を" + (skill?.name ?? "未装備") + "に変更",
      };
    }
    case GAME_ACTION.RETURN_TO_TOWN: {
      const healed = after.player.hp - before.player.hp;
      return {
        category: ACTION_LOG_CATEGORY.PROGRESS,
        message: "街に帰還" + (healed > 0 ? "（HP +" + healed + "）" : ""),
      };
    }
    case GAME_ACTION.PAUSE_BATTLE:
      return { category: ACTION_LOG_CATEGORY.BATTLE, message: "バトルを一時停止" };
    case GAME_ACTION.RESUME_BATTLE:
      return { category: ACTION_LOG_CATEGORY.BATTLE, message: "バトルを再開" };
    default:
      return null;
  }
}

function deepFreeze(value) {
  if (value && typeof value === "object" && !Object.isFrozen(value)) {
    Object.freeze(value);
    Object.values(value).forEach(deepFreeze);
  }
  return value;
}


/** Validate a game state loaded from an external save file. */
export function isValidSavedGameState(saved) {
  if (!saved || typeof saved !== "object" || Array.isArray(saved)) return false;
  if (!Object.values(GAME_PHASE).includes(saved.phase)) return false;
  if (!saved.player || !saved.inventory || !saved.battle || !saved.stats) return false;

  const p = saved.player;
  const inv = saved.inventory;
  const items = inv.items;
  const equipment = inv.equipment;
  const equipmentBonuses = getEquipmentBonuses(equipment ?? {});
  const seenEquippedItems = new Set();
  let equipmentValid = Boolean(equipment && typeof equipment === "object" && !Array.isArray(equipment));
  if (equipmentValid) {
    for (const slot of EQUIPMENT_SLOTS) {
      if (!Object.hasOwn(equipment, slot)) {
        equipmentValid = false;
        continue;
      }
      const itemId = equipment[slot];
      if (itemId === null) continue;
      const item = typeof itemId === "string" && Object.hasOwn(ITEM_DEFINITIONS, itemId)
        ? ITEM_DEFINITIONS[itemId]
        : null;
      if (!item || item.slot !== slot || seenEquippedItems.has(itemId)) {
        equipmentValid = false;
      } else {
        seenEquippedItems.add(itemId);
      }
    }
    if (Object.keys(equipment).some((slot) => !EQUIPMENT_SLOTS.includes(slot))) {
      equipmentValid = false;
    }
  }

  if (
    !isPositiveInteger(p.level) ||
    !isNonNegativeInteger(p.experience) ||
    p.nextLevelXp !== experienceRequiredForNextLevel(p.level) ||
    p.experience >= p.nextLevelXp ||
    !isPositiveInteger(p.baseMaxHp) ||
    !isPositiveInteger(p.baseAttackPower) ||
    !isNonNegativeInteger(p.baseDefensePower) ||
    !isPositiveInteger(p.startingAttackPower) ||
    p.baseAttackPower !== p.startingAttackPower + p.level - 1 ||
    p.maxHp !== p.baseMaxHp + p.level - 1 ||
    !isNonNegativeInteger(p.hp) || p.hp > p.maxHp ||
    p.attackPower !== p.baseAttackPower + equipmentBonuses.attackBonus ||
    p.defensePower !== p.baseDefensePower + equipmentBonuses.defenseBonus ||
    !items || typeof items !== "object" || Array.isArray(items) ||
    !isValidSkillLevels(saved.skillLevels) ||
    !isValidEquippedSkillIds(saved.equippedSkillIds) ||
    !isValidActionLog(saved.actionLog) ||
    !equipmentValid ||
    !isNonNegativeInteger(inv.gold)
  ) return false;

  for (const key of Object.keys(items)) {
    if (!Object.hasOwn(ITEM_DEFINITIONS, key) || !isNonNegativeInteger(items[key])) return false;
  }
  for (const key of Object.keys(ITEM_DEFINITIONS)) {
    if (items[key] === undefined) return false;
  }

  if (
    !isNonNegativeInteger(saved.battle.number) ||
    !isNonNegativeInteger(saved.stats.enemiesDefeated) ||
    !isNonNegativeInteger(saved.stats.totalExperienceEarned)
  ) return false;
  const validTime = (value) => value === null ||
    typeof value === "string" || (typeof value === "number" && Number.isFinite(value));
  if (!validTime(saved.battle.startedAt) || !validTime(saved.battle.endedAt)) return false;

  const enemy = saved.enemy;
  if (saved.phase === GAME_PHASE.TITLE) {
    if (enemy !== null || saved.lastBattleResult !== null || p.hp === 0 || saved.pausedFrom !== null) return false;
  } else {
    if (
      !enemy || typeof enemy !== "object" ||
      (typeof enemy.id !== "string" && typeof enemy.id !== "number") ||
      typeof enemy.name !== "string" || enemy.name.trim() === "" ||
      !isPositiveInteger(enemy.maxHp) ||
      !isNonNegativeInteger(enemy.hp) || enemy.hp > enemy.maxHp ||
      !isPositiveInteger(enemy.attackPower) ||
      !isNonNegativeInteger(enemy.experienceReward) ||
      !Array.isArray(enemy.abilities) ||
      enemy.abilities.some((abilityId) => typeof abilityId !== "string" || !Object.hasOwn(ENEMY_ABILITY_DEFINITIONS,abilityId)) ||
      new Set(enemy.abilities).size !== enemy.abilities.length ||
      typeof enemy.isBoss !== "boolean"
    ) return false;
  }

  if (saved.phase === GAME_PHASE.BATTLE &&
      (p.hp < 1 || enemy.hp < 1 || saved.pausedFrom !== null || saved.lastBattleResult !== null)) return false;
  if (saved.phase === GAME_PHASE.PAUSED &&
      (p.hp < 1 || enemy.hp < 1 || saved.pausedFrom !== GAME_PHASE.BATTLE || saved.lastBattleResult !== null)) return false;
  if (saved.phase === GAME_PHASE.VICTORY &&
      (p.hp < 1 || enemy.hp !== 0 || saved.pausedFrom !== null || saved.lastBattleResult !== "victory")) return false;
  if (saved.phase === GAME_PHASE.DEFEAT &&
      (p.hp !== 0 || saved.pausedFrom !== null || saved.lastBattleResult !== "defeat")) return false;
  return true;
}

function copySavedGameState(saved) {
  return {
    phase: saved.phase,
    pausedFrom: saved.pausedFrom,
    skillLevels: { ...saved.skillLevels },
    equippedSkillIds: [...saved.equippedSkillIds],
    player: {
      hp: saved.player.hp,
      maxHp: saved.player.maxHp,
      attackPower: saved.player.attackPower,
      baseMaxHp: saved.player.baseMaxHp,
      baseAttackPower: saved.player.baseAttackPower,
      baseDefensePower: saved.player.baseDefensePower,
      defensePower: saved.player.defensePower,
      startingAttackPower: saved.player.startingAttackPower,
      level: saved.player.level,
      experience: saved.player.experience,
      nextLevelXp: saved.player.nextLevelXp,
    },
    enemy: saved.enemy ? {
      id: saved.enemy.id,
      name: saved.enemy.name,
      hp: saved.enemy.hp,
      maxHp: saved.enemy.maxHp,
      attackPower: saved.enemy.attackPower,
      experienceReward: saved.enemy.experienceReward,
      abilities: [...saved.enemy.abilities],
      isBoss: saved.enemy.isBoss,
    } : null,
    inventory: {
      items: Object.fromEntries(Object.keys(ITEM_DEFINITIONS).map(
        (key) => [key, saved.inventory.items[key]],
      )),
      equipment: Object.fromEntries(EQUIPMENT_SLOTS.map((slot) => [
        slot,
        saved.inventory.equipment[slot] ?? null,
      ])),
      gold: saved.inventory.gold,
    },
    battle: {
      number: saved.battle.number,
      startedAt: saved.battle.startedAt,
      endedAt: saved.battle.endedAt,
    },
    stats: {
      enemiesDefeated: saved.stats.enemiesDefeated,
      totalExperienceEarned: saved.stats.totalExperienceEarned,
    },
    actionLog: saved.actionLog.map((entry) => ({ ...entry })),
    lastBattleResult: saved.lastBattleResult,
  };
}

/**
 * Small store for the browser UI and future game systems.
 * Subscribers are notified only when the state actually changes.
 */
export function createGameStore(options = {}) {
  let state = deepFreeze(createInitialGameState(options));
  const listeners = new Set();

  return {
    getState() {
      return state;
    },

    isValidState(savedState) {
      return isValidSavedGameState(savedState);
    },

    restoreState(savedState) {
      if (!isValidSavedGameState(savedState)) return false;
      state = deepFreeze(copySavedGameState(savedState));
      for (const listener of listeners) listener(state, null);
      return true;
    },

    dispatch(action) {
      if (action?.type === GAME_ACTION.LOG_EVENT) {
        const category = action.category;
        const message = action.message;
        if (!ACTION_LOG_CATEGORIES.has(category) ||
            typeof message !== "string" || message.trim() === "") return state;
        state = deepFreeze(appendActionLog(state, { category, message },
          action.timestamp ?? Date.now()));
        for (const listener of listeners) listener(state, action);
        return state;
      }

      const previousState = state;
      const nextState = gameReducer(state, action);
      if (nextState !== state) {
        const entry = describeActionLog(action, previousState, nextState);
        const withLog = entry
          ? appendActionLog(nextState, entry, action?.timestamp ?? Date.now())
          : nextState;
        state = deepFreeze(withLog);
        for (const listener of listeners) {
          listener(state, action);
        }
      }
      return state;
    },

    subscribe(listener) {
      if (typeof listener !== "function") {
        throw new TypeError("subscribeには関数を渡してください。");
      }
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
  };
}
