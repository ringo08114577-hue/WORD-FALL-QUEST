/**
 * WORD FALL QUEST - Enemy definitions
 * Keep enemy stats in data so new monsters do not require combat-code changes.
 */
export const ENEMY_DEFINITIONS = Object.freeze({
  slime: Object.freeze({
    id: "slime",
    name: "スライム",
    maxHp: 3,
    attackPower: 1,
    experienceReward: 10,
  }),
});

export function createEnemy(enemyId) {
  const definition = ENEMY_DEFINITIONS[enemyId];
  if (!definition) {
    throw new RangeError("登録されていない敵です: " + enemyId);
  }
  return { ...definition };
}
