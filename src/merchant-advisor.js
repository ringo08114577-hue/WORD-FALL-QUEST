import {
  EQUIPMENT_SLOTS,
  ITEM_DEFINITIONS,
  ITEM_SHOP_PRICES,
} from "./items.js";

function safeCount(value) {
  return Number.isSafeInteger(value) && value > 0 ? value : 0;
}

function equipmentPower(item) {
  if (!item) return 0;
  return (item.attackBonus ?? 0) * 2 +
    (item.defenseBonus ?? 0) * 2 +
    (item.maxHpBonus ?? 0) * 0.2;
}

function findSellableMaterials(items) {
  return Object.entries(ITEM_DEFINITIONS)
    .filter(([itemId, item]) =>
      item.type === "material" &&
      Number.isSafeInteger(item.sellPrice) &&
      item.sellPrice > 0 &&
      safeCount(items[itemId]) > 0
    )
    .map(([itemId, item]) => ({
      id: itemId,
      name: item.name,
      quantity: safeCount(items[itemId]),
      sellPrice: item.sellPrice,
      total: safeCount(items[itemId]) * item.sellPrice,
    }))
    .sort((a, b) => b.total - a.total);
}

/**
 * Build shop guidance using current player inventory.
 * This is advisory only: it never purchases items or sells materials.
 */
export function getMerchantAdvice(context = {}) {
  const player = context?.player ?? {};
  const inventorySource = context?.inventory ?? {};
  const inventory = {
    gold: Number.isSafeInteger(inventorySource.gold) && inventorySource.gold >= 0
      ? inventorySource.gold
      : 0,
    items: inventorySource.items && typeof inventorySource.items === "object"
      ? inventorySource.items
      : {},
    equipment: inventorySource.equipment && typeof inventorySource.equipment === "object"
      ? inventorySource.equipment
      : {},
  };
  const hp = Number.isFinite(player.hp) && player.hp >= 0 ? player.hp : null;
  const maxHp = Number.isFinite(player.maxHp) && player.maxHp > 0 ? player.maxHp : null;
  const hpRatio = hp !== null && maxHp !== null ? Math.min(1, hp / maxHp) : 1;
  const smallCount = safeCount(inventory.items["small-potion"]);
  const largeCount = safeCount(inventory.items["large-potion"]);
  const potionCount = smallCount + largeCount;
  const sellableMaterials = findSellableMaterials(inventory.items);
  const totalSellValue = sellableMaterials.reduce((sum, material) => sum + material.total, 0);
  const hasSellableMaterials = sellableMaterials.length > 0;
  const sellableSummary = hasSellableMaterials
    ? "売却できる素材：" + sellableMaterials.slice(0, 2).map(material =>
        material.name + " ×" + material.quantity + "（" + material.total + "G）"
      ).join("、") + " · 合計 " + totalSellValue + "G"
    : "";

  const shared = {
    hasSellableMaterials,
    sellableSummary,
    totalSellValue,
  };

  const shouldRestock = hpRatio <= 0.6 || potionCount <= 1;
  if (shouldRestock) {
    const recommendLarge = hpRatio <= 0.4 && largeCount === 0;
    const itemId = recommendLarge ? "large-potion" : "small-potion";
    const item = ITEM_DEFINITIONS[itemId];
    const price = ITEM_SHOP_PRICES[itemId];
    const missingGold = Math.max(0, price - inventory.gold);
    let greeting;
    if (hpRatio <= 0.4) {
      greeting = "おっと、HPが減っているな。大きな回復薬を持っておくと安心だぞ。";
    } else if (potionCount === 0) {
      greeting = "回復薬が切れているぞ。冒険に出る前に補充しておこう！";
    } else {
      greeting = "回復薬の残りが少ないな。今のうちに補充しておくと安心だ。";
    }
    const detail = missingGold > 0
      ? item.name + "は" + price + "Gだ。あと" + missingGold + "Gあれば買えるぞ。"
      : item.name + "がおすすめだ。所持数は" + (inventory.items[itemId] ?? 0) + "個だぞ。";
    return {
      ...shared,
      status: missingGold > 0 ? "short-gold" : "recovery",
      label: "冒険前におすすめ",
      greeting,
      itemName: item.name,
      detail,
      meta: price + "G · 回復量 " + item.healAmount + "HP · 所持 " + (inventory.items[itemId] ?? 0) + "個",
      actionLabel: "回復アイテムを見る　›",
      actionHref: "#facilityContent",
    };
  }

  const upgrades = Object.entries(ITEM_SHOP_PRICES)
    .filter(([itemId]) => {
      const item = ITEM_DEFINITIONS[itemId];
      return item && EQUIPMENT_SLOTS.includes(item.slot) && safeCount(inventory.items[itemId]) === 0;
    })
    .map(([itemId, price], index) => {
      const item = ITEM_DEFINITIONS[itemId];
      const equippedId = inventory.equipment[item.slot];
      const equippedItem = equippedId && ITEM_DEFINITIONS[equippedId]
        ? ITEM_DEFINITIONS[equippedId]
        : null;
      return {
        item,
        price,
        index,
        improvement: equipmentPower(item) - equipmentPower(equippedItem),
      };
    })
    .filter(candidate => candidate.improvement > 0)
    .sort((a, b) => b.improvement - a.improvement || a.price - b.price || a.index - b.index);

  const affordableUpgrade = upgrades.find(candidate => candidate.price <= inventory.gold);
  if (affordableUpgrade) {
    return {
      ...shared,
      status: "equipment",
      label: "購入できる装備",
      greeting: "今の装備を強化するなら「" + affordableUpgrade.item.name + "」がおすすめだ。いい品だぞ！",
      itemName: affordableUpgrade.item.name,
      detail: affordableUpgrade.item.description ?? "冒険に役立つ装備だ。",
      meta: affordableUpgrade.price + "G · 所持 " + inventory.gold + "G",
      actionLabel: "装備を見る　›",
      actionHref: "#facilityContent",
    };
  }

  if (hasSellableMaterials) {
    const valuable = sellableMaterials[0];
    return {
      ...shared,
      status: "sell-materials",
      label: "素材を整理しよう",
      greeting: "素材がたまっているな。使う予定の分を残して、不要な分は売却してもいいぞ。",
      itemName: valuable.name,
      detail: valuable.name + "は1個" + valuable.sellPrice + "G。素材は鍛冶でも使うから、必要数を確かめてから売るんだ。",
      meta: "所持 " + valuable.quantity + "個 · 全素材の売却価値 " + totalSellValue + "G",
      actionLabel: "素材を確認する　›",
      actionHref: "./inventory.html",
    };
  }

  return {
    ...shared,
    status: "ready",
    label: "おすすめ商品",
    greeting: "品ぞろえは十分だな。必要なものがあれば、いつでも声をかけてくれ！",
    itemName: "冒険の準備は万全",
    detail: "回復薬も装備もそろっているぞ。素材を手に入れたら、また見せてくれ。",
    meta: "所持ゴールド " + inventory.gold + "G",
    actionLabel: "商品を見る　›",
    actionHref: "#facilityContent",
  };
}
