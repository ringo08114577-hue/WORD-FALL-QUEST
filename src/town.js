/**
 * WORD FALL QUEST - Town services.
 * The inn is usable only while the adventurer is safely in town or paused.
 */
import { GAME_ACTION, GAME_PHASE } from "./game-state.js";
import { GAME_CONFIG } from "./game-config.js";

export const INN_REST_COST = GAME_CONFIG.town.innRestCost;

export function createTownController(store) {
  if (!store || typeof store.getState !== "function" ||
      typeof store.dispatch !== "function") {
    throw new TypeError("town controllerにはgame storeが必要です。");
  }

  return {
    restAtInn() {
      const state = store.getState();
      if (![GAME_PHASE.TITLE, GAME_PHASE.PAUSED, GAME_PHASE.VICTORY].includes(state.phase)) {
        return { rested: false, reason: "not-in-town" };
      }
      if (state.player.hp >= state.player.maxHp) {
        return { rested: false, reason: "already-full" };
      }
      if (state.inventory.gold < INN_REST_COST) {
        return { rested: false, reason: "not-enough-gold" };
      }

      const next = store.dispatch({ type: GAME_ACTION.REST_AT_INN });
      if (next === state) return { rested: false, reason: "rest-rejected" };
      return {
        rested: true,
        cost: INN_REST_COST,
        restored: next.player.hp - state.player.hp,
        hp: next.player.hp,
        maxHp: next.player.maxHp,
        gold: next.inventory.gold,
      };
    },
  };
}
