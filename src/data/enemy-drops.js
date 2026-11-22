/**
 * Monster material drop tables.
 *
 * Each character owns an independent table. Chances are per item, not a
 * mutually exclusive roll: several materials can drop from one victory.
 * Common/secondary/rare defaults are 60% / 30% / 5%.
 */
const drop = (itemId, chance, minQuantity = 1, maxQuantity = minQuantity) =>
  Object.freeze({ itemId, chance, minQuantity, maxQuantity });

export const ENEMY_DROP_TABLES = Object.freeze({
  slime: Object.freeze([
    drop("slime-gel", 0.60, 1, 2),
    drop("green-slime-moss-mucus", 0.30),
    drop("slime-core", 0.05),
  ]),
  "plain-slime": Object.freeze([
    drop("plain-slime-gel", 0.60, 1, 2),
    drop("plain-slime-mucus", 0.30),
    drop("plain-slime-magic-core", 0.05),
  ]),
  "orange-slime": Object.freeze([
    drop("orange-gel", 0.60, 1, 2),
    drop("orange-slime-mucus", 0.30),
    drop("orange-slime-core", 0.05),
  ]),
  bat: Object.freeze([
    drop("bat-wing", 0.60, 1, 2),
    drop("bat-silk", 0.30),
    drop("bat-dark-crystal", 0.05),
  ]),
  goblin: Object.freeze([
    drop("goblin-cloth", 0.60, 1, 2),
    drop("goblin-fang", 0.30),
    drop("goblin-medal", 0.05),
  ]),
  "poison-mushroom": Object.freeze([
    drop("poison-mushroom-cap", 0.60, 1, 2),
    drop("poison-mushroom-mycelium", 0.30),
    drop("poison-mushroom-toxic-spore", 0.05),
  ]),
  "forest-spider": Object.freeze([
    drop("forest-spider-leg", 0.60, 1, 2),
    drop("forest-spider-thread", 0.30),
    drop("forest-spider-queen-silkball", 0.05),
  ]),
  orc: Object.freeze([
    drop("orc-fang", 0.60, 1, 2),
    drop("orc-hide", 0.30),
    drop("orc-warrior-emblem", 0.05),
  ]),
  "moss-golem": Object.freeze([
    drop("moss-stone", 0.60, 1, 2),
    drop("moss-golem-rock-arm", 0.30),
    drop("moss-crystal", 0.05),
  ]),
  grandvel: Object.freeze([
    drop("grandvel-giant-horn", 0.60),
    drop("grandvel-guardian-fur", 0.30),
    drop("grandvel-deep-green-crystal", 0.05),
  ]),
  morgal: Object.freeze([
    drop("morgal-venom-fang", 0.60),
    drop("morgal-serpent-hide", 0.30),
    drop("morgal-venom-crystal", 0.05),
  ]),
  loggar: Object.freeze([
    drop("loggar-rotten-wood", 0.60),
    drop("loggar-roots", 0.30),
    drop("loggar-ancient-core", 0.05),
  ]),
  volgrif: Object.freeze([
    drop("volgrif-thunder-feather", 0.60),
    drop("volgrif-great-claw", 0.30),
    drop("volgrif-thunder-crystal", 0.05),
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
