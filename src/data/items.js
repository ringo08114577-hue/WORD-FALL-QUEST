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
  // Materials dropped by monsters. sellPrice will be used by the future selling feature.
  "slime-gel": Object.freeze({
    id: "slime-gel", name: "スライムゼリー", type: "material", sellPrice: 4,
    description: "スライムから手に入る、ぷるぷるした素材。防具作りに使える。",
  }),
  "orange-gel": Object.freeze({
    id: "orange-gel", name: "オレンジゼリー", type: "material", sellPrice: 6,
    description: "オレンジスライムから手に入る、少し濃いゼリー。",
  }),
  "slime-core": Object.freeze({
    id: "slime-core", name: "スライムコア", type: "material", sellPrice: 15,
    description: "オレンジスライムからまれに手に入る、魔力を帯びた核。",
  }),
  "bat-wing": Object.freeze({
    id: "bat-wing", name: "コウモリの羽", type: "material", sellPrice: 7,
    description: "お化けコウモリの羽。軽い装備の素材になる。",
  }),
  "bat-silk": Object.freeze({
    id: "bat-silk", name: "コウモリの薄布", type: "material", sellPrice: 18,
    description: "お化けコウモリからまれに手に入る、丈夫で軽い布。",
  }),
  "goblin-cloth": Object.freeze({
    id: "goblin-cloth", name: "ゴブリンの布", type: "material", sellPrice: 8,
    description: "ゴブリンが持っていた布切れ。防具作りに使える。",
  }),
  "goblin-medal": Object.freeze({
    id: "goblin-medal", name: "ゴブリンのメダル", type: "material", sellPrice: 20,
    description: "ゴブリンからまれに手に入る古びたメダル。",
  }),
  "orc-fang": Object.freeze({
    id: "orc-fang", name: "オークの牙", type: "material", sellPrice: 12,
    description: "オークの鋭い牙。武器や盾の素材になる。",
  }),
  "orc-hide": Object.freeze({
    id: "orc-hide", name: "オークの皮", type: "material", sellPrice: 16,
    description: "オークからまれに手に入る、厚くて丈夫な皮。",
  }),
  "moss-stone": Object.freeze({
    id: "moss-stone", name: "苔むした石", type: "material", sellPrice: 12,
    description: "こけゴーレムの体を形作る石のかけら。",
  }),
  "moss-crystal": Object.freeze({
    id: "moss-crystal", name: "苔の結晶", type: "material", sellPrice: 28,
    description: "こけゴーレムからまれに手に入る、緑色の結晶。",
  }),
  "forest-dragon-scale": Object.freeze({
    id: "forest-dragon-scale", name: "森竜のうろこ", type: "material", sellPrice: 45,
    description: "森のドラゴンが落とす、硬くて貴重なうろこ。",
  }),
  "forest-dragon-heart": Object.freeze({
    id: "forest-dragon-heart", name: "森竜の心核", type: "material", sellPrice: 85,
    description: "森のドラゴンからまれに手に入る、希少な素材。",
  }),
  "ice-wolf-fang": Object.freeze({
    id: "ice-wolf-fang", name: "氷狼の牙", type: "material", sellPrice: 14,
    description: "氷狼の鋭い牙。武器作りに使える。",
  }),
  "ice-wolf-fur": Object.freeze({
    id: "ice-wolf-fur", name: "氷狼の毛皮", type: "material", sellPrice: 18,
    description: "氷狼からまれに手に入る、暖かい毛皮。",
  }),
  "ice-crystal": Object.freeze({
    id: "ice-crystal", name: "氷の結晶", type: "material", sellPrice: 18,
    description: "氷のゴーレムの体から採れる結晶。",
  }),
  "frozen-ore": Object.freeze({
    id: "frozen-ore", name: "氷結鉱石", type: "material", sellPrice: 32,
    description: "氷のゴーレムからまれに手に入る、冷気を宿した鉱石。",
  }),
  "ice-dragon-scale": Object.freeze({
    id: "ice-dragon-scale", name: "氷竜のうろこ", type: "material", sellPrice: 55,
    description: "氷結のドラゴンが落とす、非常に硬い貴重なうろこ。",
  }),
  "ice-dragon-heart": Object.freeze({
    id: "ice-dragon-heart", name: "氷竜の心核", type: "material", sellPrice: 100,
    description: "氷結のドラゴンからまれに手に入る、極めて希少な素材。",
  }),
});
