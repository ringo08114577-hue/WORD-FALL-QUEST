/** Content catalog: enemy species and reusable enemy abilities. */
export const ENEMY_ABILITY_DEFINITIONS = Object.freeze({
  swift: Object.freeze({
    id: "swift", name: "すばやい反撃",
    description: "間違った文字への反撃が1強くなる。",
    counterAttackBonus: 1,
  }),
  guard: Object.freeze({
    id: "guard", name: "かたい体",
    description: "単語攻撃で受けるダメージを1減らす。",
    damageReduction: 1,
  }),
  piercing: Object.freeze({
    id: "piercing", name: "防御突破",
    description: "反撃時にプレイヤーの防御力を1無視する。",
    defensePiercing: 1,
  }),
  crushing: Object.freeze({
    id: "crushing", name: "重い一撃",
    description: "間違った文字への反撃が1強くなる。",
    counterAttackBonus: 1,
  }),
});

export const ENEMY_DEFINITIONS = Object.freeze({
  slime: Object.freeze({
    id: "slime", name: "スライム", maxHp: 3, attackPower: 1,
    experienceReward: 10, abilities: Object.freeze([]),
  }),
  bat: Object.freeze({
    id: "bat", name: "コウモリ", maxHp: 3, attackPower: 1,
    experienceReward: 12, abilities: Object.freeze(["swift"]),
  }),
  goblin: Object.freeze({
    id: "goblin", name: "ゴブリン", maxHp: 4, attackPower: 1,
    experienceReward: 15, abilities: Object.freeze(["guard"]),
  }),
  orc: Object.freeze({
    id: "orc", name: "オーク", maxHp: 5, attackPower: 2,
    experienceReward: 20, abilities: Object.freeze(["piercing"]),
  }),
  "moss-golem": Object.freeze({
    id: "moss-golem", name: "こけゴーレム", maxHp: 7, attackPower: 2,
    experienceReward: 28, abilities: Object.freeze(["guard", "crushing"]),
  }),
  "forest-dragon": Object.freeze({
    id: "forest-dragon", name: "森のドラゴン", maxHp: 10, attackPower: 2,
    experienceReward: 55, isBoss: true,
    abilities: Object.freeze(["swift", "guard", "piercing"]),
  }),
  "ice-wolf": Object.freeze({
    id: "ice-wolf", name: "氷狼", maxHp: 5, attackPower: 2,
    experienceReward: 25, abilities: Object.freeze(["swift"]),
  }),
  "ice-golem": Object.freeze({
    id: "ice-golem", name: "氷のゴーレム", maxHp: 9, attackPower: 2,
    experienceReward: 35, abilities: Object.freeze(["guard", "crushing"]),
  }),
  "ice-dragon": Object.freeze({
    id: "ice-dragon", name: "氷結のドラゴン", maxHp: 13, attackPower: 3,
    experienceReward: 70, isBoss: true,
    abilities: Object.freeze(["swift", "guard", "piercing"]),
  }),
});
