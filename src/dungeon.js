/**
 * Dungeon progression engine.
 * Each dungeon keeps its own unlocked floor and clear record.
 */
import { GAME_ACTION, GAME_PHASE } from "./game-state.js";
import { createEnemy, getFloorEnemyIds, getLegacyFloorEnemyIds } from "./enemies.js";
import { getDungeonFloorReward } from "./game-config.js";
import { DEFAULT_DUNGEON_ID, DUNGEON_DEFINITIONS } from "./data/dungeons.js";

export const CURRENT_ENCOUNTER_SET_VERSION = 3;
export const MAX_DUNGEON_FLOORS = 5;

const dungeonIds = Object.keys(DUNGEON_DEFINITIONS);
const isRecord = (value) => Boolean(value && typeof value === "object" && !Array.isArray(value));

function getFloorCount(dungeonId) {
  return DUNGEON_DEFINITIONS[dungeonId]?.floorCount ?? MAX_DUNGEON_FLOORS;
}

function initialUnlockedFloors() {
  return Object.fromEntries(dungeonIds.map((id) => [id, 1]));
}

function initialCompletedDungeons() {
  return Object.fromEntries(dungeonIds.map((id) => [id, false]));
}

function getLegacyV2EncounterIds(floor, dungeonId) {
  const dungeonInfo = DUNGEON_DEFINITIONS[dungeonId];
  const sets = dungeonInfo?.legacyEncounterSetsV2;
  if (!Array.isArray(sets) || sets.length === 0) {
    throw new RangeError("旧編成に対応していないダンジョンです: " + dungeonId);
  }
  return [...sets[(floor - 1) % sets.length]];
}

function normalizedProgressMap(raw, fallbackFactory, validateValue) {
  const fallback = fallbackFactory();
  if (raw === undefined) return fallback;
  if (!isRecord(raw) || Object.keys(raw).some((id) => !Object.hasOwn(DUNGEON_DEFINITIONS, id))) {
    return null;
  }
  for (const id of dungeonIds) {
    const value = raw[id] ?? fallback[id];
    if (!validateValue(value, id)) return null;
    fallback[id] = value;
  }
  return fallback;
}

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
  let unlockedFloors = initialUnlockedFloors();
  let completedDungeons = initialCompletedDungeons();

  const getEncounterIds = (targetFloor = floor, version = encounterSetVersion, targetId = dungeonId) => {
    if (version === 1) return getLegacyFloorEnemyIds(targetId);
    if (version === 2) return getLegacyV2EncounterIds(targetFloor, targetId);
    return getFloorEnemyIds(targetFloor, targetId);
  };

  function startCurrentEnemy() {
    const state = store.getState();
    if (![GAME_PHASE.TITLE, GAME_PHASE.VICTORY].includes(state.phase)) {
      return { started: false, reason: "invalid-phase" };
    }
    const ids = getEncounterIds();
    if (enemyIndex < 0 || enemyIndex >= ids.length) {
      return { started: false, reason: "invalid-enemy-index" };
    }
    store.dispatch({
      type: GAME_ACTION.START_BATTLE,
      enemy: createEnemy(ids[enemyIndex], { floor }),
      context: {
        dungeonName: DUNGEON_DEFINITIONS[dungeonId].name,
        floor,
        enemyNumber: enemyIndex + 1,
      },
    });
    started = true;
    return {
      started: true,
      floor,
      enemyNumber: enemyIndex + 1,
      enemy: store.getState().enemy,
      dungeonId,
    };
  }

  return {
    start() {
      if (started) return { started: false, reason: "already-started" };
      if (floor > unlockedFloors[dungeonId]) {
        return { started: false, reason: "floor-locked" };
      }
      enemyIndex = 0;
      rewardClaimed = false;
      encounterSetVersion = CURRENT_ENCOUNTER_SET_VERSION;
      return startCurrentEnemy();
    },

    advance() {
      if (!started || store.getState().phase !== GAME_PHASE.VICTORY) {
        return { started: false, reason: "battle-not-won" };
      }
      const ids = getEncounterIds();
      const floorCleared = enemyIndex === ids.length - 1;
      if (floorCleared && !rewardClaimed) {
        return { started: false, reason: "reward-not-claimed" };
      }
      if (floorCleared) {
        if (floor >= getFloorCount(dungeonId)) {
          completedDungeons[dungeonId] = true;
          store.dispatch({
            type: GAME_ACTION.LOG_EVENT,
            category: "progress",
            message: DUNGEON_DEFINITIONS[dungeonId].name + "を制覇！",
          });
          return { started: false, reason: "dungeon-cleared", floor, dungeonId };
        }
        floor += 1;
        unlockedFloors[dungeonId] = Math.max(unlockedFloors[dungeonId], floor);
        store.dispatch({
          type: GAME_ACTION.LOG_EVENT,
          category: "progress",
          message: DUNGEON_DEFINITIONS[dungeonId].name + " " + floor + "階が解放された",
        });
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
      store.dispatch({
        type: GAME_ACTION.LOG_EVENT,
        category: "progress",
        message: DUNGEON_DEFINITIONS[dungeonId].name + "を探索先に選択",
      });
      return { selected: true, dungeonId, dungeon: DUNGEON_DEFINITIONS[dungeonId] };
    },

    selectFloor(nextFloor) {
      const state = store.getState();
      if (state.phase !== GAME_PHASE.TITLE || started) {
        return { selected: false, reason: "adventure-already-started" };
      }
      if (!Number.isSafeInteger(nextFloor) || nextFloor < 1 ||
          nextFloor > getFloorCount(dungeonId)) {
        return { selected: false, reason: "invalid-floor" };
      }
      if (nextFloor > unlockedFloors[dungeonId]) {
        return { selected: false, reason: "floor-locked" };
      }
      floor = nextFloor;
      enemyIndex = 0;
      rewardClaimed = false;
      encounterSetVersion = CURRENT_ENCOUNTER_SET_VERSION;
      store.dispatch({
        type: GAME_ACTION.LOG_EVENT,
        category: "progress",
        message: DUNGEON_DEFINITIONS[dungeonId].name + " " + floor + "階を選択",
      });
      return { selected: true, dungeonId, floor };
    },

    /**
     * Leaving for town abandons only the current floor attempt.
     * The selected floor and each dungeon's unlocked progress remain intact.
     */
    exitToTown() {
      const previous = { started, floor, enemyIndex, rewardClaimed };
      started = false;
      enemyIndex = 0;
      rewardClaimed = false;
      encounterSetVersion = CURRENT_ENCOUNTER_SET_VERSION;
      if (floor > getFloorCount(dungeonId)) floor = getFloorCount(dungeonId);
      if (previous.started) {
        store.dispatch({
          type: GAME_ACTION.LOG_EVENT,
          category: "progress",
          message: DUNGEON_DEFINITIONS[dungeonId].name + " " + previous.floor + "階への挑戦を中断",
        });
      }
      return { exited: true, ...previous, dungeonId, floor };
    },

    reset() {
      // Used after a defeat: retry the selected floor from its first enemy.
      started = false;
      enemyIndex = 0;
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
      store.dispatch({
        type: GAME_ACTION.ADD_ITEM, itemId, quantity, sourceLabel: "宝箱から",
      });
      store.dispatch({
        type: GAME_ACTION.ADD_GOLD, amount: gold, sourceLabel: "宝箱から",
      });

      // The dungeon clear bonus is awarded once per dungeon, after the final
      // floor's boss treasure is claimed. Ordinary floor rewards remain repeatable.
      const isFirstDungeonClear = floor === getFloorCount(dungeonId) &&
        completedDungeons[dungeonId] !== true;
      const clearReward = isFirstDungeonClear
        ? DUNGEON_DEFINITIONS[dungeonId].clearReward ?? null
        : null;
      if (clearReward) {
        store.dispatch({
          type: GAME_ACTION.ADD_ITEM,
          itemId: clearReward.itemId,
          quantity: clearReward.quantity,
          sourceLabel: "初回制覇報酬",
        });
        if (clearReward.gold > 0) {
          store.dispatch({
            type: GAME_ACTION.ADD_GOLD,
            amount: clearReward.gold,
            sourceLabel: "初回制覇報酬",
          });
        }
      }

      rewardClaimed = true;
      if (floor < getFloorCount(dungeonId)) {
        unlockedFloors[dungeonId] = Math.max(unlockedFloors[dungeonId], floor + 1);
      } else {
        completedDungeons[dungeonId] = true;
      }
      return {
        claimed: true, floor, itemId, quantity, gold, dungeonId,
        firstClearReward: clearReward ? { ...clearReward } : null,
      };
    },

    getSaveData() {
      return {
        dungeonId, floor, enemyIndex, started, rewardClaimed, encounterSetVersion,
        unlockedFloors: { ...unlockedFloors },
        completedDungeons: { ...completedDungeons },
      };
    },

    isValidSaveData(data, savedGameState = store.getState()) {
      if (!isRecord(data)) return false;
      const savedDungeonId = data.dungeonId ?? DEFAULT_DUNGEON_ID;
      if (!Object.hasOwn(DUNGEON_DEFINITIONS, savedDungeonId)) return false;
      const version = data.encounterSetVersion ?? 1;
      if (!Number.isSafeInteger(data.floor) || data.floor < 1 ||
          !Number.isSafeInteger(data.enemyIndex) || data.enemyIndex < 0 ||
          ![1, 2, CURRENT_ENCOUNTER_SET_VERSION].includes(version) ||
          typeof data.started !== "boolean" || typeof data.rewardClaimed !== "boolean") {
        return false;
      }

      const floors = normalizedProgressMap(
        data.unlockedFloors,
        initialUnlockedFloors,
        (value, id) => Number.isSafeInteger(value) && value >= 1 &&
          value <= getFloorCount(id),
      );
      const cleared = normalizedProgressMap(
        data.completedDungeons,
        initialCompletedDungeons,
        (value) => typeof value === "boolean",
      );
      if (!floors || !cleared) return false;
      if (version === CURRENT_ENCOUNTER_SET_VERSION &&
          data.floor > getFloorCount(savedDungeonId)) return false;
      if (data.floor > floors[savedDungeonId] && version === CURRENT_ENCOUNTER_SET_VERSION) return false;

      let ids;
      try {
        ids = getEncounterIds(data.floor, version, savedDungeonId);
      } catch {
        return false;
      }
      if (data.enemyIndex >= ids.length) return false;
      if (!data.started) {
        return data.enemyIndex === 0 && !data.rewardClaimed &&
          savedGameState.phase === GAME_PHASE.TITLE &&
          savedGameState.enemy === null &&
          data.floor <= floors[savedDungeonId];
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
      unlockedFloors = normalizedProgressMap(
        data.unlockedFloors,
        initialUnlockedFloors,
        (value, id) => Number.isSafeInteger(value) && value >= 1 &&
          value <= getFloorCount(id),
      ) ?? initialUnlockedFloors();
      completedDungeons = normalizedProgressMap(
        data.completedDungeons,
        initialCompletedDungeons,
        (value) => typeof value === "boolean",
      ) ?? initialCompletedDungeons();
      if (started && encounterSetVersion !== CURRENT_ENCOUNTER_SET_VERSION &&
          floor <= getFloorCount(dungeonId)) {
        unlockedFloors[dungeonId] = Math.max(unlockedFloors[dungeonId], floor);
      }
      return true;
    },

    getDungeonInfo() {
      return DUNGEON_DEFINITIONS[dungeonId];
    },

    getUnlockedFloor(targetDungeonId = dungeonId) {
      return Object.hasOwn(unlockedFloors, targetDungeonId)
        ? unlockedFloors[targetDungeonId]
        : null;
    },

    isDungeonCleared(targetDungeonId = dungeonId) {
      return completedDungeons[targetDungeonId] === true;
    },

    getAllProgress() {
      return Object.fromEntries(dungeonIds.map((id) => [id, {
        unlockedFloor: unlockedFloors[id],
        maxFloors: getFloorCount(id),
        cleared: completedDungeons[id],
      }]));
    },

    getProgress() {
      const ids = getEncounterIds();
      const floorCleared = started &&
        store.getState().phase === GAME_PHASE.VICTORY &&
        enemyIndex === ids.length - 1;
      return {
        floor,
        enemyNumber: enemyIndex + 1,
        enemiesPerFloor: ids.length,
        floorCleared,
        started,
        rewardClaimed,
        unlockedFloor: unlockedFloors[dungeonId],
        maxFloors: getFloorCount(dungeonId),
        dungeonCleared: completedDungeons[dungeonId],
      };
    },
  };
}
