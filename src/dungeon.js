/**
 * WORD FALL QUEST - Dungeon progression
 *
 * A floor contains a fixed sequence of three encounters. The controller
 * coordinates battles while game-state remains the owner of player resources.
 */
import { GAME_ACTION, GAME_PHASE } from "./game-state.js";
import { createEnemy } from "./enemies.js";

const FLOOR_ENEMIES = Object.freeze(["slime", "bat", "goblin"]);

export function createDungeonController(store) {
  if (!store || typeof store.getState !== "function" || typeof store.dispatch !== "function") {
    throw new TypeError("dungeon controllerにはgame storeが必要です。");
  }

  let floor = 1;
  let enemyIndex = 0;
  let started = false;
  let rewardClaimed = false;

  function startCurrentEnemy() {
    const state = store.getState();
    if (![GAME_PHASE.TITLE, GAME_PHASE.VICTORY].includes(state.phase)) {
      return { started: false, reason: "invalid-phase" };
    }
    const enemyId = FLOOR_ENEMIES[enemyIndex];
    store.dispatch({
      type: GAME_ACTION.START_BATTLE,
      enemy: createEnemy(enemyId, { floor }),
    });
    started = true;
    return { started: true, floor, enemyNumber: enemyIndex + 1, enemy: store.getState().enemy };
  }

  return {
    start() {
      if (started) return { started: false, reason: "already-started" };
      floor = 1;
      enemyIndex = 0;
      return startCurrentEnemy();
    },

    advance() {
      if (!started || store.getState().phase !== GAME_PHASE.VICTORY) {
        return { started: false, reason: "battle-not-won" };
      }
      const floorCleared = enemyIndex === FLOOR_ENEMIES.length - 1;
      if (floorCleared && !rewardClaimed) {
        return { started: false, reason: "reward-not-claimed" };
      }
      if (floorCleared) {
        floor += 1;
        enemyIndex = 0;
        rewardClaimed = false;
      } else {
        enemyIndex += 1;
      }
      return { ...startCurrentEnemy(), floorCleared, floor, enemyNumber: enemyIndex + 1 };
    },

    reset() {
      floor = 1;
      enemyIndex = 0;
      started = false;
      rewardClaimed = false;
    },

    claimFloorReward() {
      const progress = this.getProgress();
      if (!progress.floorCleared) {
        return { claimed: false, reason: "floor-not-cleared" };
      }
      if (rewardClaimed) {
        return { claimed: false, reason: "already-claimed" };
      }
      const itemId = floor % 2 === 1 ? "small-potion" : "large-potion";
      const quantity = 1;
      const gold = 10 + floor * 5;
      store.dispatch({ type: GAME_ACTION.ADD_ITEM, itemId, quantity });
      store.dispatch({ type: GAME_ACTION.ADD_GOLD, amount: gold });
      rewardClaimed = true;
      return { claimed: true, floor, itemId, quantity, gold };
    },

    getSaveData() {
      return { floor, enemyIndex, started, rewardClaimed };
    },

    isValidSaveData(data, savedGameState = store.getState()) {
      if (!data || typeof data !== "object" || Array.isArray(data)) return false;
      if (
        !Number.isSafeInteger(data.floor) || data.floor < 1 ||
        !Number.isInteger(data.enemyIndex) ||
        data.enemyIndex < 0 || data.enemyIndex >= FLOOR_ENEMIES.length ||
        typeof data.started !== "boolean" ||
        typeof data.rewardClaimed !== "boolean"
      ) return false;

      if (!data.started) {
        return data.floor === 1 && data.enemyIndex === 0 &&
          data.rewardClaimed === false &&
          savedGameState.phase === GAME_PHASE.TITLE;
      }
      if (savedGameState.phase === GAME_PHASE.TITLE || !savedGameState.enemy) return false;
      const expectedEnemy = createEnemy(FLOOR_ENEMIES[data.enemyIndex], {
        floor: data.floor,
      });
      if (
        savedGameState.enemy.id !== expectedEnemy.id ||
        savedGameState.enemy.maxHp !== expectedEnemy.maxHp ||
        savedGameState.enemy.attackPower !== expectedEnemy.attackPower ||
        savedGameState.enemy.experienceReward !== expectedEnemy.experienceReward
      ) return false;
      if (data.rewardClaimed &&
          (data.enemyIndex !== FLOOR_ENEMIES.length - 1 ||
           savedGameState.phase !== GAME_PHASE.VICTORY)) return false;
      return true;
    },

    restoreSaveData(data) {
      if (!this.isValidSaveData(data)) return false;
      floor = data.floor;
      enemyIndex = data.enemyIndex;
      started = data.started;
      rewardClaimed = data.rewardClaimed;
      return true;
    },

    getProgress() {
      return {
        floor,
        enemyNumber: enemyIndex + 1,
        enemiesPerFloor: FLOOR_ENEMIES.length,
        floorCleared: started &&
          store.getState().phase === GAME_PHASE.VICTORY &&
          enemyIndex === FLOOR_ENEMIES.length - 1,
        started,
        rewardClaimed,
      };
    },
  };
}
