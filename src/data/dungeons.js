/**
 * Content catalog: dungeon definitions.
 * Encounter sets are ordered enemy IDs. Sets cycle as the player climbs floors.
 */
export const DEFAULT_DUNGEON_ID = "forest-ruins";

export const DUNGEON_DEFINITIONS = Object.freeze({
  "forest-ruins": Object.freeze({
    id: "forest-ruins",
    name: "はじまりの森",
    description: "スライムやコウモリが待ち受ける最初のダンジョン。",
    // Kept for saves created before encounter-set version 2.
    legacyEncounterSet: Object.freeze(["slime", "bat", "goblin"]),
    encounterSets: Object.freeze([
      Object.freeze(["slime", "bat", "goblin"]),
      Object.freeze(["bat", "orc", "moss-golem"]),
      Object.freeze(["goblin", "moss-golem", "forest-dragon"]),
    ]),
    reward: Object.freeze({
      baseGold: 10,
      goldPerFloor: 5,
      itemQuantity: 1,
      oddFloorItemId: "small-potion",
      evenFloorItemId: "large-potion",
    }),
  }),
});
