/** Recipes for equipment forged from monster materials. */
export const CRAFTING_RECIPES = Object.freeze({
  "slime-buckler": Object.freeze({
    itemId: "slime-buckler",
    materials: Object.freeze({ "slime-gel": 5 }),
    gold: 35,
  }),
  "bat-cloak": Object.freeze({
    itemId: "bat-cloak",
    materials: Object.freeze({ "bat-wing": 5, "bat-silk": 1 }),
    gold: 65,
  }),
  "orc-fang-blade": Object.freeze({
    itemId: "orc-fang-blade",
    materials: Object.freeze({ "orc-fang": 4, "orc-hide": 2 }),
    gold: 110,
  }),
  "moss-guardian-armor": Object.freeze({
    itemId: "moss-guardian-armor",
    materials: Object.freeze({ "moss-stone": 6, "moss-crystal": 2 }),
    gold: 180,
  }),
  "wolf-fang-sword": Object.freeze({
    itemId: "wolf-fang-sword",
    materials: Object.freeze({ "ice-wolf-fang": 4, "ice-wolf-fur": 3, "frozen-ore": 1 }),
    gold: 230,
  }),
  "ice-crystal-charm": Object.freeze({
    itemId: "ice-crystal-charm",
    materials: Object.freeze({ "ice-crystal": 4, "frozen-ore": 2 }),
    gold: 260,
  }),
  "forest-dragon-sword": Object.freeze({
    itemId: "forest-dragon-sword",
    materials: Object.freeze({ "forest-dragon-scale": 4, "forest-dragon-heart": 1 }),
    gold: 420,
  }),
  "ice-dragon-armor": Object.freeze({
    itemId: "ice-dragon-armor",
    materials: Object.freeze({ "ice-dragon-scale": 4, "ice-dragon-heart": 1 }),
    gold: 480,
  }),
});
