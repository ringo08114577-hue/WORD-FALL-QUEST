/**
 * Town smithy controller. The reducer revalidates every recipe before consuming it.
 */
import { GAME_ACTION, GAME_PHASE } from "./game-state.js";
import { ITEM_DEFINITIONS } from "./items.js";
import { CRAFTING_RECIPES } from "./data/crafting-recipes.js";

export { CRAFTING_RECIPES };

export function createCraftingController(store) {
  if (!store || typeof store.getState !== "function" || typeof store.dispatch !== "function") {
    throw new TypeError("crafting controllerにはgame storeが必要です。");
  }

  return {
    craft(itemId) {
      const recipe = Object.hasOwn(CRAFTING_RECIPES, itemId)
        ? CRAFTING_RECIPES[itemId]
        : null;
      const item = Object.hasOwn(ITEM_DEFINITIONS, itemId)
        ? ITEM_DEFINITIONS[itemId]
        : null;
      if (!recipe || !item || !item.slot) {
        return { crafted: false, reason: "unknown-recipe" };
      }

      const state = store.getState();
      if (state.phase !== GAME_PHASE.TITLE) {
        return { crafted: false, reason: "not-at-smithy" };
      }
      for (const [materialId, required] of Object.entries(recipe.materials)) {
        if ((state.inventory.items[materialId] ?? 0) < required) {
          return { crafted: false, reason: "not-enough-materials" };
        }
      }
      if (state.inventory.gold < recipe.gold) {
        return { crafted: false, reason: "not-enough-gold" };
      }

      const next = store.dispatch({ type: GAME_ACTION.CRAFT_ITEM, itemId });
      if (next === state) {
        return { crafted: false, reason: "craft-rejected" };
      }
      return {
        crafted: true,
        item,
        recipe,
        gold: next.inventory.gold,
        quantity: next.inventory.items[itemId],
      };
    },
  };
}
