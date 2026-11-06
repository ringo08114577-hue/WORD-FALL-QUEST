/**
 * WORD FALL QUEST - Item definitions
 *
 * Keep item effects and equipment bonuses in data instead of combat code.
 */
export const ITEM_SHOP_PRICES = Object.freeze({
  "small-potion": 15,
  "large-potion": 30,
  "wooden-shield": 30,
});

export const ITEM_DEFINITIONS = Object.freeze({
  "small-potion": Object.freeze({
    id: "small-potion",
    name: "回復薬",
    type: "consumable",
    effect: "heal",
    healAmount: 2,
  }),
  "large-potion": Object.freeze({
    id: "large-potion",
    name: "大きな回復薬",
    type: "consumable",
    effect: "heal",
    healAmount: 4,
  }),
  "wooden-sword": Object.freeze({
    id: "wooden-sword",
    name: "木の剣",
    type: "weapon",
    attackBonus: 1,
  }),
  "wooden-shield": Object.freeze({
    id: "wooden-shield",
    name: "木の盾",
    type: "shield",
    defenseBonus: 1,
  }),
});

export function createInitialInventory() {
  return {
    items: {
      "small-potion": 2,
      "large-potion": 0,
      "wooden-sword": 1,
      "wooden-shield": 0,
    },
    equipment: {
      weapon: null,
      shield: null,
    },
  };
}
