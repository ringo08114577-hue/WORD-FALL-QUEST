/**
 * WORD FALL QUEST - Between-floor shop
 * Purchases are available only after the floor reward has been claimed.
 */
import { GAME_ACTION, GAME_PHASE } from "./game-state.js";
import { ITEM_DEFINITIONS, ITEM_SHOP_PRICES } from "./items.js";

export const SHOP_CATALOG = Object.freeze(
  Object.fromEntries(
    Object.entries(ITEM_SHOP_PRICES).map(([itemId, cost]) => [
      itemId,
      Object.freeze({ itemId, cost }),
    ]),
  ),
);

export function createShopController(store, dungeon) {
  if (!store || typeof store.getState !== "function" || typeof store.dispatch !== "function") {
    throw new TypeError("shop controllerにはgame storeが必要です。");
  }
  if (!dungeon || typeof dungeon.getProgress !== "function") {
    throw new TypeError("shop controllerにはdungeon controllerが必要です。");
  }

  return {
    buy(itemId) {
      const offer = Object.hasOwn(SHOP_CATALOG, itemId) ? SHOP_CATALOG[itemId] : null;
      if (!offer || !Object.hasOwn(ITEM_DEFINITIONS, itemId)) {
        return { purchased: false, reason: "unknown-item" };
      }
      const state = store.getState();
      const progress = dungeon.getProgress();
      if (
        state.phase !== GAME_PHASE.VICTORY ||
        !progress.floorCleared ||
        !progress.rewardClaimed
      ) {
        return { purchased: false, reason: "not-at-shop" };
      }
      if (state.inventory.gold < offer.cost) {
        return { purchased: false, reason: "not-enough-gold" };
      }
      const next = store.dispatch({
        type: GAME_ACTION.BUY_ITEM,
        itemId,
        cost: offer.cost,
      });
      if (next === state) {
        return { purchased: false, reason: "purchase-rejected" };
      }
      return {
        purchased: true,
        item: ITEM_DEFINITIONS[itemId],
        cost: offer.cost,
        gold: next.inventory.gold,
        quantity: next.inventory.items[itemId],
      };
    },
  };
}
