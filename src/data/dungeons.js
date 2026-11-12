/**
 * Dungeon catalog. Each dungeon has five ordered floors; the fifth floor is
 * guarded by its boss. Earlier encounter layouts remain here for old saves.
 */
export const DEFAULT_DUNGEON_ID = "forest-ruins";

export const DUNGEON_DEFINITIONS = Object.freeze({
  "forest-ruins": Object.freeze({
    id: "forest-ruins",
    name: "はじまりの森",
    icon: "🌲",
    difficulty: "初級",
    recommendedLevel: 1,
    floorCount: 5,
    description: "スライムやゴブリンが待ち受ける森。最深部には森のドラゴンがいる。",
    legacyEncounterSet: Object.freeze(["slime", "bat", "goblin"]),
    legacyEncounterSetsV2: Object.freeze([
      Object.freeze(["slime", "bat", "goblin"]),
      Object.freeze(["bat", "orc", "moss-golem"]),
      Object.freeze(["goblin", "moss-golem", "forest-dragon"]),
    ]),
    encounterSets: Object.freeze([
      Object.freeze(["slime", "bat", "goblin"]),
      Object.freeze(["bat", "orc", "moss-golem"]),
      Object.freeze(["goblin", "orc", "moss-golem"]),
      Object.freeze(["orc", "moss-golem", "goblin"]),
      Object.freeze(["moss-golem", "goblin", "forest-dragon"]),
    ]),
    reward: Object.freeze({
      baseGold: 10,
      goldPerFloor: 5,
      itemQuantity: 1,
      oddFloorItemId: "small-potion",
      evenFloorItemId: "large-potion",
    }),
    clearReward: Object.freeze({
      itemId: "forest-dragon-seal",
      quantity: 1,
      gold: 100,
    }),
  }),
  "frozen-cavern": Object.freeze({
    id: "frozen-cavern",
    name: "氷結の洞窟",
    icon: "❄️",
    difficulty: "中級",
    recommendedLevel: 3,
    floorCount: 5,
    description: "氷狼や氷のゴーレムが守る洞窟。最深部には氷結のドラゴンが待つ。",
    legacyEncounterSetsV2: Object.freeze([
      Object.freeze(["ice-wolf", "orc", "ice-golem"]),
      Object.freeze(["ice-wolf", "ice-golem", "ice-dragon"]),
      Object.freeze(["orc", "ice-golem", "ice-dragon"]),
    ]),
    encounterSets: Object.freeze([
      Object.freeze(["ice-wolf", "orc", "ice-golem"]),
      Object.freeze(["ice-wolf", "ice-golem", "orc"]),
      Object.freeze(["orc", "ice-golem", "ice-wolf"]),
      Object.freeze(["ice-golem", "orc", "ice-wolf"]),
      Object.freeze(["orc", "ice-golem", "ice-dragon"]),
    ]),
    reward: Object.freeze({
      baseGold: 15,
      goldPerFloor: 7,
      itemQuantity: 1,
      oddFloorItemId: "large-potion",
      evenFloorItemId: "small-potion",
    }),
    clearReward: Object.freeze({
      itemId: "ice-dragon-core",
      quantity: 1,
      gold: 150,
    }),
  }),
});
