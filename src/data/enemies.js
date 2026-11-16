/** Content catalog: enemy species and reusable enemy abilities. */
export const ENEMY_ABILITY_DEFINITIONS = Object.freeze({
  swift: Object.freeze({
    id: "swift", name: "すばやい反撃",
    description: "間違った文字への反撃が10強くなる。",
    counterAttackBonus: 10,
  }),
  guard: Object.freeze({
    id: "guard", name: "かたい体",
    description: "単語攻撃で受けるダメージを10減らす。",
    damageReduction: 10,
  }),
  piercing: Object.freeze({
    id: "piercing", name: "防御突破",
    description: "反撃時にプレイヤーの防御力を10無視する。",
    defensePiercing: 10,
  }),
  crushing: Object.freeze({
    id: "crushing", name: "重い一撃",
    description: "間違った文字への反撃が1強くなる。",
    counterAttackBonus: 1,
  }),
});

export const ENEMY_DEFINITIONS = Object.freeze({
  slime: Object.freeze({
    id: "slime", name: "スライム", maxHp: 160, attackPower: 20,
    experienceReward: 100, abilities: Object.freeze([]),
  }),
  bat: Object.freeze({
    id: "bat", name: "コウモリ", maxHp: 180, attackPower: 25,
    experienceReward: 120, abilities: Object.freeze(["swift"]),
  }),
  goblin: Object.freeze({
    id: "goblin", name: "ゴブリン", maxHp: 230, attackPower: 25,
    experienceReward: 150, abilities: Object.freeze(["guard"]),
  }),
  orc: Object.freeze({
    id: "orc", name: "オーク", maxHp: 300, attackPower: 35,
    experienceReward: 200, abilities: Object.freeze(["piercing"]),
  }),
  "moss-golem": Object.freeze({
    id: "moss-golem", name: "こけゴーレム", maxHp: 420, attackPower: 40,
    experienceReward: 280, abilities: Object.freeze(["guard", "crushing"]),
  }),
  "forest-dragon": Object.freeze({
    id: "forest-dragon", name: "森のドラゴン", maxHp: 800, attackPower: 50,
    experienceReward: 550, isBoss: true,
    abilities: Object.freeze(["swift", "guard", "piercing"]),
  }),
  "ice-wolf": Object.freeze({
    id: "ice-wolf", name: "氷狼", maxHp: 330, attackPower: 35,
    experienceReward: 250, abilities: Object.freeze(["swift"]),
  }),
  "ice-golem": Object.freeze({
    id: "ice-golem", name: "氷のゴーレム", maxHp: 500, attackPower: 45,
    experienceReward: 350, abilities: Object.freeze(["guard", "crushing"]),
  }),
  "ice-dragon": Object.freeze({
    id: "ice-dragon", name: "氷結のドラゴン", maxHp: 1000, attackPower: 60,
    experienceReward: 700, isBoss: true,
    abilities: Object.freeze(["swift", "guard", "piercing"]),
  }),
});
