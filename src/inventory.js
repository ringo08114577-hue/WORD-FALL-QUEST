/**
 * Read-only inventory grouping for the adventurer's collection page.
 * Equipment is grouped under "weapon"; consumables under "tool";
 * materials and future miscellaneous items under "other".
 */
import { EQUIPMENT_SLOTS, ITEM_DEFINITIONS } from "./data/items.js";

export const INVENTORY_CATEGORIES = Object.freeze([
  Object.freeze({ id: "weapon", label: "武器" }),
  Object.freeze({ id: "tool", label: "道具" }),
  Object.freeze({ id: "other", label: "その他" }),
]);

const INVENTORY_CATEGORY_IDS = new Set(INVENTORY_CATEGORIES.map(({ id }) => id));

export function getInventoryCategory(item) {
  if (item && typeof item === "object" && EQUIPMENT_SLOTS.includes(item.slot)) {
    return "weapon";
  }
  if (item?.type === "consumable") return "tool";
  return "other";
}

export function getOwnedInventoryItems(
  inventory,
  category = null,
  definitions = ITEM_DEFINITIONS,
) {
  if (!inventory || typeof inventory !== "object" ||
      !inventory.items || typeof inventory.items !== "object" ||
      !definitions || typeof definitions !== "object") {
    return [];
  }
  if (category !== null && !INVENTORY_CATEGORY_IDS.has(category)) return [];

  return Object.entries(definitions)
    .filter(([itemId, item]) => {
      const quantity = inventory.items[itemId] ?? 0;
      const equipped = Boolean(item.slot && inventory.equipment?.[item.slot] === itemId);
      return Number.isSafeInteger(quantity) && quantity >= 0 &&
        (quantity > 0 || equipped) &&
        (category === null || getInventoryCategory(item) === category);
    })
    .map(([itemId, item]) => ({
      itemId,
      ...item,
      quantity: inventory.items[itemId],
      equipped: Boolean(item.slot && inventory.equipment?.[item.slot] === itemId),
    }));
}
