/**
 * WORD FALL QUEST - Town return service.
 * Returning to the home hub abandons the current floor attempt and fully heals.
 */
import { GAME_ACTION, GAME_PHASE } from "./game-state.js";

export function createTownController(store, dungeon) {
  if (!store || typeof store.getState !== "function" ||
      typeof store.dispatch !== "function") {
    throw new TypeError("town controllerにはgame storeが必要です。");
  }
  if (!dungeon || typeof dungeon.exitToTown !== "function") {
    throw new TypeError("town controllerにはdungeon controllerが必要です。");
  }

  return {
    returnToTown() {
      const before = store.getState();
      dungeon.exitToTown();
      const after = store.dispatch({ type: GAME_ACTION.RETURN_TO_TOWN });
      return {
        returned: after !== before,
        fromPhase: before.phase,
        phase: after.phase,
        restoredHp: after.player.hp - before.player.hp,
        hp: after.player.hp,
        maxHp: after.player.maxHp,
      };
    },
  };
}
