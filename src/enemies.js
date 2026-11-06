/**
 * WORD FALL QUEST - Enemy definitions
 * Floor scaling is applied when an enemy is created for a dungeon run.
 */
export const ENEMY_DEFINITIONS = Object.freeze({
  slime: Object.freeze({
    id: "slime", name: "スライム", maxHp: 3, attackPower: 1, experienceReward: 10,
  }),
  bat: Object.freeze({
    id: "bat", name: "コウモリ", maxHp: 3, attackPower: 1, experienceReward: 12,
  }),
  goblin: Object.freeze({
    id: "goblin", name: "ゴブリン", maxHp: 4, attackPower: 1, experienceReward: 15,
  }),
});

export function createEnemy(enemyId, { floor = 1 } = {}) {
  const definition = ENEMY_DEFINITIONS[enemyId];
  if (!definition) throw new RangeError("登録されていない敵です: " + enemyId);
  if (!Number.isSafeInteger(floor) || floor < 1) {
    throw new TypeError("floorは1以上の整数にしてください。");
  }
  const difficulty = floor - 1;
  return {
    ...definition,
    maxHp: definition.maxHp + difficulty,
    attackPower: definition.attackPower + Math.floor(difficulty / 3),
    experienceReward: definition.experienceReward + difficulty * 2,
  };
}
