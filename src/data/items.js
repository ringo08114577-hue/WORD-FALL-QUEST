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
  // Materials dropped by monsters. sellPrice is used by trading; recipes live in crafting-recipes.js.
  "slime-gel": Object.freeze({
    id: "slime-gel", name: "グリーンスライムのゼリー", type: "material", sellPrice: 4,
    description: "グリーンスライムから手に入る、若葉色のゼリー。",
  }),
  "orange-gel": Object.freeze({
    id: "orange-gel", name: "オレンジゼリー", type: "material", sellPrice: 6,
    description: "オレンジスライムから手に入る、少し濃いゼリー。",
  }),
  "slime-core": Object.freeze({
    id: "slime-core", name: "グリーンスライムの森の魔力核", type: "material", sellPrice: 15,
    description: "グリーンスライムの体内にある、森の魔力を宿した核。",
  }),
  "bat-wing": Object.freeze({
    id: "bat-wing", name: "お化けコウモリの翼", type: "material", sellPrice: 7,
    description: "お化けコウモリの大きな翼。軽い装備の素材になる。",
  }),
  "bat-silk": Object.freeze({
    id: "bat-silk", name: "お化けコウモリの羽根", type: "material", sellPrice: 18,
    description: "お化けコウモリから落ちる、柔らかく軽い羽根。",
  }),
  "goblin-cloth": Object.freeze({
    id: "goblin-cloth", name: "ゴブリンの布切れ", type: "material", sellPrice: 8,
    description: "ゴブリンが身につけていた布切れ。",
  }),
  "goblin-medal": Object.freeze({
    id: "goblin-medal", name: "ゴブリンのお守り", type: "material", sellPrice: 20,
    description: "ゴブリンが身につけていた、小さなお守り。",
  }),
  "orc-fang": Object.freeze({
    id: "orc-fang", name: "オークの牙", type: "material", sellPrice: 12,
    description: "オークの鋭い牙。武器や盾の素材になる。",
  }),
  "orc-hide": Object.freeze({
    id: "orc-hide", name: "オークの硬い皮", type: "material", sellPrice: 16,
    description: "オークの体を覆う、厚くて丈夫な皮。",
  }),
  "moss-stone": Object.freeze({
    id: "moss-stone", name: "苔ゴーレムの石片", type: "material", sellPrice: 12,
    description: "苔ゴーレムの体を形作る石のかけら。",
  }),
  "moss-crystal": Object.freeze({
    id: "moss-crystal", name: "苔ゴーレムの魔力核", type: "material", sellPrice: 28,
    description: "苔ゴーレムの体内にある、緑色の魔力核。",
  }),
  "forest-dragon-scale": Object.freeze({
    id: "forest-dragon-scale", name: "森のドラゴンのうろこ", type: "material", sellPrice: 45,
    description: "森のドラゴンが落とす、硬くて貴重なうろこ。",
  }),
  "forest-dragon-heart": Object.freeze({
    id: "forest-dragon-heart", name: "森のドラゴンの心核", type: "material", sellPrice: 85,
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
  // Additional character-specific materials. Keep sell values modest: crafting is the main use.
  "green-slime-moss-mucus": Object.freeze({
    id: "green-slime-moss-mucus", name: "グリーンスライムの苔粘液", type: "material", sellPrice: 7,
    description: "グリーンスライムから手に入る、苔の香りがする粘液。",
  }),
  "plain-slime-gel": Object.freeze({
    id: "plain-slime-gel", name: "スライムのゼリー", type: "material", sellPrice: 4,
    description: "スライムから手に入る、ぷるぷるしたゼリー。",
  }),
  "plain-slime-mucus": Object.freeze({
    id: "plain-slime-mucus", name: "スライムの粘液", type: "material", sellPrice: 5,
    description: "スライムの体から採れる、少し粘りのある素材。",
  }),
  "plain-slime-magic-core": Object.freeze({
    id: "plain-slime-magic-core", name: "スライムの魔力核", type: "material", sellPrice: 15,
    description: "スライムからまれに手に入る、小さな魔力の結晶。",
  }),
  "bat-dark-crystal": Object.freeze({
    id: "bat-dark-crystal", name: "お化けコウモリの暗闇結晶", type: "material", sellPrice: 18,
    description: "お化けコウモリからまれに手に入る、暗い光を放つ結晶。",
  }),
  "goblin-fang": Object.freeze({
    id: "goblin-fang", name: "ゴブリンの牙", type: "material", sellPrice: 8,
    description: "ゴブリンの小さな牙。武器や道具の素材になる。",
  }),
  "orc-warrior-emblem": Object.freeze({
    id: "orc-warrior-emblem", name: "オークの戦士の紋章", type: "material", sellPrice: 22,
    description: "オークの戦士が持つ、力を示す紋章。",
  }),
  "poison-mushroom-cap": Object.freeze({
    id: "poison-mushroom-cap", name: "毒キノコの傘", type: "material", sellPrice: 5,
    description: "毒キノコの傘。加工すると薬や道具の素材になる。",
  }),
  "poison-mushroom-mycelium": Object.freeze({
    id: "poison-mushroom-mycelium", name: "毒キノコの菌糸", type: "material", sellPrice: 7,
    description: "毒キノコの根元から採れる細い菌糸。",
  }),
  "poison-mushroom-toxic-spore": Object.freeze({
    id: "poison-mushroom-toxic-spore", name: "毒キノコの濃縮毒胞子", type: "material", sellPrice: 20,
    description: "毒キノコからまれに手に入る、強い毒を含む胞子。",
  }),
  "forest-spider-leg": Object.freeze({
    id: "forest-spider-leg", name: "森の大グモの脚", type: "material", sellPrice: 7,
    description: "森の大グモの硬い脚。装備の補強に使える。",
  }),
  "forest-spider-thread": Object.freeze({
    id: "forest-spider-thread", name: "森の大グモの糸", type: "material", sellPrice: 10,
    description: "森の大グモが作る、丈夫で細い糸。",
  }),
  "forest-spider-queen-silkball": Object.freeze({
    id: "forest-spider-queen-silkball", name: "森の大グモの女王糸玉", type: "material", sellPrice: 24,
    description: "森の大グモからまれに手に入る、特別に強い糸玉。",
  }),
  "moss-golem-rock-arm": Object.freeze({
    id: "moss-golem-rock-arm", name: "苔ゴーレムの岩腕", type: "material", sellPrice: 12,
    description: "苔ゴーレムの腕を形作っていた頑丈な岩。",
  }),
  "grandvel-giant-horn": Object.freeze({
    id: "grandvel-giant-horn", name: "グランヴェルの巨角", type: "material", sellPrice: 18,
    description: "グランヴェルの大きな角。武器の素材になる。",
  }),
  "grandvel-guardian-fur": Object.freeze({
    id: "grandvel-guardian-fur", name: "グランヴェルの守護毛", type: "material", sellPrice: 22,
    description: "グランヴェルの体を覆う、丈夫な毛。",
  }),
  "grandvel-deep-green-crystal": Object.freeze({
    id: "grandvel-deep-green-crystal", name: "グランヴェルの深緑結晶", type: "material", sellPrice: 38,
    description: "グランヴェルからまれに手に入る、深い森の力を宿した結晶。",
  }),
  "morgal-venom-fang": Object.freeze({
    id: "morgal-venom-fang", name: "モルガルの毒牙", type: "material", sellPrice: 18,
    description: "モルガルの牙。かすかに毒が残っている。",
  }),
  "morgal-serpent-hide": Object.freeze({
    id: "morgal-serpent-hide", name: "モルガルの蛇皮", type: "material", sellPrice: 22,
    description: "モルガルの体を覆う、しなやかな皮。",
  }),
  "morgal-venom-crystal": Object.freeze({
    id: "morgal-venom-crystal", name: "モルガルの猛毒結晶", type: "material", sellPrice: 38,
    description: "モルガルからまれに手に入る、毒の力を閉じ込めた結晶。",
  }),
  "loggar-rotten-wood": Object.freeze({
    id: "loggar-rotten-wood", name: "ログガルの朽木", type: "material", sellPrice: 16,
    description: "ログガルの体を形作る、古くなった木材。",
  }),
  "loggar-roots": Object.freeze({
    id: "loggar-roots", name: "ログガルの根", type: "material", sellPrice: 22,
    description: "ログガルから採れる、地面に深く伸びた根。",
  }),
  "loggar-ancient-core": Object.freeze({
    id: "loggar-ancient-core", name: "ログガルの古樹の核", type: "material", sellPrice: 40,
    description: "ログガルからまれに手に入る、古い森の力を持つ核。",
  }),
  "volgrif-thunder-feather": Object.freeze({
    id: "volgrif-thunder-feather", name: "ヴォルグリフの雷羽", type: "material", sellPrice: 18,
    description: "ヴォルグリフの翼に生える、雷を帯びた羽根。",
  }),
  "volgrif-great-claw": Object.freeze({
    id: "volgrif-great-claw", name: "ヴォルグリフの大爪", type: "material", sellPrice: 22,
    description: "ヴォルグリフの鋭く大きな爪。",
  }),
  "volgrif-thunder-crystal": Object.freeze({
    id: "volgrif-thunder-crystal", name: "ヴォルグリフの雷鳴結晶", type: "material", sellPrice: 40,
    description: "ヴォルグリフからまれに手に入る、雷の力を宿した結晶。",
  }),
  "slime-buckler": Object.freeze({
    id: "slime-buckler", name: "スライムバックラー", type: "shield", slot: "shield",
    defenseBonus: 16, description: "スライムゼリーを固めて作った軽い盾。防御力が16上がる。",
  }),
  "bat-cloak": Object.freeze({
    id: "bat-cloak", name: "コウモリマント", type: "armor", slot: "armor",
    defenseBonus: 20, maxHpBonus: 100, description: "コウモリの素材で作った軽いマント。防御力が20、最大HPが100上がる。",
  }),
  "orc-fang-blade": Object.freeze({
    id: "orc-fang-blade", name: "オークファング", type: "weapon", slot: "weapon",
    attackBonus: 35, description: "オークの牙を加工した大剣。攻撃力が35上がる。",
  }),
  "moss-guardian-armor": Object.freeze({
    id: "moss-guardian-armor", name: "苔守りの鎧", type: "armor", slot: "armor",
    defenseBonus: 35, maxHpBonus: 180,
    elementalResistance: Object.freeze({ earth: 0.15 }),
    description: "苔の結晶で補強した重い鎧。防御力が35、最大HPが180上がり、土属性ダメージを15%軽減する。",
  }),
  "wolf-fang-sword": Object.freeze({
    id: "wolf-fang-sword", name: "氷狼の牙剣", type: "weapon", slot: "weapon",
    attackBonus: 50, attackElement: "water",
    description: "氷狼の牙と氷結鉱石を使った水属性の剣。攻撃力が50上がる。",
  }),
  "ice-crystal-charm": Object.freeze({
    id: "ice-crystal-charm", name: "氷晶のお守り", type: "accessory", slot: "accessory",
    attackBonus: 25, defenseBonus: 25, maxHpBonus: 120,
    elementalResistance: Object.freeze({ water: 0.10 }),
    description: "氷の結晶を磨いて作ったお守り。攻撃力・防御力が25、最大HPが120上がり、水属性ダメージを10%軽減する。",
  }),
  "forest-dragon-sword": Object.freeze({
    id: "forest-dragon-sword", name: "森竜の大剣", type: "weapon", slot: "weapon",
    attackBonus: 75, attackElement: "wind",
    elementalAttackBonus: Object.freeze({ wind: 0.10 }),
    description: "森竜の心核を宿した風属性の大剣。攻撃力が75上がり、風属性ダメージが10%増える。",
  }),
  "ice-dragon-armor": Object.freeze({
    id: "ice-dragon-armor", name: "氷竜の鎧", type: "armor", slot: "armor",
    defenseBonus: 65, maxHpBonus: 300,
    elementalResistance: Object.freeze({ water: 0.20, fire: -0.10 }),
    description: "氷竜の素材で鍛えた最上級の鎧。防御力が65、最大HPが300上がり、水属性ダメージを20%軽減するが炎属性には弱い。",
  }),
});
