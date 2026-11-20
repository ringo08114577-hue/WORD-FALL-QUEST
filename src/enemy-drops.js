/**
 * Resolve monster material drops. A random source is injectable for tests.
 */
import { ENEMY_DROP_TABLES } from "./data/enemy-drops.js";

export function resolveEnemyDrops(enemyId, random = Math.random) {
  if (typeof random !== "function") {
    throw new TypeError("ドロップ抽選には乱数関数が必要です。");
  }
  const table = typeof enemyId === "string" && Object.hasOwn(ENEMY_DROP_TABLES, enemyId)
    ? ENEMY_DROP_TABLES[enemyId]
    : [];
  const results = [];

  const roll = () => {
    const value = random();
    if (!Number.isFinite(value) || value < 0 || value >= 1) {
      throw new RangeError("乱数関数は0以上1未満の数値を返してください。");
    }
    return value;
  };

  for (const entry of table) {
    if (roll() >= entry.chance) continue;
    const quantityRange = entry.maxQuantity - entry.minQuantity + 1;
    const quantity = entry.minQuantity + Math.floor(roll() * quantityRange);
    results.push({ itemId: entry.itemId, quantity });
  }
  return results;
}
