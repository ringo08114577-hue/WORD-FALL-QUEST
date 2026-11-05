/**
 * WORD FALL QUEST - Item definitions
 *
 * Keep item effects and equipment bonuses in data instead of combat code.
 */
export const ITEM_DEFINITIONS = Object.freeze({
  "small-potion": Object.freeze({
    id: "small-potion",
    name: "回復薬",
    type: "consumable",
    effect: "heal",
    healAmount: 2,
  }),
  "wooden-sword": Object.freeze({
    id: "wooden-sword",
    name: "木の剣",
    type: "weapon",
    attackBonus: 1,
  }),
});

export function createInitialInventory() {
  return {
    items: {
      "small-potion": 2,
      "wooden-sword": 1,
    },
    equipment: {
      weapon: null,
    },
  };
}
