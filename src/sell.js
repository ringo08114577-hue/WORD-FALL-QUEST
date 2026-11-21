/**
 * WORD FALL QUEST - Material selling controller.
 * Only sellable monster materials can be sold, and only while in town.
 */
import { GAME_ACTION, GAME_PHASE } from "./game-state.js";
import { ITEM_DEFINITIONS } from "./items.js";

export function createSellController(store) {
  if (!store || typeof store.getState !== "function" ||
      typeof store.dispatch !== "function") {
    throw new TypeError("sell controllerにはgame storeが必要です。");
  }

  return {
    sell(itemId, quantity = 1) {
      const item = typeof itemId === "string" && Object.hasOwn(ITEM_DEFINITIONS, itemId)
        ? ITEM_DEFINITIONS[itemId]
        : null;
      if (!item || item.type !== "material" ||
          !Number.isSafeInteger(item.sellPrice) || item.sellPrice <= 0) {
        return { sold: false, reason: "not-sellable" };
      }

      const state = store.getState();
      if (state.phase !== GAME_PHASE.TITLE) {
        return { sold: false, reason: "not-in-town" };
      }
      if (!Number.isSafeInteger(quantity) || quantity <= 0) {
        return { sold: false, reason: "invalid-quantity" };
      }

      const ownedQuantity = state.inventory.items[itemId] ?? 0;
      if (!Number.isSafeInteger(ownedQuantity) || ownedQuantity < quantity) {
        return { sold: false, reason: "not-enough-items" };
      }

      const totalPrice = item.sellPrice * quantity;
      if (!Number.isSafeInteger(totalPrice) || totalPrice <= 0 ||
          !Number.isSafeInteger(state.inventory.gold + totalPrice)) {
        return { sold: false, reason: "gold-limit" };
      }

      const next = store.dispatch({
        type: GAME_ACTION.SELL_ITEM,
        itemId,
        quantity,
      });
      if (next === state) {
        return { sold: false, reason: "sale-rejected" };
      }

      return {
        sold: true,
        item,
        quantity,
        totalPrice,
        gold: next.inventory.gold,
        remainingQuantity: next.inventory.items[itemId],
      };
    },
  };
}
