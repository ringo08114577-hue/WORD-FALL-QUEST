/** Content catalog: equipment slots and every usable/equippable item. */
export const EQUIPMENT_SLOTS = Object.freeze(["weapon", "shield", "armor", "accessory"]);
export const EQUIPMENT_SLOT_LABELS = Object.freeze({
  weapon: "武器", shield: "盾", armor: "鎧", accessory: "アクセサリー",
});

export const ITEM_DEFINITIONS = Object.freeze({
  "small-potion": Object.freeze({
    id: "small-potion", name: "回復薬", type: "consumable", effect: "heal",
    healAmount: 2, startingQuantity: 2, shopPrice: 15, description: "HPを2回復する。",
  }),
  "large-potion": Object.freeze({
    id: "large-potion", name: "大きな回復薬", type: "consumable", effect: "heal",
    healAmount: 4, shopPrice: 30, description: "HPを4回復する。",
  }),
  "wooden-sword": Object.freeze({
    id: "wooden-sword", name: "木の剣", type: "weapon", slot: "weapon",
    attackBonus: 1, startingQuantity: 1, description: "攻撃力が1上がる。",
  }),
  "wooden-shield": Object.freeze({
    id: "wooden-shield", name: "木の盾", type: "shield", slot: "shield",
    defenseBonus: 1, shopPrice: 30, description: "防御力が1上がる。",
  }),
  "iron-sword": Object.freeze({
    id: "iron-sword", name: "鉄の剣", type: "weapon", slot: "weapon",
    attackBonus: 2, shopPrice: 80, description: "攻撃力が2上がる。",
  }),
  "leather-armor": Object.freeze({
    id: "leather-armor", name: "革の鎧", type: "armor", slot: "armor",
    defenseBonus: 1, shopPrice: 65, description: "防御力が1上がる。",
  }),
  "copper-charm": Object.freeze({
    id: "copper-charm", name: "銅のお守り", type: "accessory", slot: "accessory",
    attackBonus: 1, defenseBonus: 1, shopPrice: 90,
    description: "攻撃力と防御力が1ずつ上がる。",
  }),
});
