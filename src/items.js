/**
 * Item domain logic. Add item definitions in ./data/items.js.
 * Shop prices and starting inventory are derived from the catalog.
 */
import {
  EQUIPMENT_SLOTS, EQUIPMENT_SLOT_LABELS, ITEM_DEFINITIONS,
} from "./data/items.js";
import { ELEMENT_IDS, isElementId } from "./elements.js";

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
        total.magicBonus += item.magicBonus ?? 0;
        total.defenseBonus += item.defenseBonus ?? 0;
        total.maxHpBonus += item.maxHpBonus ?? 0;
      }
      return total;
    },
    { attackBonus: 0, magicBonus: 0, defenseBonus: 0, maxHpBonus: 0 },
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

/**
 * Collect optional elemental properties from each currently equipped item.
 * Modifiers are decimals: 0.10 means +10%, while -0.10 means a 10% weakness.
 */
export function getEquipmentElementalBonuses(equipment = {}) {
  const equipped = equipment && typeof equipment === "object" ? equipment : {};
  const result = {
    attackElement: null,
    attackBonus: Object.fromEntries(ELEMENT_IDS.map((element) => [element, 0])),
    resistance: Object.fromEntries(ELEMENT_IDS.map((element) => [element, 0])),
  };
  for (const slot of EQUIPMENT_SLOTS) {
    const itemId = equipped[slot];
    const item = typeof itemId === "string" && Object.hasOwn(ITEM_DEFINITIONS, itemId)
      ? ITEM_DEFINITIONS[itemId] : null;
    if (!item) continue;
    if (slot === "weapon" && isElementId(item.attackElement)) result.attackElement = item.attackElement;
    for (const element of ELEMENT_IDS) {
      const attackBonus = item.elementalAttackBonus?.[element];
      if (Number.isFinite(attackBonus)) result.attackBonus[element] += attackBonus;
      const resistance = item.elementalResistance?.[element];
      if (Number.isFinite(resistance)) result.resistance[element] += resistance;
    }
  }
  return Object.freeze({
    attackElement: result.attackElement,
    attackBonus: Object.freeze(result.attackBonus),
    resistance: Object.freeze(result.resistance),
  });
}

/** Combined resistance is bounded so multiple pieces cannot erase all damage. */
export function getElementalResistanceMultiplier(equipment, element) {
  if (!isElementId(element)) return 1;
  const bonuses = getEquipmentElementalBonuses(equipment);
  const resistance = Math.max(-0.5, Math.min(0.75, bonuses.resistance[element] ?? 0));
  return 1 - resistance;
}
