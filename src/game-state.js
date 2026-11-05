import { ITEM_DEFINITIONS, createInitialInventory } from "./items.js";

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
  EQUIP_WEAPON: "EQUIP_WEAPON",
  PAUSE_BATTLE: "PAUSE_BATTLE",
  RESUME_BATTLE: "RESUME_BATTLE",
  RESET_GAME: "RESET_GAME",
});

function isPositiveInteger(value) {
  return Number.isSafeInteger(value) && value > 0;
}

function isNonNegativeInteger(value) {
  return Number.isSafeInteger(value) && value >= 0;
}

/** Required EXP grows by 10 for each current level. */
export function experienceRequiredForNextLevel(level) {
  if (!isPositiveInteger(level)) {
    throw new TypeError("levelは正の整数にしてください。");
  }
  return level * 10;
}

function normalizeEnemy(enemy) {
  if (!enemy || typeof enemy !== "object") {
    throw new TypeError("START_BATTLEには敵データが必要です。");
  }

  const { id, name, maxHp } = enemy;
  const attackPower = enemy.attackPower === undefined ? 1 : enemy.attackPower;
  const experienceReward =
    enemy.experienceReward === undefined ? 0 : enemy.experienceReward;

  if (
    (typeof id !== "string" && typeof id !== "number") ||
    typeof name !== "string" ||
    name.trim() === "" ||
    !isPositiveInteger(maxHp) ||
    !isPositiveInteger(attackPower) ||
    !isNonNegativeInteger(experienceReward)
  ) {
    throw new TypeError(
      "敵データはid・name・正の整数maxHpとattackPower、0以上の整数experienceRewardを指定してください。",
    );
  }

  const hp = enemy.hp === undefined ? maxHp : enemy.hp;
  if (!Number.isSafeInteger(hp) || hp < 1 || hp > maxHp) {
    throw new TypeError("敵のhpは1以上maxHp以下の整数にしてください。");
  }

  return {
    id,
    name: name.trim(),
    hp,
    maxHp,
    attackPower,
    experienceReward,
  };
}

function normalizeAmount(amount) {
  return amount === undefined ? 1 : amount;
}

/**
 * Add EXP and apply every level-up reached.
 * Each level grants +1 max HP, +1 current HP, and +1 attack power.
 */
function getEquippedWeaponBonus(inventory) {
  const weaponId = inventory?.equipment?.weapon;
  return ITEM_DEFINITIONS[weaponId]?.attackBonus ?? 0;
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
  };
}

/**
 * Create a fresh game state.
 * Initial HP remains 3 to match the current prototype baseline.
 */
export function createInitialGameState({
  playerMaxHp = 3,
  playerAttackPower = 1,
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
      startingAttackPower: playerAttackPower,
      level: 1,
      experience: 0,
      nextLevelXp: experienceRequiredForNextLevel(1),
    },
    enemy: null,
    inventory: createInitialInventory(),
    battle: {
      number: 0,
      startedAt: null,
      endedAt: null,
    },
    stats: {
      enemiesDefeated: 0,
      totalExperienceEarned: 0,
    },
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
      const item = ITEM_DEFINITIONS[action.itemId];
      if (!item || item.type !== "consumable" || item.effect !== "heal") return state;

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

    case GAME_ACTION.EQUIP_WEAPON: {
      if (state.phase !== GAME_PHASE.BATTLE) return state;
      const item = ITEM_DEFINITIONS[action.itemId];
      if (!item || item.type !== "weapon" || !isPositiveInteger(item.attackBonus)) {
        return state;
      }

      const quantity = state.inventory.items[action.itemId] ?? 0;
      if (!isPositiveInteger(quantity)) return state;
      if (state.inventory.equipment.weapon === action.itemId) return state;

      const previousWeaponId = state.inventory.equipment.weapon;
      const previousWeapon = ITEM_DEFINITIONS[previousWeaponId];
      const nextItems = {
        ...state.inventory.items,
        [action.itemId]: quantity - 1,
      };
      if (previousWeapon?.type === "weapon") {
        nextItems[previousWeaponId] =
          (nextItems[previousWeaponId] ?? 0) + 1;
      }

      return {
        ...state,
        player: {
          ...state.player,
          attackPower: state.player.baseAttackPower + item.attackBonus,
        },
        inventory: {
          ...state.inventory,
          items: nextItems,
          equipment: {
            ...state.inventory.equipment,
            weapon: action.itemId,
          },
        },
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

    case GAME_ACTION.RESET_GAME:
      return createInitialGameState({
        playerMaxHp: state.player.baseMaxHp ?? state.player.maxHp,
        playerAttackPower: state.player.startingAttackPower ?? state.player.baseAttackPower ?? state.player.attackPower,
      });

    default:
      return state;
  }
}

function deepFreeze(value) {
  if (value && typeof value === "object" && !Object.isFrozen(value)) {
    Object.freeze(value);
    Object.values(value).forEach(deepFreeze);
  }
  return value;
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

    dispatch(action) {
      const nextState = gameReducer(state, action);
      if (nextState !== state) {
        state = deepFreeze(nextState);
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
