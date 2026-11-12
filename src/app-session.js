/**
 * Shared browser session for home, facility, and dungeon-selection pages.
 * The extra payload intentionally matches battle.html's autosave format.
 */
import { createGameStore } from "./game-state.js";
import { createDungeonController } from "./dungeon.js";
import { createSaveController } from "./save-system.js";
import { createTownController } from "./town.js";
import { createWordBattleState, isValidSavedWordBattleState } from "./word-battle.js";
import { SKILL_DEFINITIONS } from "./skills.js";

function createDefaultExtraData() {
  return {
    wordState: createWordBattleState(),
    spawnElapsed: 0,
    attackElapsed: 0,
    awaitingSkill: false,
    selectedSkillId: null,
  };
}

function isValidExtraData(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  // Some STEP 20-22 town saves used an empty extra object. They are safe to
  // migrate because a town save has no active battle to resume.
  if (Object.keys(value).length === 0) return true;
  return Boolean(
    isValidSavedWordBattleState(value.wordState) &&
    Number.isFinite(value.spawnElapsed) && value.spawnElapsed >= 0 &&
    value.spawnElapsed < 900 &&
    (value.attackElapsed === undefined ||
      (Number.isFinite(value.attackElapsed) && value.attackElapsed >= 0 && value.attackElapsed < 9000)) &&
    (value.awaitingSkill === undefined || typeof value.awaitingSkill === "boolean") &&
    (value.selectedSkillId === undefined || value.selectedSkillId === null ||
      Object.hasOwn(SKILL_DEFINITIONS, value.selectedSkillId))
  );
}

export function createAppSession({ storage } = {}) {
  const store = createGameStore();
  const dungeon = createDungeonController(store);
  const town = createTownController(store, dungeon);
  let extraData = createDefaultExtraData();
  const saves = createSaveController({
    store,
    storage,
    dungeon,
    getExtraData: () => extraData,
    validateExtraData: isValidExtraData,
    restoreExtraData: (value) => {
      extraData = Object.keys(value).length === 0 ? createDefaultExtraData() : value;
    },
  });
  const initialLoad = saves.load();
  return {
    store,
    dungeon,
    town,
    saves,
    initialLoad,
    returnToTown() {
      const result = town.returnToTown();
      if (result.returned || store.getState().phase === "title") saves.save();
      return result;
    },
    save() { return saves.save(); },
  };
}
