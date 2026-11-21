import { createAppSession } from "./app-session.js";
import { GAME_ACTION, GAME_PHASE } from "./game-state.js";
import { ITEM_DEFINITIONS, EQUIPMENT_SLOT_LABELS } from "./items.js";
import { DUNGEON_DEFINITIONS } from "./data/dungeons.js";
import { ENEMY_DEFINITIONS } from "./data/enemies.js";
import { ENEMY_DROP_TABLES } from "./data/enemy-drops.js";
import { INVENTORY_CATEGORIES, getOwnedInventoryItems } from "./inventory.js";
import { createSellController } from "./sell.js";

const $ = (id) => document.getElementById(id);
const session = createAppSession();
session.returnToTown();
const { store, saves } = session;
const sellController = createSellController(store);

let activeCategory = "weapon";

function node(tag, className, text) {
  const element = document.createElement(tag);
  if (className) element.className = className;
  if (text !== undefined) element.textContent = text;
  return element;
}

function getItemEffects(item) {
  const effects = [];
  if (Number.isSafeInteger(item.attackBonus) && item.attackBonus !== 0) {
    effects.push("攻撃力 +" + item.attackBonus);
  }
  if (Number.isSafeInteger(item.defenseBonus) && item.defenseBonus !== 0) {
    effects.push("防御力 +" + item.defenseBonus);
  }
  if (Number.isSafeInteger(item.maxHpBonus) && item.maxHpBonus !== 0) {
    effects.push("最大HP +" + item.maxHpBonus);
  }
  if (Number.isSafeInteger(item.healAmount) && item.healAmount > 0) {
    effects.push("HPを " + item.healAmount + " 回復");
  }
  return effects.join(" · ");
}

function getItemTypeLabel(item) {
  if (item.slot) return EQUIPMENT_SLOT_LABELS[item.slot] ?? "装備";
  if (item.type === "consumable") return "消費アイテム";
  if (item.type === "material") return "素材";
  return "その他";
}

function getItemSources(itemId, item) {
  const sources = [];
  for (const dungeon of Object.values(DUNGEON_DEFINITIONS)) {
    const reward = dungeon.reward;
    if (reward?.oddFloorItemId === itemId || reward?.evenFloorItemId === itemId) {
      sources.push(dungeon.name + "の宝箱");
    }
    if (dungeon.clearReward?.itemId === itemId) {
      sources.push(dungeon.name + "の初回制覇報酬");
    }
  }
  for (const [enemyId, drops] of Object.entries(ENEMY_DROP_TABLES)) {
    if (drops.some((drop) => drop.itemId === itemId)) {
      const enemyName = ENEMY_DEFINITIONS[enemyId]?.name;
      if (enemyName) sources.push(enemyName + "のドロップ");
    }
  }
  if (item.shopPrice) sources.push("ショップ");
  if (item.startingQuantity) sources.push("冒険開始時の所持品");
  return [...new Set(sources)].join("・") || "冒険で入手";
}

function createItemCard(item) {
  const card = node("article", "item-card");
  const head = node("div", "item-card-head");
  head.append(node("strong", "item-name", item.name));
  head.append(node("span", "item-quantity", item.equipped ? "装備中" : "× " + item.quantity));
  card.append(head);

  const tags = node("div", "item-tags");
  tags.append(node("span", "item-tag", getItemTypeLabel(item)));
  card.append(tags);

  if (item.description) card.append(node("p", "item-description", item.description));
  const effects = getItemEffects(item);
  if (effects) card.append(node("p", "item-effect", effects));
  card.append(node("p", "item-source", "入手先：" + getItemSources(item.itemId, ITEM_DEFINITIONS[item.itemId])));

  if (item.slot && !item.equipped) {
    const controls = node("div", "equip-controls");
    const equipButton = node("button", "equip-button",
      "街で装備する");
    equipButton.type = "button";
    equipButton.dataset.equipItem = item.itemId;
    equipButton.disabled = store.getState().phase !== GAME_PHASE.TITLE ||
      item.quantity <= 0;
    controls.append(equipButton);
    card.append(controls);
  }

  if (item.type === "material" &&
      Number.isSafeInteger(item.sellPrice) && item.sellPrice > 0) {
    card.append(node("p", "item-sell-price", "売値：1個 " + item.sellPrice + " G"));
    const controls = node("div", "sell-controls");
    const sellOne = node("button", "sell-button", "1個売る（+" + item.sellPrice + "G）");
    sellOne.type = "button";
    sellOne.dataset.sellItem = item.itemId;
    sellOne.dataset.sellQuantity = "1";
    controls.append(sellOne);

    if (item.quantity > 1) {
      const allPrice = item.sellPrice * item.quantity;
      const canSellAll = Number.isSafeInteger(allPrice);
      const sellAll = node(
        "button",
        "sell-button sell-all-button",
        canSellAll ? "全部売る（+" + allPrice + "G）" : "全部売る（上限超過）",
      );
      sellAll.type = "button";
      sellAll.dataset.sellItem = item.itemId;
      sellAll.dataset.sellQuantity = "all";
      sellAll.disabled = !canSellAll;
      controls.append(sellAll);
    }
    card.append(controls);
  }
  return card;
}

function updateCategoryCounts(inventory) {
  let totalKinds = 0;
  for (const category of INVENTORY_CATEGORIES) {
    const items = getOwnedInventoryItems(inventory, category.id);
    const count = items.length;
    totalKinds += count;
    $(category.id + "Count").textContent = count + "種類";
  }
  $("ownedSummary").textContent = totalKinds + "種類";
}

function render(state = store.getState()) {
  $("levelValue").textContent = "LV." + state.player.level;
  $("hpValue").textContent = "HP " + state.player.hp + " / " + state.player.maxHp;
  $("goldValue").textContent = state.inventory.gold + " G";
  updateCategoryCounts(state.inventory);

  for (const category of INVENTORY_CATEGORIES) {
    const button = document.querySelector('button[data-category="' + category.id + '"]');
    button.setAttribute("aria-pressed", String(activeCategory === category.id));
  }

  const noteByCategory = {
    weapon: "装備タブには、武器・盾・鎧・アクセサリーなどの装備品をまとめて表示するよ。",
    tool: "回復薬など、使うことができる道具を表示するよ。",
    other: "敵のドロップ素材やダンジョンの報酬を確認できるよ。素材は鍛冶屋で装備作成にも使えるよ。売値のある素材はここから売却できるよ。",
  };
  $("categoryNote").textContent = noteByCategory[activeCategory];

  const owned = getOwnedInventoryItems(state.inventory, activeCategory);
  const grid = $("inventoryGrid");
  grid.replaceChildren();
  for (const item of owned) grid.append(createItemCard(item));

  const empty = $("emptyState");
  empty.hidden = owned.length > 0;
  if (owned.length === 0) {
    empty.textContent = {
      weapon: "まだ装備品を持っていないよ。ショップで装備を手に入れよう。",
      tool: "まだ道具を持っていないよ。ショップやダンジョンの宝箱を探してみよう。",
      other: "まだ素材などを持っていないよ。敵を倒したり、ダンジョンを探索したりして鍛冶屋で使う素材を集めよう。",
    }[activeCategory];
  }
}

$("inventoryGrid").addEventListener("click", (event) => {
  const equipButton = event.target.closest("button[data-equip-item]");
  if (equipButton && !equipButton.disabled) {
    const itemId = equipButton.dataset.equipItem;
    const item = ITEM_DEFINITIONS[itemId];
    const before = store.getState();
    const after = store.dispatch({
      type: GAME_ACTION.PREPARE_EQUIPMENT,
      itemId,
    });
    if (after === before) {
      $("feedback").textContent = "装備を変更できなかったよ。所持数を確認してね。";
      return;
    }
    const saved = saves.save();
    $("feedback").textContent = item.name + "を装備したよ。" +
      (saved.saved ? " 自動保存したよ。" : " 保存に失敗したよ。");
    render();
    return;
  }

  const button = event.target.closest("button[data-sell-item]");
  if (!button || button.disabled) return;

  const itemId = button.dataset.sellItem;
  const item = ITEM_DEFINITIONS[itemId];
  const currentQuantity = store.getState().inventory.items[itemId] ?? 0;
  const quantity = button.dataset.sellQuantity === "all" ? currentQuantity : 1;
  if (!item || quantity <= 0) return;

  if (button.dataset.sellQuantity === "all" &&
      typeof window.confirm === "function" &&
      !window.confirm(item.name + "を" + quantity + "個、合計 " +
        (item.sellPrice * quantity) + "Gで売却する？")) {
    return;
  }

  const result = sellController.sell(itemId, quantity);
  if (!result.sold) {
    const message = {
      "not-in-town": "街にいるときだけ素材を売却できるよ。",
      "not-enough-items": "素材の所持数が足りないよ。",
      "gold-limit": "ゴールドの上限を超えるため売却できないよ。",
    }[result.reason] ?? "この素材は売却できなかったよ。";
    $("feedback").textContent = message;
    return;
  }

  $("feedback").textContent =
    result.item.name + " ×" + result.quantity + "を売却！ +" +
    result.totalPrice + "Gを獲得したよ。";
  saves.save();
});

document.querySelector(".category-tabs").addEventListener("click", (event) => {
  const button = event.target.closest("button[data-category]");
  if (!button || !INVENTORY_CATEGORIES.some(({ id }) => id === button.dataset.category)) return;
  activeCategory = button.dataset.category;
  render();
});

store.subscribe(render);
render();
if (session.initialLoad.loaded) $("feedback").textContent = "冒険データから所持アイテムを読み込んだよ。";
else if (session.initialLoad.reason === "invalid-save") $("feedback").textContent = "保存データを読み込めなかったよ。";
window.addEventListener("pagehide", () => saves.save());
