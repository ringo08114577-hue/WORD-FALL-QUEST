/**
 * WORD FALL QUEST - Versioned local save system.
 * Migration keeps existing characters and adds independent dungeon progress.
 */
import { ITEM_DEFINITIONS, EQUIPMENT_SLOTS, getEquipmentBonuses } from "./items.js";
import { normalizeSkillLevels, normalizeEquippedSkillIds, normalizeEvolvedSkillIds } from "./skills.js";
import { DUNGEON_DEFINITIONS, DEFAULT_DUNGEON_ID } from "./data/dungeons.js";
import { GAME_CONFIG } from "./game-config.js";
import { createEnemy } from "./enemies.js";

export const SAVE_STORAGE_KEY = "word-fall-quest.save.v1";
export const SAVE_VERSION = 13;

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
  if (!isRecord(snapshot) || ![1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, SAVE_VERSION].includes(snapshot.version)) return null;
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

  if (migrated.version === 8) {
    const gameState = migrated.gameState;
    if (!isRecord(gameState)) return null;
    migrated = {
      ...migrated,
      version: 9,
      gameState: {
        ...gameState,
        evolvedSkillIds: Array.isArray(gameState.evolvedSkillIds) ? gameState.evolvedSkillIds : [],
      },
    };
  }

  if (migrated.version === 9) {
    const gameState = migrated.gameState;
    const dungeonState = migrated.dungeonState;
    if (!isRecord(gameState) || !isRecord(gameState.player) ||
        !isRecord(gameState.inventory) || !isRecord(gameState.inventory.equipment)) return null;

    const oldPlayer = gameState.player;
    const level = Number.isSafeInteger(oldPlayer.level) && oldPlayer.level > 0
      ? oldPlayer.level
      : 1;
    const oldMaxHp = Number.isSafeInteger(oldPlayer.maxHp) && oldPlayer.maxHp > 0
      ? oldPlayer.maxHp
      : 3;
    const oldHp = Number.isSafeInteger(oldPlayer.hp) && oldPlayer.hp >= 0
      ? oldPlayer.hp
      : oldMaxHp;
    const hpRatio = oldHp / oldMaxHp;
    const startingMaxHp = GAME_CONFIG.player.startingMaxHp;
    const startingAttackPower = GAME_CONFIG.player.startingAttackPower;
    const baseMaxHp = startingMaxHp + (level - 1) * GAME_CONFIG.progression.hpPerLevel;
    const baseAttackPower = startingAttackPower +
      (level - 1) * GAME_CONFIG.progression.attackPowerPerLevel;
    const equipmentBonuses = getEquipmentBonuses(gameState.inventory.equipment);
    const maxHp = baseMaxHp + equipmentBonuses.maxHpBonus;
    const oldNextLevelXp = Number.isSafeInteger(oldPlayer.nextLevelXp) && oldPlayer.nextLevelXp > 0
      ? oldPlayer.nextLevelXp
      : level * 10;
    const nextLevelXp = level * GAME_CONFIG.progression.experiencePerLevel;
    const experienceRatio = Number.isSafeInteger(oldPlayer.experience) && oldPlayer.experience >= 0
      ? oldPlayer.experience / oldNextLevelXp
      : 0;
    let enemy = null;
    if (isRecord(gameState.enemy)) {
      const floor = Number.isSafeInteger(dungeonState?.floor) && dungeonState.floor > 0
        ? dungeonState.floor
        : 1;
      const dungeonId = Object.hasOwn(DUNGEON_DEFINITIONS, dungeonState?.dungeonId)
        ? dungeonState.dungeonId
        : DEFAULT_DUNGEON_ID;
      const freshEnemy = createEnemy(gameState.enemy.id, { floor, dungeonId });
      const oldEnemyMaxHp = Number.isSafeInteger(gameState.enemy.maxHp) && gameState.enemy.maxHp > 0
        ? gameState.enemy.maxHp
        : freshEnemy.maxHp;
      const oldEnemyHp = Number.isSafeInteger(gameState.enemy.hp) && gameState.enemy.hp >= 0
        ? gameState.enemy.hp
        : oldEnemyMaxHp;
      const enemyHp = oldEnemyHp === 0
        ? 0
        : Math.max(1, Math.min(freshEnemy.maxHp, Math.round(freshEnemy.maxHp * oldEnemyHp / oldEnemyMaxHp)));
      enemy = { ...freshEnemy, hp: enemyHp };
    }

    migrated = {
      ...migrated,
      version: 10,
      gameState: {
        ...gameState,
        player: {
          ...oldPlayer,
          hp: oldHp === 0 ? 0 : Math.max(1, Math.min(maxHp, Math.round(maxHp * hpRatio))),
          maxHp,
          baseMaxHp,
          startingMaxHp,
          startingAttackPower,
          baseAttackPower,
          attackPower: baseAttackPower + equipmentBonuses.attackBonus,
          defensePower: (oldPlayer.baseDefensePower ?? 0) + equipmentBonuses.defenseBonus,
          nextLevelXp,
          experience: Math.min(nextLevelXp - 1, Math.round(experienceRatio * nextLevelXp)),
        },
        enemy,
        battleEffects: {
          ...(gameState.battleEffects ?? {
            attackMultiplier: 1,
            attackUsesRemaining: 0,
            defenseBonus: 0,
            defenseHitsRemaining: 0,
          }),
          defenseBonus: (gameState.battleEffects?.defenseBonus ?? 0) * 10,
        },
        stats: {
          ...gameState.stats,
          totalExperienceEarned: (gameState.stats?.totalExperienceEarned ?? 0) * 10,
        },
      },
    };
  }


  if (migrated.version === 10) {
    const gameState = migrated.gameState;
    if (!isRecord(gameState) || !isRecord(gameState.player) ||
        !isRecord(gameState.inventory) || !isRecord(gameState.inventory.equipment)) return null;

    const oldPlayer = gameState.player;
    let nextGameState = gameState;

    // Older battle.html builds accidentally initialized new characters with
    // HP 3 / ATK 1 even after the central balance changed to HP 100 / ATK 20.
    // Only repair saves carrying both exact legacy markers; keep valid newer
    // v10 characters and all unrelated progression untouched.
    if (oldPlayer.startingMaxHp === 3 && oldPlayer.startingAttackPower === 1) {
      const level = Number.isSafeInteger(oldPlayer.level) && oldPlayer.level > 0
        ? oldPlayer.level
        : 1;
      const oldMaxHp = Number.isSafeInteger(oldPlayer.maxHp) && oldPlayer.maxHp > 0
        ? oldPlayer.maxHp
        : 3;
      const oldHp = Number.isSafeInteger(oldPlayer.hp) && oldPlayer.hp >= 0
        ? oldPlayer.hp
        : oldMaxHp;
      const hpRatio = oldHp / oldMaxHp;
      const equipmentBonuses = getEquipmentBonuses(gameState.inventory.equipment);
      const startingMaxHp = GAME_CONFIG.player.startingMaxHp;
      const startingAttackPower = GAME_CONFIG.player.startingAttackPower;
      const baseMaxHp = startingMaxHp +
        (level - 1) * GAME_CONFIG.progression.hpPerLevel;
      const baseAttackPower = startingAttackPower +
        (level - 1) * GAME_CONFIG.progression.attackPowerPerLevel;
      const maxHp = baseMaxHp + equipmentBonuses.maxHpBonus;
      const baseDefensePower = Number.isSafeInteger(oldPlayer.baseDefensePower) &&
        oldPlayer.baseDefensePower >= 0 ? oldPlayer.baseDefensePower : 0;
      const nextLevelXp = level * GAME_CONFIG.progression.experiencePerLevel;
      const experience = Number.isSafeInteger(oldPlayer.experience) &&
        oldPlayer.experience >= 0
        ? Math.min(nextLevelXp - 1, oldPlayer.experience)
        : 0;

      nextGameState = {
        ...gameState,
        player: {
          ...oldPlayer,
          hp: oldHp === 0 ? 0 : Math.max(1, Math.min(maxHp, Math.round(maxHp * hpRatio))),
          maxHp,
          baseMaxHp,
          startingMaxHp,
          startingAttackPower,
          baseAttackPower,
          attackPower: baseAttackPower + equipmentBonuses.attackBonus,
          baseDefensePower,
          defensePower: baseDefensePower + equipmentBonuses.defenseBonus,
          experience,
          nextLevelXp,
        },
      };
    }

    migrated = { ...migrated, version: 11, gameState: nextGameState };
  }

  if (migrated.version === 11) {
    migrated = { ...migrated, version: 12 };
  }

  if (migrated.version === 12) {
    const gameState = migrated.gameState;
    if (!isRecord(gameState)) return null;
    migrated = {
      ...migrated,
      version: 13,
      gameState: {
        ...gameState,
        enemy: isRecord(gameState.enemy) ? {
          ...gameState.enemy,
          isMiniBoss: gameState.enemy.isMiniBoss === true,
        } : gameState.enemy ?? null,
      },
    };
  }

  if (migrated.version === SAVE_VERSION) {
    const gameState = migrated.gameState;
    if (!isRecord(gameState) || !isRecord(gameState.inventory) ||
        !isRecord(gameState.inventory.items) || !isRecord(gameState.inventory.equipment)) return null;
    const skillLevels = normalizeSkillLevels(gameState.skillLevels);
    migrated = {
      ...migrated,
      gameState: {
        ...gameState,
        skillLevels,
        evolvedSkillIds: normalizeEvolvedSkillIds(gameState.evolvedSkillIds, skillLevels),
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
        return { restored: true, savedAt: snapshot.savedAt ?? null, version: snapshot.version };
      } catch {
        return { restored: false, reason: "snapshot-restore-failed" };
      }
    },

    getLocalSaveInfo() {
      try {
        const target = getStorage();
        if (!target) return { exists: false, reason: "storage-unavailable" };
        const raw = target.getItem(SAVE_STORAGE_KEY);
        if (!raw) return { exists: false, reason: "save-not-found" };
        const snapshot = migrateSnapshot(JSON.parse(raw));
        if (!snapshot || !store.isValidState(snapshot.gameState) ||
            !dungeon.isValidSaveData(snapshot.dungeonState, snapshot.gameState) ||
            !validateExtraData(snapshot.extra)) {
          return { exists: false, reason: "invalid-save" };
        }
        return {
          exists: true,
          savedAt: snapshot.savedAt ?? null,
          version: snapshot.version,
        };
      } catch {
        return { exists: false, reason: "storage-read-failed" };
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
