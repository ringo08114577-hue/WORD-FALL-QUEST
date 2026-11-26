/**
 * Shared browser session for home, facility, and dungeon-selection pages.
 * The extra payload intentionally matches battle.html's autosave format.
 */
import { createGameStore, GAME_ACTION, GAME_PHASE } from "./game-state.js";
import { createDungeonController } from "./dungeon.js";
import { createSaveController } from "./save-system.js";
import { createTownController } from "./town.js";
import { createWordBattleState, isValidSavedWordBattleState } from "./word-battle.js";
import { SKILL_DEFINITIONS, createInitialCharacterSkillLoadouts, isValidCharacterSkillLoadouts, normalizeCharacterSkillLoadouts, normalizeEquippedSkillIds } from "./skills.js";
import { DEFAULT_CHARACTER_ID, getCharacterDefinition, isValidCharacterId, normalizeCharacterId } from "./characters.js";
import {
  isValidWeakWordEntries,
  normalizeWeakWordEntries,
  recordWeakWordMistake as addWeakWordMistake,
  removeWeakWordEntry,
} from "./weak-words.js";

function createDefaultExtraData() {
  return {
    wordState: createWordBattleState(),
    spawnElapsed: 0,
    attackElapsed: 0,
    awaitingSkill: false,
    selectedSkillId: null,
    weakWords: [],
    characterId: DEFAULT_CHARACTER_ID,
    characterSkillLoadouts: createInitialCharacterSkillLoadouts(),
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
    (value.selectedSkillId === undefined || value.selectedSkillId === null || typeof value.selectedSkillId === "string") &&
    (value.weakWords === undefined || isValidWeakWordEntries(value.weakWords)) &&
    (value.characterId === undefined || isValidCharacterId(value.characterId)) &&
    (value.characterSkillLoadouts === undefined || isValidCharacterSkillLoadouts(value.characterSkillLoadouts))
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
    getExtraData: () => {
      const characterId = normalizeCharacterId(extraData.characterId);
      return {
        ...extraData,
        characterId,
        characterSkillLoadouts: {
          ...normalizeCharacterSkillLoadouts(extraData.characterSkillLoadouts),
          [characterId]: normalizeEquippedSkillIds(store.getState().equippedSkillIds, characterId),
        },
      };
    },
    validateExtraData: isValidExtraData,
    restoreExtraData: (value) => {
      extraData = Object.keys(value).length === 0
        ? createDefaultExtraData()
        : {
          ...value,
          weakWords: normalizeWeakWordEntries(value.weakWords ?? []),
          characterId: normalizeCharacterId(value.characterId),
          characterSkillLoadouts: normalizeCharacterSkillLoadouts(value.characterSkillLoadouts),
        };
      if (store.getState().phase === GAME_PHASE.TITLE) {
        const activeId = normalizeCharacterId(value.characterId);
        const preferred = normalizeCharacterSkillLoadouts(value.characterSkillLoadouts)[activeId];
        if (store.getState().equippedSkillIds.some((id, index) => id !== preferred[index])) {
          store.dispatch({ type: GAME_ACTION.SET_EQUIPPED_SKILLS, skillIds: preferred });
        }
      }
    },
  });
  const initialLoad = saves.load();

  // Browser pages share this session factory, so attach cloud sync here once.
  // The dynamic import keeps Node-based game tests independent from browser auth.
  if (typeof window !== "undefined" && typeof document !== "undefined") {
    import("./auto-cloud-sync.js")
      .then(({ attachAutoCloudSync }) => attachAutoCloudSync({ saveController: saves }))
      .catch((error) => console.warn("WORD FALL QUEST cloud sync could not start:", error));
  }

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
    getSelectedCharacterId() {
      return normalizeCharacterId(extraData.characterId);
    },
    getSelectedCharacter() {
      return getCharacterDefinition(extraData.characterId);
    },
    selectCharacter(characterId) {
      if (!isValidCharacterId(characterId)) return { selected: false, changed: false, reason: "invalid-character" };
      if (store.getState().phase !== "title") return { selected: false, changed: false, reason: "not-in-town" };
      if (extraData.characterId === characterId) {
        return { selected: true, changed: false, saved: true, character: getCharacterDefinition(characterId) };
      }
      const currentId = normalizeCharacterId(extraData.characterId);
      const loadouts = normalizeCharacterSkillLoadouts(extraData.characterSkillLoadouts);
      loadouts[currentId] = normalizeEquippedSkillIds(store.getState().equippedSkillIds, currentId);
      const nextLoadout = loadouts[characterId];
      const previousState = store.getState();
      const nextState = store.dispatch({ type: GAME_ACTION.SET_EQUIPPED_SKILLS, skillIds: nextLoadout });
      if (nextState === previousState && nextLoadout.some((id, index) => id !== previousState.equippedSkillIds[index])) {
        return { selected: false, changed: false, reason: "skill-loadout-switch-failed" };
      }
      loadouts[characterId] = [...nextLoadout];
      extraData = { ...extraData, characterId, characterSkillLoadouts: loadouts };
      return { selected: true, changed: true, character: getCharacterDefinition(characterId), ...saves.save() };
    },
    getWeakWords() {
      return normalizeWeakWordEntries(extraData.weakWords ?? []);
    },
    recordWeakWordMistake(challenge, timestamp = Date.now()) {
      extraData = {
        ...extraData,
        weakWords: addWeakWordMistake(extraData.weakWords ?? [], challenge, timestamp),
      };
      return { words: this.getWeakWords(), ...saves.save() };
    },
    markWeakWordMastered(wordId) {
      const current = extraData.weakWords ?? [];
      const next = removeWeakWordEntry(current, wordId);
      if (next.length === current.length) return { removed: false, saved: false };
      extraData = { ...extraData, weakWords: next };
      return { removed: true, ...saves.save() };
    },
    clearWeakWords() {
      if ((extraData.weakWords ?? []).length === 0) return { cleared: false, saved: false };
      extraData = { ...extraData, weakWords: [] };
      return { cleared: true, ...saves.save() };
    },
  };
}
