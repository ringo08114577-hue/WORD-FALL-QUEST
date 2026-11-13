/**
 * WORD FALL QUEST - Versioned local save system.
 * Migration keeps existing characters and adds independent dungeon progress.
 */
import { ITEM_DEFINITIONS, EQUIPMENT_SLOTS } from "./items.js";
import { normalizeSkillLevels, normalizeEquippedSkillIds } from "./skills.js";
import { DUNGEON_DEFINITIONS } from "./data/dungeons.js";

export const SAVE_STORAGE_KEY = "word-fall-quest.save.v1";
export const SAVE_VERSION = 8;

function isRecord(value) {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}

function createInitialDungeonProgress() {
  const unlockedFloors = {};
  const completedDungeons = {};
  for (const [id, definition] of Object.entries(DUNGEON_DEFINITIONS)) {
    unlockedFloors[id] = 1;
    completedDungeons[id] = false;
  }
  return { unlockedFloors, completedDungeons };
}

function migrateSnapshot(snapshot) {
  if (!isRecord(snapshot) || ![1, 2, 3, 4, 5, 6, 7, SAVE_VERSION].includes(snapshot.version)) return null;
  let migrated = snapshot;

  if (migrated.version === 1) {
    const gameState = migrated.gameState;
    if (!isRecord(gameState) || !isRecord(gameState.player) ||
        !isRecord(gameState.inventory) || !isRecord(gameState.inventory.items) ||
        !isRecord(gameState.inventory.equipment)) return null;
    migrated = {
      ...migrated,
      version: 2,
      gameState: {
        ...gameState,
        player: {
          ...gameState.player,
          baseDefensePower: gameState.player.baseDefensePower ?? 0,
          defensePower: gameState.player.defensePower ?? 0,
        },
        inventory: {
          ...gameState.inventory,
          items: {
            ...gameState.inventory.items,
            "wooden-shield": gameState.inventory.items["wooden-shield"] ?? 0,
          },
          equipment: {
            ...gameState.inventory.equipment,
            shield: gameState.inventory.equipment.shield ?? null,
          },
        },
      },
    };
  }

  if (migrated.version === 2) {
    const gameState = migrated.gameState;
    if (!isRecord(gameState) || !isRecord(gameState.inventory) ||
        !isRecord(gameState.inventory.items) || !isRecord(gameState.inventory.equipment)) return null;
    migrated = {
      ...migrated,
      version: 3,
      gameState: {
        ...gameState,
        inventory: {
          ...gameState.inventory,
          items: Object.fromEntries(Object.keys(ITEM_DEFINITIONS).map((itemId) => [
            itemId, gameState.inventory.items[itemId] ?? 0,
          ])),
          equipment: Object.fromEntries(EQUIPMENT_SLOTS.map((slot) => [
            slot, gameState.inventory.equipment[slot] ?? null,
          ])),
        },
      },
    };
  }

  if (migrated.version === 3) {
    const gameState = migrated.gameState;
    const dungeonState = migrated.dungeonState;
    if (!isRecord(gameState) || !isRecord(dungeonState)) return null;
    migrated = {
      ...migrated,
      version: 4,
      gameState: {
        ...gameState,
        enemy: isRecord(gameState.enemy) ? {
          ...gameState.enemy,
          abilities: Array.isArray(gameState.enemy.abilities) ? gameState.enemy.abilities : [],
          isBoss: gameState.enemy.isBoss === true,
        } : gameState.enemy ?? null,
      },
      dungeonState: {
        ...dungeonState,
        encounterSetVersion: dungeonState.encounterSetVersion ?? 1,
      },
    };
  }

  if (migrated.version === 4) {
    const gameState = migrated.gameState;
    const dungeonState = migrated.dungeonState;
    if (!isRecord(gameState) || !isRecord(dungeonState)) return null;
    const progress = createInitialDungeonProgress();
    const dungeonId = dungeonState.dungeonId ?? "forest-ruins";
    if (!Object.hasOwn(DUNGEON_DEFINITIONS, dungeonId)) return null;
    const floor = Number.isSafeInteger(dungeonState.floor) && dungeonState.floor > 0
      ? dungeonState.floor
      : 1;
    const phase = gameState.phase;
    const nextFloorUnlocked = dungeonState.started === true &&
      phase === "victory" && dungeonState.rewardClaimed === true;
    const maximum = DUNGEON_DEFINITIONS[dungeonId].floorCount ?? 5;
    progress.unlockedFloors[dungeonId] = Math.min(
      maximum,
      Math.max(1, Math.min(floor, maximum) + (nextFloorUnlocked && floor < maximum ? 1 : 0)),
    );
    migrated = {
      ...migrated,
      version: 5,
      dungeonState: {
        ...dungeonState,
        unlockedFloors: progress.unlockedFloors,
        completedDungeons: progress.completedDungeons,
      },
    };
  }

  if (migrated.version === 5) {
    const gameState = migrated.gameState;
    if (!isRecord(gameState)) return null;
    migrated = { ...migrated, version: 6, gameState: {
      ...gameState,
      equippedSkillIds: normalizeEquippedSkillIds(gameState.equippedSkillIds),
    } };
  }

  if (migrated.version === 6) {
    const gameState = migrated.gameState;
    if (!isRecord(gameState)) return null;
    migrated = {
      ...migrated,
      version: 7,
      gameState: {
        ...gameState,
        actionLog: Array.isArray(gameState.actionLog) ? gameState.actionLog : [],
      },
    };
  }

  if (migrated.version === 7) {
    const gameState = migrated.gameState;
    if (!isRecord(gameState)) return null;
    migrated = {
      ...migrated,
      version: 8,
      gameState: {
        ...gameState,
        battleEffects: gameState.battleEffects ?? {
          attackMultiplier: 1,
          attackUsesRemaining: 0,
          defenseBonus: 0,
          defenseHitsRemaining: 0,
        },
      },
    };
  }

  if (migrated.version === SAVE_VERSION) {
    const gameState = migrated.gameState;
    if (!isRecord(gameState) || !isRecord(gameState.inventory) ||
        !isRecord(gameState.inventory.items) || !isRecord(gameState.inventory.equipment)) return null;
    migrated = {
      ...migrated,
      gameState: {
        ...gameState,
        skillLevels: normalizeSkillLevels(gameState.skillLevels),
        equippedSkillIds: normalizeEquippedSkillIds(gameState.equippedSkillIds),
        inventory: {
          ...gameState.inventory,
          items: Object.fromEntries(Object.keys(ITEM_DEFINITIONS).map((itemId) => [
            itemId,
            gameState.inventory.items[itemId] ??
              ITEM_DEFINITIONS[itemId].startingQuantity ?? 0,
          ])),
          equipment: Object.fromEntries(EQUIPMENT_SLOTS.map((slot) => [
            slot, gameState.inventory.equipment[slot] ?? null,
          ])),
        },
      },
    };
  }
  return migrated.version === SAVE_VERSION ? migrated : null;
}

export function createSaveController({
  store,
  dungeon,
  storage,
  getExtraData = () => ({}),
  validateExtraData = () => true,
  restoreExtraData = () => {},
}) {
  if (!store || typeof store.getState !== "function" ||
      typeof store.isValidState !== "function" ||
      typeof store.restoreState !== "function") {
    throw new TypeError("save controllerには復元に対応したgame storeが必要です。");
  }
  if (!dungeon || typeof dungeon.getSaveData !== "function" ||
      typeof dungeon.isValidSaveData !== "function" ||
      typeof dungeon.restoreSaveData !== "function") {
    throw new TypeError("save controllerには保存に対応したdungeon controllerが必要です。");
  }

  function getStorage() {
    try { return storage ?? globalThis.localStorage ?? null; } catch { return null; }
  }

  return {
    save() {
      try {
        const target = getStorage();
        if (!target) return { saved: false, reason: "storage-unavailable" };
        const extra = getExtraData();
        const gameState = store.getState();
        const dungeonState = dungeon.getSaveData();
        if (!store.isValidState(gameState) ||
            !dungeon.isValidSaveData(dungeonState, gameState)) {
          return { saved: false, reason: "invalid-game-state" };
        }
        if (!validateExtraData(extra)) return { saved: false, reason: "invalid-extra-data" };
        const snapshot = {
          version: SAVE_VERSION,
          savedAt: new Date().toISOString(),
          gameState,
          dungeonState,
          extra,
        };
        target.setItem(SAVE_STORAGE_KEY, JSON.stringify(snapshot));
        return { saved: true, savedAt: snapshot.savedAt };
      } catch {
        return { saved: false, reason: "storage-write-failed" };
      }
    },

    load() {
      try {
        const target = getStorage();
        if (!target) return { loaded: false, reason: "storage-unavailable" };
        const raw = target.getItem(SAVE_STORAGE_KEY);
        if (!raw) return { loaded: false, reason: "save-not-found" };
        const snapshot = migrateSnapshot(JSON.parse(raw));
        if (!snapshot || !store.isValidState(snapshot.gameState) ||
            !dungeon.isValidSaveData(snapshot.dungeonState, snapshot.gameState) ||
            !validateExtraData(snapshot.extra)) {
          return { loaded: false, reason: "invalid-save" };
        }
        if (!store.restoreState(snapshot.gameState) ||
            !dungeon.restoreSaveData(snapshot.dungeonState)) {
          return { loaded: false, reason: "invalid-save" };
        }
        restoreExtraData(snapshot.extra);
        return { loaded: true, savedAt: snapshot.savedAt ?? null, extra: snapshot.extra };
      } catch {
        return { loaded: false, reason: "storage-read-failed" };
      }
    },

    exportSnapshot() {
      try {
        const extra = getExtraData();
        const gameState = store.getState();
        const dungeonState = dungeon.getSaveData();
        if (!store.isValidState(gameState) ||
            !dungeon.isValidSaveData(dungeonState, gameState)) {
          return { exported: false, reason: "invalid-game-state" };
        }
        if (!validateExtraData(extra)) {
          return { exported: false, reason: "invalid-extra-data" };
        }
        return {
          exported: true,
          snapshot: {
            version: SAVE_VERSION,
            savedAt: new Date().toISOString(),
            gameState,
            dungeonState,
            extra,
          },
        };
      } catch {
        return { exported: false, reason: "snapshot-export-failed" };
      }
    },

    restoreSnapshot(candidate) {
      try {
        const snapshot = migrateSnapshot(candidate);
        if (!snapshot || !store.isValidState(snapshot.gameState) ||
            !dungeon.isValidSaveData(snapshot.dungeonState, snapshot.gameState) ||
            !validateExtraData(snapshot.extra)) {
          return { restored: false, reason: "invalid-save" };
        }
        if (!store.restoreState(snapshot.gameState) ||
            !dungeon.restoreSaveData(snapshot.dungeonState)) {
          return { restored: false, reason: "invalid-save" };
        }
        restoreExtraData(snapshot.extra);
        return { restored: true, savedAt: snapshot.savedAt ?? null };
      } catch {
        return { restored: false, reason: "snapshot-restore-failed" };
      }
    },

    clear() {
      try {
        const target = getStorage();
        if (!target) return { cleared: false, reason: "storage-unavailable" };
        target.removeItem(SAVE_STORAGE_KEY);
        return { cleared: true };
      } catch {
        return { cleared: false, reason: "storage-clear-failed" };
      }
    },
  };
}
