/** Content catalog: equipment slots and every usable/equippable item. */
export const EQUIPMENT_SLOTS = Object.freeze(["weapon", "shield", "armor", "accessory"]);
export const EQUIPMENT_SLOT_LABELS = Object.freeze({
  weapon: "武器", shield: "盾", armor: "鎧", accessory: "アクセサリー",
});

export const ITEM_DEFINITIONS = Object.freeze({
  "small-potion": Object.freeze({
    id: "small-potion", name: "回復薬", type: "consumable", effect: "heal",
    healAmount: 20, startingQuantity: 2, shopPrice: 15, description: "HPを20回復する。",
  }),
  "large-potion": Object.freeze({
    id: "large-potion", name: "大きな回復薬", type: "consumable", effect: "heal",
    healAmount: 40, shopPrice: 30, description: "HPを40回復する。",
  }),
  "wooden-sword": Object.freeze({
    id: "wooden-sword", name: "木の剣", type: "weapon", slot: "weapon",
    attackBonus: 10, startingQuantity: 1, description: "攻撃力が10上がる。",
  }),
  "wooden-shield": Object.freeze({
    id: "wooden-shield", name: "木の盾", type: "shield", slot: "shield",
    defenseBonus: 10, shopPrice: 30, description: "防御力が10上がる。",
  }),
  "iron-sword": Object.freeze({
    id: "iron-sword", name: "鉄の剣", type: "weapon", slot: "weapon",
    attackBonus: 20, shopPrice: 80, description: "攻撃力が20上がる。",
  }),
  "leather-armor": Object.freeze({
    id: "leather-armor", name: "革の鎧", type: "armor", slot: "armor",
    defenseBonus: 15, maxHpBonus: 120, shopPrice: 65, description: "防御力が15、最大HPが120上がる。",
  }),
  "copper-charm": Object.freeze({
    id: "copper-charm", name: "銅のお守り", type: "accessory", slot: "accessory",
    attackBonus: 10, defenseBonus: 10, maxHpBonus: 60, shopPrice: 90,
    description: "攻撃力と防御力が10、最大HPが60上がる。",
  }),
  "forest-dragon-seal": Object.freeze({
    id: "forest-dragon-seal", name: "森竜の紋章", type: "material",
    description: "はじまりの森を初めて制覇した証。今後の素材システムで使用予定。",
  }),
  "ice-dragon-core": Object.freeze({
    id: "ice-dragon-core", name: "氷竜の結晶", type: "material",
    description: "氷結の洞窟を初めて制覇した証。今後の素材システムで使用予定。",
  }),
});
