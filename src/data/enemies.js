/**
 * Enemy content catalog.
 *
 * Add a character here, then register its spawn rule in `encounter`.
 * Normal enemies use minFloor/maxFloor/weight. Mini-bosses and bosses use
 * exact floors. Dungeon encounter rules decide how many slots are filled.
 */
const ids = (...values) => Object.freeze(values);
const encounter = (type, dungeonIds, fields = {}) => Object.freeze({
  type,
  dungeonIds: ids(...dungeonIds),
  ...fields,
});

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
    description: "間違った文字への反撃が10強くなる。",
    counterAttackBonus: 10,
  }),
});

export const ENEMY_DEFINITIONS = Object.freeze({
  slime: Object.freeze({
    id: "slime", name: "グリーンスライム", rank: "normal",
    maxHp: 160, attackPower: 20, experienceReward: 30, abilities: ids(),
    description: "森の浅い場所に現れる、緑色の小さなスライム。",
    encounter: encounter("normal", ["forest-ruins"], { minFloor: 1, maxFloor: 2, weight: 12 }),
  }),
  "plain-slime": Object.freeze({
    id: "plain-slime", name: "スライム", rank: "normal",
    maxHp: 140, attackPower: 18, experienceReward: 25, abilities: ids(),
    description: "森の浅い場所に現れる、最も一般的なスライム。",
    encounter: encounter("normal", ["forest-ruins"], { minFloor: 1, maxFloor: 2, weight: 10 }),
  }),
  "orange-slime": Object.freeze({
    id: "orange-slime", name: "オレンジスライム", rank: "normal",
    maxHp: 190, attackPower: 23, experienceReward: 35, attackElement: "water",
    abilities: ids(),
    description: "水の力を少しだけ宿したスライム。別エリア向けの登録キャラ。",
  }),
  bat: Object.freeze({
    id: "bat", name: "お化けコウモリ", rank: "normal",
    maxHp: 180, attackPower: 25, experienceReward: 30, attackElement: "wind",
    abilities: ids("swift"),
    description: "暗い木々の間を飛び回る、すばやいコウモリ。",
    encounter: encounter("normal", ["forest-ruins"], { minFloor: 1, maxFloor: 5, weight: 8 }),
  }),
  goblin: Object.freeze({
    id: "goblin", name: "ゴブリン", rank: "normal",
    maxHp: 230, attackPower: 25, experienceReward: 35, abilities: ids("guard"),
    description: "森に住みついた小柄な魔物。身を守るのが得意。",
    encounter: encounter("normal", ["forest-ruins"], { minFloor: 1, maxFloor: 5, weight: 8 }),
  }),
  "poison-mushroom": Object.freeze({
    id: "poison-mushroom", name: "毒キノコ", rank: "normal",
    maxHp: 220, attackPower: 27, experienceReward: 35, attackElement: "earth",
    abilities: ids(),
    description: "胞子を飛ばして攻撃する、毒を持ったキノコ。",
    encounter: encounter("normal", ["forest-ruins"], { minFloor: 1, maxFloor: 5, weight: 5 }),
  }),
  "forest-spider": Object.freeze({
    id: "forest-spider", name: "森の大グモ", rank: "normal",
    maxHp: 260, attackPower: 30, experienceReward: 40, attackElement: "wind",
    abilities: ids("swift"),
    description: "木々の間に巣を張る、大型の森グモ。",
    encounter: encounter("normal", ["forest-ruins"], { minFloor: 1, maxFloor: 5, weight: 4 }),
  }),
  orc: Object.freeze({
    id: "orc", name: "オーク", rank: "normal",
    maxHp: 300, attackPower: 35, experienceReward: 45, abilities: ids("piercing"),
    description: "森の奥に住む、力の強い戦士。",
    encounter: encounter("normal", ["forest-ruins"], { minFloor: 3, maxFloor: 5, weight: 6 }),
  }),
  "moss-golem": Object.freeze({
    id: "moss-golem", name: "苔ゴーレム", rank: "normal",
    maxHp: 420, attackPower: 40, experienceReward: 60, attackElement: "earth",
    abilities: ids("guard", "crushing"),
    description: "苔むした岩でできた、森の奥の大型魔物。",
    encounter: encounter("normal", ["forest-ruins"], { minFloor: 3, maxFloor: 5, weight: 4 }),
  }),
  grandvel: Object.freeze({
    id: "grandvel", name: "深緑の守護獣 グランヴェル", rank: "miniBoss",
    maxHp: 520, attackPower: 38, experienceReward: 80,
    isMiniBoss: true, attackElement: "earth",
    elementalWeakness: "fire", elementalResistance: "earth",
    abilities: ids("guard", "crushing"),
    description: "巨大な角と苔むした体を持つ、森を守る古代の獣。",
    encounter: encounter("miniBoss", ["forest-ruins"], { floors: ids(1), weight: 1 }),
  }),
  morgal: Object.freeze({
    id: "morgal", name: "毒牙の大蛇 モルガル", rank: "miniBoss",
    maxHp: 500, attackPower: 40, experienceReward: 80,
    isMiniBoss: true, attackElement: "water",
    elementalWeakness: "thunder", elementalResistance: "water",
    abilities: ids("piercing"),
    description: "毒を帯びた牙を持つ、森の大蛇。",
    encounter: encounter("miniBoss", ["forest-ruins"], { floors: ids(2), weight: 1 }),
  }),
  loggar: Object.freeze({
    id: "loggar", name: "朽木の巨人 ログガル", rank: "miniBoss",
    maxHp: 620, attackPower: 36, experienceReward: 90,
    isMiniBoss: true, attackElement: "earth",
    elementalWeakness: "fire", elementalResistance: "earth",
    abilities: ids("guard", "crushing"),
    description: "朽ちた大木と根が集まって生まれた、巨大な森の魔物。",
    encounter: encounter("miniBoss", ["forest-ruins"], { floors: ids(3), weight: 1 }),
  }),
  volgrif: Object.freeze({
    id: "volgrif", name: "雷鳴の大梟 ヴォルグリフ", rank: "miniBoss",
    maxHp: 470, attackPower: 44, experienceReward: 85,
    isMiniBoss: true, attackElement: "thunder",
    elementalWeakness: "earth", elementalResistance: "wind",
    abilities: ids("swift", "piercing"),
    description: "雷をまとい、森の上空から襲いかかる巨大なフクロウ。",
    encounter: encounter("miniBoss", ["forest-ruins"], { floors: ids(4), weight: 1 }),
  }),
  "forest-dragon": Object.freeze({
    id: "forest-dragon", name: "森のドラゴン", rank: "boss",
    maxHp: 800, attackPower: 50, experienceReward: 120,
    isBoss: true, attackElement: "wind",
    elementalWeakness: "fire", elementalResistance: "wind",
    abilities: ids("swift", "guard", "piercing"),
    description: "はじまりの森の最深部に君臨する、大型のドラゴン。",
    encounter: encounter("boss", ["forest-ruins"], { floors: ids(5), weight: 1 }),
  }),
  "ice-wolf": Object.freeze({
    id: "ice-wolf", name: "氷狼", rank: "normal",
    maxHp: 330, attackPower: 35, experienceReward: 50, attackElement: "water",
    abilities: ids("swift"),
    description: "氷結の洞窟に生息する狼。",
  }),
  "ice-golem": Object.freeze({
    id: "ice-golem", name: "氷のゴーレム", rank: "normal",
    maxHp: 500, attackPower: 45, experienceReward: 350, attackElement: "earth",
    abilities: ids("guard", "crushing"),
    description: "氷の洞窟を守る大型のゴーレム。",
  }),
  "ice-dragon": Object.freeze({
    id: "ice-dragon", name: "氷結のドラゴン", rank: "boss",
    maxHp: 1000, attackPower: 60, experienceReward: 160,
    isBoss: true, attackElement: "water",
    elementalWeakness: "fire", elementalResistance: "water",
    abilities: ids("swift", "guard", "piercing"),
    description: "氷結の洞窟の最深部にいるドラゴン。",
  }),
});
