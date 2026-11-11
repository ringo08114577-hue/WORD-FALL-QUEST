/**
 * Dungeon progression engine. Names, encounters and rewards are content data
 * in ./data/dungeons.js, while this module owns runtime progression and saves.
 */
import { GAME_ACTION, GAME_PHASE } from "./game-state.js";
import { createEnemy, getFloorEnemyIds, getLegacyFloorEnemyIds } from "./enemies.js";
import { getDungeonFloorReward } from "./game-config.js";
import { DEFAULT_DUNGEON_ID, DUNGEON_DEFINITIONS } from "./data/dungeons.js";

const CURRENT_ENCOUNTER_SET_VERSION = 2;

export function createDungeonController(
  store,
  { dungeonId: initialDungeonId = DEFAULT_DUNGEON_ID } = {},
) {
  if (!store || typeof store.getState !== "function" ||
      typeof store.dispatch !== "function") {
    throw new TypeError("dungeon controllerにはgame storeが必要です。");
  }
  if (!Object.hasOwn(DUNGEON_DEFINITIONS, initialDungeonId)) {
    throw new RangeError("登録されていないダンジョンです: " + initialDungeonId);
  }

  let dungeonId = initialDungeonId;
  let floor = 1;
  let enemyIndex = 0;
  let started = false;
  let rewardClaimed = false;
  let encounterSetVersion = CURRENT_ENCOUNTER_SET_VERSION;

  const getEncounterIds = (targetFloor = floor, version = encounterSetVersion, targetId = dungeonId) =>
    version === 1
      ? getLegacyFloorEnemyIds(targetId)
      : getFloorEnemyIds(targetFloor, targetId);

  function startCurrentEnemy() {
    const state = store.getState();
    if (![GAME_PHASE.TITLE, GAME_PHASE.VICTORY].includes(state.phase)) {
      return { started: false, reason: "invalid-phase" };
    }
    store.dispatch({
      type: GAME_ACTION.START_BATTLE,
      enemy: createEnemy(getEncounterIds()[enemyIndex], { floor }),
    });
    started = true;
    return { started: true, floor, enemyNumber: enemyIndex + 1, enemy: store.getState().enemy };
  }

  return {
    start() {
      if (started) return { started: false, reason: "already-started" };
      floor = 1;
      enemyIndex = 0;
      encounterSetVersion = CURRENT_ENCOUNTER_SET_VERSION;
      rewardClaimed = false;
      return startCurrentEnemy();
    },

    advance() {
      if (!started || store.getState().phase !== GAME_PHASE.VICTORY) {
        return { started: false, reason: "battle-not-won" };
      }
      const floorCleared = enemyIndex === getEncounterIds().length - 1;
      if (floorCleared && !rewardClaimed) {
        return { started: false, reason: "reward-not-claimed" };
      }
      if (floorCleared) {
        floor += 1;
        enemyIndex = 0;
        rewardClaimed = false;
        encounterSetVersion = CURRENT_ENCOUNTER_SET_VERSION;
      } else {
        enemyIndex += 1;
      }
      return { ...startCurrentEnemy(), floorCleared, floor, enemyNumber: enemyIndex + 1 };
    },

    selectDungeon(nextDungeonId) {
      const state = store.getState();
      if (state.phase !== GAME_PHASE.TITLE || started) {
        return { selected: false, reason: "adventure-already-started" };
      }
      if (!Object.hasOwn(DUNGEON_DEFINITIONS, nextDungeonId)) {
        return { selected: false, reason: "unknown-dungeon" };
      }
      dungeonId = nextDungeonId;
      floor = 1;
      enemyIndex = 0;
      rewardClaimed = false;
      encounterSetVersion = CURRENT_ENCOUNTER_SET_VERSION;
      return { selected: true, dungeonId, dungeon: DUNGEON_DEFINITIONS[dungeonId] };
    },

    reset() {
      floor = 1;
      enemyIndex = 0;
      started = false;
      rewardClaimed = false;
      encounterSetVersion = CURRENT_ENCOUNTER_SET_VERSION;
    },

    claimFloorReward() {
      const progress = this.getProgress();
      if (!progress.floorCleared) {
        return { claimed: false, reason: "floor-not-cleared" };
      }
      if (rewardClaimed) return { claimed: false, reason: "already-claimed" };
      const { itemId, quantity, gold } = getDungeonFloorReward(floor, dungeonId);
      store.dispatch({ type: GAME_ACTION.ADD_ITEM, itemId, quantity });
      store.dispatch({ type: GAME_ACTION.ADD_GOLD, amount: gold });
      rewardClaimed = true;
      return { claimed: true, floor, itemId, quantity, gold };
    },

    getSaveData() {
      return { dungeonId, floor, enemyIndex, started, rewardClaimed, encounterSetVersion };
    },

    isValidSaveData(data, savedGameState = store.getState()) {
      if (!data || typeof data !== "object" || Array.isArray(data)) return false;
      const savedDungeonId = data.dungeonId ?? DEFAULT_DUNGEON_ID;
      if (!Object.hasOwn(DUNGEON_DEFINITIONS, savedDungeonId)) return false;
      const version = data.encounterSetVersion ?? 1;
      if (!Number.isSafeInteger(data.floor) || data.floor < 1 ||
          !Number.isInteger(data.enemyIndex) ||
          ![1, CURRENT_ENCOUNTER_SET_VERSION].includes(version) ||
          typeof data.started !== "boolean" || typeof data.rewardClaimed !== "boolean") {
        return false;
      }

      let ids;
      try {
        ids = getEncounterIds(data.floor, version, savedDungeonId);
      } catch {
        return false;
      }
      if (data.enemyIndex < 0 || data.enemyIndex >= ids.length) return false;
      if (!data.started) {
        return data.floor === 1 && data.enemyIndex === 0 &&
          !data.rewardClaimed && savedGameState.phase === GAME_PHASE.TITLE;
      }
      if (savedGameState.phase === GAME_PHASE.TITLE || !savedGameState.enemy) return false;
      const expected = createEnemy(ids[data.enemyIndex], { floor: data.floor });
      const actual = savedGameState.enemy;
      if (actual.id !== expected.id || actual.maxHp !== expected.maxHp ||
          actual.attackPower !== expected.attackPower ||
          actual.experienceReward !== expected.experienceReward) return false;
      if (version === CURRENT_ENCOUNTER_SET_VERSION &&
          (actual.isBoss !== expected.isBoss ||
           JSON.stringify(actual.abilities) !== JSON.stringify(expected.abilities))) return false;
      if (data.rewardClaimed &&
          (data.enemyIndex !== ids.length - 1 || savedGameState.phase !== GAME_PHASE.VICTORY)) {
        return false;
      }
      return true;
    },

    restoreSaveData(data) {
      if (!this.isValidSaveData(data)) return false;
      dungeonId = data.dungeonId ?? DEFAULT_DUNGEON_ID;
      floor = data.floor;
      enemyIndex = data.enemyIndex;
      started = data.started;
      rewardClaimed = data.rewardClaimed;
      encounterSetVersion = data.encounterSetVersion ?? 1;
      return true;
    },

    getDungeonInfo() {
      return DUNGEON_DEFINITIONS[dungeonId];
    },

    getProgress() {
      return {
        floor,
        enemyNumber: enemyIndex + 1,
        enemiesPerFloor: getEncounterIds().length,
        floorCleared: started &&
          store.getState().phase === GAME_PHASE.VICTORY &&
          enemyIndex === getEncounterIds().length - 1,
        started,
        rewardClaimed,
      };
    },
  };
}

