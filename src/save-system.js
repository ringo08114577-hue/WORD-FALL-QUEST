/**
 * WORD FALL QUEST - Local save system
 * Versioned, validated snapshots of game, dungeon, and optional UI progress.
 */
export const SAVE_STORAGE_KEY = "word-fall-quest.save.v1";
export const SAVE_VERSION = 2;

function migrateSnapshot(snapshot) {
  if (!snapshot || typeof snapshot !== "object" || Array.isArray(snapshot)) return null;
  if (snapshot.version === SAVE_VERSION) return snapshot;
  if (snapshot.version !== 1) return null;

  const gameState = snapshot.gameState;
  if (!gameState || typeof gameState !== "object" ||
      !gameState.player || !gameState.inventory ||
      !gameState.inventory.items || !gameState.inventory.equipment) return null;

  return {
    ...snapshot,
    version: SAVE_VERSION,
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
    try {
      return storage ?? globalThis.localStorage ?? null;
    } catch {
      return null;
    }
  }

  return {
    save() {
      try {
        const target = getStorage();
        if (!target) return { saved: false, reason: "storage-unavailable" };
        const extra = getExtraData();
        const gameState = store.getState();
        const dungeonState = dungeon.getSaveData();
        if (
          !store.isValidState(gameState) ||
          !dungeon.isValidSaveData(dungeonState, gameState)
        ) {
          return { saved: false, reason: "invalid-game-state" };
        }
        if (!validateExtraData(extra)) {
          return { saved: false, reason: "invalid-extra-data" };
        }
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
        if (
          !snapshot ||
          !store.isValidState(snapshot.gameState) ||
          !dungeon.isValidSaveData(snapshot.dungeonState, snapshot.gameState) ||
          !validateExtraData(snapshot.extra)
        ) {
          return { loaded: false, reason: "invalid-save" };
        }

        if (!store.restoreState(snapshot.gameState)) {
          return { loaded: false, reason: "invalid-save" };
        }
        if (!dungeon.restoreSaveData(snapshot.dungeonState)) {
          return { loaded: false, reason: "invalid-save" };
        }
        restoreExtraData(snapshot.extra);
        return {
          loaded: true,
          savedAt: snapshot.savedAt ?? null,
          extra: snapshot.extra,
        };
      } catch {
        return { loaded: false, reason: "storage-read-failed" };
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
