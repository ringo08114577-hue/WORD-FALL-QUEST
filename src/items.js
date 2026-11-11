/**
 * Item domain logic. Add item definitions in ./data/items.js.
 * Shop prices and starting inventory are derived from the catalog.
 */
import {
  EQUIPMENT_SLOTS, EQUIPMENT_SLOT_LABELS, ITEM_DEFINITIONS,
} from "./data/items.js";

export { EQUIPMENT_SLOTS, EQUIPMENT_SLOT_LABELS, ITEM_DEFINITIONS };

export const ITEM_SHOP_PRICES = Object.freeze(
  Object.fromEntries(
    Object.entries(ITEM_DEFINITIONS)
      .filter(([, item]) => Number.isSafeInteger(item.shopPrice) && item.shopPrice > 0)
      .map(([itemId, item]) => [itemId, item.shopPrice]),
  ),
);

export function isEquipmentItem(item) {
  return Boolean(item && EQUIPMENT_SLOTS.includes(item.slot));
}

export function getEquipmentBonuses(equipment = {}) {
  const equipped = equipment && typeof equipment === "object" ? equipment : {};
  return EQUIPMENT_SLOTS.reduce(
    (total, slot) => {
      const item = equipped[slot] && Object.hasOwn(ITEM_DEFINITIONS, equipped[slot])
        ? ITEM_DEFINITIONS[equipped[slot]]
        : null;
      if (item) {
        total.attackBonus += item.attackBonus ?? 0;
        total.defenseBonus += item.defenseBonus ?? 0;
      }
      return total;
    },
    { attackBonus: 0, defenseBonus: 0 },
  );
}

export function createInitialInventory() {
  return {
    items: Object.fromEntries(
      Object.entries(ITEM_DEFINITIONS).map(([itemId, item]) => [
        itemId,
        item.startingQuantity ?? 0,
      ]),
    ),
    equipment: Object.fromEntries(EQUIPMENT_SLOTS.map((slot) => [slot, null])),
  };
}
