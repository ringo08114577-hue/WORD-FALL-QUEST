import { ITEM_DEFINITIONS } from "./data/items.js";

/**
 * Return only owned healing consumables for the English battle inventory.
 * Equipment, crafting materials, and non-healing consumables stay out of
 * this compact battle-only list.
 */
export function getBattleRecoveryItems(inventory, definitions = ITEM_DEFINITIONS) {
  const quantities = inventory?.items;
  if (!quantities || typeof quantities !== "object" || Array.isArray(quantities)) {
    return [];
  }

  return Object.entries(definitions)
    .filter(([itemId, item]) =>
      item?.type === "consumable" &&
      item.effect === "heal" &&
      Number.isSafeInteger(quantities[itemId]) &&
      quantities[itemId] > 0
    )
    .map(([itemId, item]) => ({
      itemId,
      item,
      quantity: quantities[itemId],
    }));
}
