/**
 * WORD FALL QUEST - Game state core (Step 1)
 *
 * This module owns only the overall game flow and combat HP state.
 * Letter spawning, word validation, collision detection, and RPG progression
 * will be added in later steps as separate systems.
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
  PAUSE_BATTLE: "PAUSE_BATTLE",
  RESUME_BATTLE: "RESUME_BATTLE",
  RESET_GAME: "RESET_GAME",
});

function isPositiveInteger(value) {
  return Number.isInteger(value) && value > 0;
}

function normalizeEnemy(enemy) {
  if (!enemy || typeof enemy !== "object") {
    throw new TypeError("START_BATTLEには敵データが必要です。");
  }

  const { id, name, maxHp } = enemy;
  const attackPower = enemy.attackPower === undefined ? 1 : enemy.attackPower;
  if (
    (typeof id !== "string" && typeof id !== "number") ||
    typeof name !== "string" ||
    name.trim() === "" ||
    !isPositiveInteger(maxHp) ||
    !isPositiveInteger(attackPower)
  ) {
    throw new TypeError("敵データはid・name・正の整数maxHpとattackPowerを指定してください。");
  }

  const hp = enemy.hp === undefined ? maxHp : enemy.hp;
  if (!Number.isInteger(hp) || hp < 1 || hp > maxHp) {
    throw new TypeError("敵のhpは1以上maxHp以下の整数にしてください。");
  }

  return { id, name: name.trim(), hp, maxHp, attackPower };
}

function normalizeAmount(amount) {
  return amount === undefined ? 1 : amount;
}

/**
 * Create a fresh game state.
 * The initial player HP remains 3 to match the current prototype baseline.
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
    },
    enemy: null,
    battle: {
      number: 0,
      startedAt: null,
      endedAt: null,
    },
    stats: {
      enemiesDefeated: 0,
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
      return {
        ...state,
        phase: defeated ? GAME_PHASE.VICTORY : GAME_PHASE.BATTLE,
        enemy: { ...state.enemy, hp },
        battle: {
          ...state.battle,
          endedAt: defeated ? (action.at ?? null) : state.battle.endedAt,
        },
        stats: {
          ...state.stats,
          enemiesDefeated: state.stats.enemiesDefeated + (defeated ? 1 : 0),
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
        playerMaxHp: state.player.maxHp,
        playerAttackPower: state.player.attackPower ?? 1,
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
