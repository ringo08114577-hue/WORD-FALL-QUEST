import { ITEM_DEFINITIONS } from "./items.js";
import { CRAFTING_RECIPES } from "./data/crafting-recipes.js";

function equipmentPower(item) {
  if (!item) return 0;
  return (item.attackBonus ?? 0) * 2 +
    (item.defenseBonus ?? 0) * 1.5 +
    (item.maxHpBonus ?? 0) * 0.15;
}

function effectLabel(item) {
  const effects = [];
  if (item.attackBonus) effects.push("攻撃力 +" + item.attackBonus);
  if (item.defenseBonus) effects.push("防御力 +" + item.defenseBonus);
  if (item.maxHpBonus) effects.push("最大HP +" + item.maxHpBonus);
  return effects.join(" · ") || "能力を補強";
}

function buildCandidate(itemId, recipe, inventory, index) {
  const item = ITEM_DEFINITIONS[itemId];
  if (!item || !item.slot) return null;
  const ownedCount = inventory.items[itemId] ?? 0;
  const equippedId = inventory.equipment[item.slot] ?? null;
  const equippedItem = equippedId && ITEM_DEFINITIONS[equippedId]
    ? ITEM_DEFINITIONS[equippedId]
    : null;
  const currentPower = equipmentPower(equippedItem);
  const nextPower = equipmentPower(item);
  const improvement = nextPower - currentPower;

  // Do not tell players to make another copy of equipment they already own,
  // or recommend a weaker item for an occupied equipment slot.
  if (ownedCount > 0 || equippedId === itemId || improvement <= 0) return null;

  const missingMaterials = Object.entries(recipe.materials).flatMap(([materialId, required]) => {
    const material = ITEM_DEFINITIONS[materialId];
    const owned = inventory.items[materialId] ?? 0;
    const missing = Math.max(0, required - owned);
    return missing > 0 ? [{
      id: materialId,
      name: material?.name ?? materialId,
      required,
      owned,
      missing,
      source: material?.description ?? "この素材の入手先を確認しよう。",
    }] : [];
  });
  const totalRequired = Object.values(recipe.materials).reduce((sum, quantity) => sum + quantity, 0);
  const missingCount = missingMaterials.reduce((sum, material) => sum + material.missing, 0);
  return {
    itemId,
    item,
    recipe,
    index,
    improvement,
    effect: effectLabel(item),
    missingMaterials,
    missingGold: Math.max(0, recipe.gold - inventory.gold),
    materialProgress: totalRequired > 0 ? (totalRequired - missingCount) / totalRequired : 0,
  };
}

/**
 * Recommend an equipment upgrade based only on currently saved inventory.
 * This is advisory UI: it never spends gold, crafts items, or changes equipment.
 */
export function getBlacksmithAdvice(context = {}) {
  const sourceInventory = context?.inventory ?? {};
  const inventory = {
    gold: Number.isSafeInteger(sourceInventory.gold) && sourceInventory.gold >= 0
      ? sourceInventory.gold
      : 0,
    items: sourceInventory.items && typeof sourceInventory.items === "object"
      ? sourceInventory.items
      : {},
    equipment: sourceInventory.equipment && typeof sourceInventory.equipment === "object"
      ? sourceInventory.equipment
      : {},
  };
  const phase = context?.phase ?? "title";
  const candidates = Object.entries(CRAFTING_RECIPES)
    .map(([itemId, recipe], index) => buildCandidate(itemId, recipe, inventory, index))
    .filter(Boolean);

  const craftable = candidates
    .filter(candidate => candidate.missingMaterials.length === 0 && candidate.missingGold === 0)
    .sort((a, b) => b.improvement - a.improvement || a.index - b.index);

  if (phase !== "title") {
    return {
      status: "unavailable",
      greeting: "今は冒険中だな。街に戻ってきたら鍛冶を始めよう。",
      itemName: "鍛冶は街で",
      detail: "戦闘中は装備を作れない。無事に帰ってきてくれ。",
      meta: "冒険から帰還後に利用可能",
      effect: "",
    };
  }

  if (craftable.length > 0) {
    const target = craftable[0];
    return {
      status: "ready",
      greeting: "おっ、その素材なら「" + target.item.name + "」を鍛えられるぞ！",
      itemName: target.item.name,
      detail: "必要な素材とゴールドはそろっている。効果は " + target.effect + " だ！",
      meta: "作成可能 · 装備の強化見込み +" + Math.round(target.improvement),
      effect: target.effect,
    };
  }

  if (candidates.length === 0) {
    return {
      status: "complete",
      greeting: "いい装備がそろっているな。今の装備を大切に使ってくれ！",
      itemName: "装備は十分",
      detail: "今持っている装備より強い鍛冶レシピは見つからなかったぞ。",
      meta: "新しい装備素材を手に入れたら、また見せてくれ",
      effect: "",
    };
  }

  const target = [...candidates].sort((a, b) =>
    b.materialProgress - a.materialProgress || a.index - b.index
  )[0];
  const missingText = target.missingMaterials.length
    ? "あと " + target.missingMaterials.map(material =>
        material.name + " ×" + material.missing + "（" + material.source + "）"
      ).join("、")
    : "素材はそろった。";
  const goldText = target.missingGold > 0 ? " ゴールドもあと " + target.missingGold + "G 必要だ。" : "";
  return {
    status: "gather",
    greeting: "次は「" + target.item.name + "」を目指そう。素材を集めてきてくれ！",
    itemName: target.item.name,
    detail: missingText + goldText,
    meta: "必要ゴールド " + target.recipe.gold + "G · 所持 " + inventory.gold + "G",
    effect: target.effect,
    missingMaterials: target.missingMaterials,
  };
}
