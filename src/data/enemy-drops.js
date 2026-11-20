/**
 * Monster material drop tables.
 * Each entry is checked independently; rare bonus materials can drop together
 * with the common material. Quantity is rolled only after a successful drop.
 */
const drop = (itemId, chance, minQuantity = 1, maxQuantity = minQuantity) =>
  Object.freeze({ itemId, chance, minQuantity, maxQuantity });

export const ENEMY_DROP_TABLES = Object.freeze({
  slime: Object.freeze([
    drop("slime-gel", 0.70, 1, 2),
  ]),
  "orange-slime": Object.freeze([
    drop("orange-gel", 0.75, 1, 2),
    drop("slime-core", 0.15),
  ]),
  bat: Object.freeze([
    drop("bat-wing", 0.70, 1, 2),
    drop("bat-silk", 0.20),
  ]),
  goblin: Object.freeze([
    drop("goblin-cloth", 0.70, 1, 2),
    drop("goblin-medal", 0.15),
  ]),
  orc: Object.freeze([
    drop("orc-fang", 0.75, 1, 2),
    drop("orc-hide", 0.20),
  ]),
  "moss-golem": Object.freeze([
    drop("moss-stone", 0.80, 1, 2),
    drop("moss-crystal", 0.20),
  ]),
  "forest-dragon": Object.freeze([
    drop("forest-dragon-scale", 1),
    drop("forest-dragon-heart", 0.25),
  ]),
  "ice-wolf": Object.freeze([
    drop("ice-wolf-fang", 0.75, 1, 2),
    drop("ice-wolf-fur", 0.20),
  ]),
  "ice-golem": Object.freeze([
    drop("ice-crystal", 0.80, 1, 2),
    drop("frozen-ore", 0.20),
  ]),
  "ice-dragon": Object.freeze([
    drop("ice-dragon-scale", 1),
    drop("ice-dragon-heart", 0.25),
  ]),
});
