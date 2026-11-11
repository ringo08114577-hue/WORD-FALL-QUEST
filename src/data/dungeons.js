/**
 * Content catalog: dungeon definitions.
 * Encounter sets are ordered enemy IDs. Sets cycle as the player climbs floors.
 */
export const DEFAULT_DUNGEON_ID = "forest-ruins";

export const DUNGEON_DEFINITIONS = Object.freeze({
  "forest-ruins": Object.freeze({
    id: "forest-ruins",
    name: "はじまりの森",
    icon: "🌲",
    difficulty: "初級",
    recommendedLevel: 1,
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
  "frozen-cavern": Object.freeze({
    id: "frozen-cavern",
    name: "氷結の洞窟",
    icon: "❄️",
    difficulty: "中級",
    recommendedLevel: 3,
    description: "氷狼や氷のゴーレムが守る寒冷地の洞窟。最奥には氷結のドラゴンが待つ。",
    encounterSets: Object.freeze([
      Object.freeze(["ice-wolf", "orc", "ice-golem"]),
      Object.freeze(["ice-wolf", "ice-golem", "ice-dragon"]),
      Object.freeze(["orc", "ice-golem", "ice-dragon"]),
    ]),
    reward: Object.freeze({
      baseGold: 15,
      goldPerFloor: 7,
      itemQuantity: 1,
      oddFloorItemId: "large-potion",
      evenFloorItemId: "small-potion",
    }),
  }),
});
