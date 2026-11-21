/**
 * Compare a candidate equipment item with the item currently worn in its slot.
 * Missing bonuses are treated as zero so older/simple item definitions remain valid.
 */
const COMPARISON_STATS = Object.freeze([
  Object.freeze({ key: "attackBonus", label: "攻撃力" }),
  Object.freeze({ key: "defenseBonus", label: "防御力" }),
  Object.freeze({ key: "maxHpBonus", label: "最大HP" }),
]);

function getBonus(item, key) {
  const value = item?.[key];
  return Number.isSafeInteger(value) ? value : 0;
}

export function compareEquipment(candidate, current = null) {
  if (!candidate || typeof candidate !== "object" ||
      typeof candidate.slot !== "string" || candidate.slot.length === 0) {
    return null;
  }

  const equipped = current?.slot === candidate.slot ? current : null;
  const stats = COMPARISON_STATS.map(({ key, label }) => {
    const before = getBonus(equipped, key);
    const after = getBonus(candidate, key);
    return Object.freeze({ key, label, before, after, difference: after - before });
  });

  return Object.freeze({
    currentItemName: typeof equipped?.name === "string" ? equipped.name : null,
    stats: Object.freeze(stats),
    hasChanges: stats.some(({ difference }) => difference !== 0),
  });
}
