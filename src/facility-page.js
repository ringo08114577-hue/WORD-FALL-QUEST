import { createAppSession } from "./app-session.js";
import { GAME_ACTION, GAME_PHASE } from "./game-state.js";
import { ITEM_DEFINITIONS, EQUIPMENT_SLOTS, EQUIPMENT_SLOT_LABELS } from "./items.js";
import { createShopController, SHOP_CATALOG } from "./shop.js";
import { SKILL_DEFINITIONS, getSkillUpgradeCost, getSkillLevelDifficultyRange } from "./skills.js";

const $ = (id) => document.getElementById(id);
const session = createAppSession();
session.returnToTown();
const { store, dungeon, saves } = session;
const shop = createShopController(store, dungeon);
const page = document.body.dataset.facility;
const titleByPage = {
  items: ["道具屋", "回復薬など、冒険に必要なアイテムを購入しよう。"],
  equipment: ["武器・防具屋", "装備を購入して、持っている装備を付け替えよう。"],
  skills: ["スキル工房", "ゴールドを使って攻撃スキルを強化しよう。"],
};
const [title, subtitle] = titleByPage[page] ?? titleByPage.items;
$("pageTitle").textContent = title;
$("pageSubtitle").textContent = subtitle;

function node(tag, className, text) {
  const element = document.createElement(tag);
  if (className) element.className = className;
  if (text !== undefined) element.textContent = text;
  return element;
}

function addCard(root, heading, description, footer, button) {
  const card = node("article", "offer-card");
  card.append(node("strong", "offer-name", heading));
  card.append(node("p", "offer-description", description));
  card.append(node("p", "offer-meta", footer));
  card.append(button);
  root.append(card);
}

function renderItems(state) {
  const root = $("facilityContent");
  root.replaceChildren();
  const offers = Object.entries(SHOP_CATALOG).filter(([itemId]) => {
    const item = ITEM_DEFINITIONS[itemId];
    return page === "equipment" ? Boolean(item.slot) : !item.slot;
  });

  if (page === "equipment") {
    const equippedPanel = node("section", "subpanel");
    equippedPanel.append(node("h2", "", "現在の装備"));
    const equippedGrid = node("div", "equipment-grid");
    for (const slot of EQUIPMENT_SLOTS) {
      const itemId = state.inventory.equipment[slot];
      const item = itemId ? ITEM_DEFINITIONS[itemId] : null;
      const card = node("div", "equipment-card");
      card.append(node("span", "muted", EQUIPMENT_SLOT_LABELS[slot]));
      card.append(node("strong", "", item?.name ?? "未装備"));
      equippedGrid.append(card);
    }
    equippedPanel.append(equippedGrid);
    root.append(equippedPanel);

    const ownedPanel = node("section", "subpanel");
    ownedPanel.append(node("h2", "", "所持している装備"));
    const owned = Object.values(ITEM_DEFINITIONS).filter((item) =>
      item.slot && (state.inventory.items[item.id] ?? 0) > 0 &&
      state.inventory.equipment[item.slot] !== item.id
    );
    const ownedGrid = node("div", "offer-grid");
    if (owned.length === 0) ownedGrid.append(node("p", "muted", "付け替えできる装備はまだないよ。"));
    for (const item of owned) {
      const button = node("button", "secondary-button", item.name + "を装備");
      button.type = "button";
      button.dataset.equipItem = item.id;
      addCard(ownedGrid, item.name, item.description ?? "装備アイテム", "所持数 " + state.inventory.items[item.id], button);
    }
    ownedPanel.append(ownedGrid);
    root.append(ownedPanel);
  }

  const shopPanel = node("section", "subpanel");
  shopPanel.append(node("h2", "", page === "equipment" ? "装備を購入" : "アイテムを購入"));
  const grid = node("div", "offer-grid");
  for (const [itemId, offer] of offers) {
    const item = ITEM_DEFINITIONS[itemId];
    const count = state.inventory.items[itemId] ?? 0;
    const button = node("button", "primary-button", item.name + "を購入");
    button.type = "button";
    button.dataset.shopItem = itemId;
    button.disabled = state.phase !== GAME_PHASE.TITLE || state.inventory.gold < offer.cost;
    addCard(grid, item.name, item.description ?? "冒険に役立つアイテム。", "所持数 " + count + " · " + offer.cost + "G", button);
  }
  if (offers.length === 0) grid.append(node("p", "muted", "商品は準備中だよ。"));
  shopPanel.append(grid);
  root.append(shopPanel);

  if (page === "items") {
    const inventory = node("section", "subpanel");
    inventory.append(node("h2", "", "持ち物"));
    const grid = node("div", "inventory-grid");
    const owned = Object.values(ITEM_DEFINITIONS).filter((item) =>
      !item.slot && (state.inventory.items[item.id] ?? 0) > 0
    );
    if (owned.length === 0) grid.append(node("p", "muted", "道具を購入するとここに表示されるよ。"));
    for (const item of owned) {
      grid.append(node("div", "inventory-item", item.name + " × " + state.inventory.items[item.id]));
    }
    inventory.append(grid);
    root.append(inventory);
  }
}

function renderSkills(state) {
  const root = $("facilityContent");
  root.replaceChildren();
  const grid = node("div", "offer-grid");
  for (const [skillId, skill] of Object.entries(SKILL_DEFINITIONS)) {
    const level = state.skillLevels[skillId] ?? skill.startingLevel ?? 1;
    const range = getSkillLevelDifficultyRange(level);
    const cost = getSkillUpgradeCost(skillId, level);
    const button = node("button", cost === null ? "secondary-button" : "primary-button",
      cost === null ? "最大レベル" : "スキルを強化（" + cost + "G）");
    button.type = "button";
    button.disabled = cost === null || state.phase !== GAME_PHASE.TITLE || state.inventory.gold < cost;
    if (cost !== null) button.dataset.skillUpgrade = skillId;
    addCard(
      grid,
      skill.name + " · Lv." + level,
      "出題される単語の難易度：" + range.min + "〜" + range.max,
      cost === null ? "これ以上強化できないよ。" : "次はLv." + (level + 1) + " · " + cost + "G",
      button,
    );
  }
  root.append(grid);
  const note = node("p", "muted", "スキルレベルは戦闘で使う技ごとに保存されるよ。");
  root.append(note);
}

function render() {
  const state = store.getState();
  $("goldValue").textContent = state.inventory.gold + " G";
  $("levelValue").textContent = "LV." + state.player.level;
  $("hpValue").textContent = "HP " + state.player.hp + " / " + state.player.maxHp;
  if (page === "skills") renderSkills(state);
  else renderItems(state);
}

$("facilityContent").addEventListener("click", (event) => {
  const shopButton = event.target.closest("button[data-shop-item]");
  if (shopButton && !shopButton.disabled) {
    const result = shop.buy(shopButton.dataset.shopItem);
    if (!result.purchased) {
      $("feedback").textContent = result.reason === "not-enough-gold"
        ? "ゴールドが足りないよ。" : "購入できなかったよ。";
      return;
    }
    const saved = saves.save();
    $("feedback").textContent = result.item.name + "を購入したよ。" +
      (saved.saved ? " 自動保存したよ。" : " 保存に失敗したよ。");
    render();
    return;
  }

  const equipButton = event.target.closest("button[data-equip-item]");
  if (equipButton && !equipButton.disabled) {
    const before = store.getState();
    const after = store.dispatch({
      type: GAME_ACTION.PREPARE_EQUIPMENT,
      itemId: equipButton.dataset.equipItem,
    });
    if (after === before) {
      $("feedback").textContent = "装備を変更できなかったよ。";
      return;
    }
    const saved = saves.save();
    $("feedback").textContent = "装備を変更したよ。" +
      (saved.saved ? " 自動保存したよ。" : " 保存に失敗したよ。");
    render();
    return;
  }

  const skillButton = event.target.closest("button[data-skill-upgrade]");
  if (skillButton && !skillButton.disabled) {
    const skillId = skillButton.dataset.skillUpgrade;
    const before = store.getState();
    const after = store.dispatch({ type: GAME_ACTION.UPGRADE_SKILL, skillId });
    if (after === before) {
      $("feedback").textContent = "強化できなかったよ。ゴールドを確認してね。";
      return;
    }
    const level = after.skillLevels[skillId];
    const range = getSkillLevelDifficultyRange(level);
    const saved = saves.save();
    $("feedback").textContent = SKILL_DEFINITIONS[skillId].name + "がLv." + level +
      "になったよ。出題難易度は" + range.min + "〜" + range.max + "だよ。" +
      (saved.saved ? " 自動保存したよ。" : " 保存に失敗したよ。");
    render();
  }
});

store.subscribe(render);
render();
if (session.initialLoad.loaded) $("feedback").textContent = "冒険データを読み込んだよ。";
else if (session.initialLoad.reason === "invalid-save") $("feedback").textContent = "保存データを読み込めなかったよ。";
window.addEventListener("pagehide", () => saves.save());
