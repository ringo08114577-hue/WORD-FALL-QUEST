import { createAppSession } from "./app-session.js";
import { GAME_ACTION, GAME_PHASE } from "./game-state.js";
import { getElementLabel } from "./elements.js";
import { ITEM_DEFINITIONS, EQUIPMENT_SLOTS } from "./items.js";
import { createShopController, SHOP_CATALOG } from "./shop.js";
import { createCraftingController, CRAFTING_RECIPES } from "./crafting.js";
import {
  SKILL_DEFINITIONS, SKILL_CATEGORY_LABELS, SKILL_EQUIP_SLOT_COUNT, getSkillsForCharacter, getSkillUpgradeCost,
  getSkillWordDifficultyRange, getSkillEffectForLevel, getSkillEffectLabel,
  getSkillEvolutionRecipe, getSkillDisplayName,
} from "./skills.js";

const $ = (id) => document.getElementById(id);
const session = createAppSession();
session.returnToTown();
const { store, dungeon, saves } = session;
const shop = createShopController(store, dungeon);
const crafting = createCraftingController(store);
const page = document.body.dataset.facility;
const CRAFTING_CATEGORY_LABELS = Object.freeze({
  weapon: "剣",
  shield: "盾",
  armor: "鎧",
  accessory: "アクセサリー",
});
const SHOP_CATEGORY_OPTIONS = Object.freeze([
  { id: "weapon", label: "武器", icon: "⚔️", description: "攻撃力や魔力を高める武器" },
  { id: "shield", label: "盾", icon: "🛡️", description: "敵の攻撃を防ぐ盾" },
  { id: "armor", label: "鎧", icon: "🥋", description: "防御力や最大HPを高める鎧" },
  { id: "accessory", label: "アクセサリー", icon: "💎", description: "能力を補強する装飾品" },
  { id: "consumable", label: "道具", icon: "🧪", description: "冒険で使う回復アイテム" },
]);
let selectedCraftSlot = null;
let selectedShopCategory = null;
const titleByPage = {
  shop: ["ショップ", "武器・防具・アクセサリー・道具をまとめて購入できるよ。"],
  crafting: ["鍛冶屋", "モンスターから集めた素材とゴールドで、自分だけの装備を作ろう。"],
  skills: ["スキル工房", "選択中のキャラクター専用の技を確認・装備・強化しよう。"],
};
const [title, subtitle] = titleByPage[page] ?? titleByPage.shop;
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

function getEquipmentEffectText(item) {
  const effects = [];
  if (item.attackBonus) effects.push("攻撃力 +" + item.attackBonus);
  if (item.magicBonus) effects.push("魔力 +" + item.magicBonus);
  if (item.defenseBonus) effects.push("防御力 +" + item.defenseBonus);
  if (item.maxHpBonus) effects.push("最大HP +" + item.maxHpBonus);
  return effects.join(" · ");
}

function renderCrafting(state) {
  const root = $("facilityContent");
  root.replaceChildren();

  // Step 1: ask the player which equipment category they want to make.
  if (selectedCraftSlot === null) {
    const categoryPanel = node("section", "subpanel");
    categoryPanel.append(node("h2", "", "何を作る？"));
    categoryPanel.append(node("p", "muted", "最初に作りたい装備の種類を選んでね。次の画面で具体的な装備を選べるよ。"));
    const categoryGrid = node("div", "offer-grid");
    for (const slot of EQUIPMENT_SLOTS) {
      const recipes = Object.entries(CRAFTING_RECIPES)
        .filter(([itemId]) => ITEM_DEFINITIONS[itemId].slot === slot);
      const button = node("button", "primary-button", CRAFTING_CATEGORY_LABELS[slot] + "を選ぶ");
      button.type = "button";
      button.dataset.craftCategory = slot;
      const card = node("article", "offer-card");
      card.append(node("strong", "offer-name", CRAFTING_CATEGORY_LABELS[slot]));
      card.append(node("p", "offer-description",
        slot === "weapon" ? "攻撃力を高める剣を作る。" :
          slot === "shield" ? "敵の攻撃から身を守る盾を作る。" :
            slot === "armor" ? "防御力や最大HPを高める鎧を作る。" :
              "攻撃力・防御力などを補うアクセサリーを作る。"));
      card.append(node("p", "offer-meta", "作れる装備 " + recipes.length + "種類"));
      card.append(button);
      categoryGrid.append(card);
    }
    categoryPanel.append(categoryGrid);
    root.append(categoryPanel);
    return;
  }

  const slot = selectedCraftSlot;
  const categoryPanel = node("section", "subpanel");
  const backButton = node("button", "secondary-button", "← 種類選択に戻る");
  backButton.type = "button";
  backButton.dataset.craftBack = "true";
  categoryPanel.append(backButton);
  categoryPanel.append(node("h2", "", CRAFTING_CATEGORY_LABELS[slot] + "を作る"));
  categoryPanel.append(node("p", "muted",
    "作りたい" + CRAFTING_CATEGORY_LABELS[slot] + "を選んでね。必要素材とゴールド、装備の効果を確認できるよ。"));
  root.append(categoryPanel);

  const recipePanel = node("section", "subpanel");
  recipePanel.append(node("h2", "", CRAFTING_CATEGORY_LABELS[slot] + "のレシピ"));
  const recipeGrid = node("div", "offer-grid");
  const recipes = Object.entries(CRAFTING_RECIPES)
    .filter(([itemId]) => ITEM_DEFINITIONS[itemId].slot === slot);
  for (const [itemId, recipe] of recipes) {
    const item = ITEM_DEFINITIONS[itemId];
    const materialLines = Object.entries(recipe.materials).map(([materialId, required]) => {
      const material = ITEM_DEFINITIONS[materialId];
      const owned = state.inventory.items[materialId] ?? 0;
      return material.name + " ×" + required + "（所持 " + owned + "）";
    });
    const hasMaterials = Object.entries(recipe.materials).every(([materialId, required]) =>
      (state.inventory.items[materialId] ?? 0) >= required
    );
    const hasGold = state.inventory.gold >= recipe.gold;
    const canCraft = state.phase === GAME_PHASE.TITLE && hasMaterials && hasGold;
    const button = node("button", canCraft ? "primary-button" : "secondary-button",
      state.phase !== GAME_PHASE.TITLE ? "街に戻ると作成できるよ" :
        !hasMaterials ? "素材が足りない" : !hasGold ? "ゴールドが足りない" : "この装備を作る");
    button.type = "button";
    button.dataset.craftItem = itemId;
    button.disabled = !canCraft;
    const description = item.description + " 効果：" + getEquipmentEffectText(item);
    const footer = "必要素材：" + materialLines.join("・") +
      " · " + recipe.gold + "G · 所持 " + (state.inventory.items[itemId] ?? 0);
    addCard(recipeGrid, item.name, description, footer, button);
  }
  if (recipes.length === 0) recipeGrid.append(node("p", "muted", "この種類のレシピはまだないよ。"));
  recipePanel.append(recipeGrid);
  root.append(recipePanel);
}

function renderShop(state) {
  const root = $("facilityContent");
  root.replaceChildren();

  const getOffers = (category) => Object.entries(SHOP_CATALOG).filter(([itemId]) => {
    const item = ITEM_DEFINITIONS[itemId];
    return category === "consumable"
      ? item.type === "consumable"
      : item.slot === category;
  });

  if (selectedShopCategory === null) {
    const categoryPanel = node("section", "subpanel");
    categoryPanel.append(node("h2", "", "何を買う？"));
    categoryPanel.append(node("p", "muted", "購入したい商品の種類を選んでね。選んだ種類の商品だけが表示されるよ。"));
    const categoryGrid = node("div", "offer-grid");
    for (const category of SHOP_CATEGORY_OPTIONS) {
      const offers = getOffers(category.id);
      const button = node("button", "primary-button", category.label + "を見る");
      button.type = "button";
      button.dataset.shopCategory = category.id;
      const card = node("article", "offer-card");
      card.append(node("strong", "offer-name", category.icon + " " + category.label));
      card.append(node("p", "offer-description", category.description));
      card.append(node("p", "offer-meta", "商品 " + offers.length + "種類"));
      card.append(button);
      categoryGrid.append(card);
    }
    categoryPanel.append(categoryGrid);
    root.append(categoryPanel);
    return;
  }

  const category = SHOP_CATEGORY_OPTIONS.find((option) => option.id === selectedShopCategory);
  if (!category) {
    selectedShopCategory = null;
    renderShop(state);
    return;
  }
  const categoryPanel = node("section", "subpanel");
  const backButton = node("button", "secondary-button", "← 種類選択に戻る");
  backButton.type = "button";
  backButton.dataset.shopBack = "true";
  categoryPanel.append(backButton);
  categoryPanel.append(node("h2", "", category.icon + " " + category.label + "を購入"));
  categoryPanel.append(node("p", "muted", "商品を選んで購入しよう。購入した装備はこの画面から装備できるよ。"));
  root.append(categoryPanel);

  const offers = getOffers(category.id);
  const offerPanel = node("section", "subpanel");
  offerPanel.append(node("h2", "", category.label + "の商品"));
  const offerGrid = node("div", "offer-grid");
  for (const [itemId, offer] of offers) {
    const item = ITEM_DEFINITIONS[itemId];
    const count = state.inventory.items[itemId] ?? 0;
    const button = node("button", "primary-button", item.name + "を購入");
    button.type = "button";
    button.dataset.shopItem = itemId;
    button.disabled = state.phase !== GAME_PHASE.TITLE || state.inventory.gold < offer.cost;
    const effect = item.slot ? " 効果：" + getEquipmentEffectText(item) : "";
    addCard(offerGrid, item.name, (item.description ?? "冒険に役立つアイテム。") + effect,
      "所持数 " + count + " · " + offer.cost + "G", button);
  }
  if (offers.length === 0) offerGrid.append(node("p", "muted", "この種類の商品は準備中だよ。"));
  offerPanel.append(offerGrid);
  root.append(offerPanel);

}

function renderSkills(state) {
  const root = $("facilityContent");
  root.replaceChildren();

  const character = session.getSelectedCharacter();
  const characterId = session.getSelectedCharacterId();
  const characterSkills = getSkillsForCharacter(characterId);
  const equippedSkillIds = state.equippedSkillIds ?? [];
  const loadoutPanel = node("section", "subpanel");
  loadoutPanel.append(node("h2", "", character.name + "の専用技"));
  loadoutPanel.append(node("p", "muted",
    "このキャラクター専用の技だけを装備できるよ。新しい技を登録するとここに自動で追加されるよ。"));

  const loadoutGrid = node("div", "skill-loadout-grid");
  for (let slotIndex = 0; slotIndex < SKILL_EQUIP_SLOT_COUNT; slotIndex += 1) {
    const slotCard = node("div", "skill-slot-card");
    const label = node("label", "skill-slot-label", "スキル枠 " + (slotIndex + 1));
    const select = node("select", "skill-slot-select");
    select.dataset.skillSlot = String(slotIndex);
    select.setAttribute("aria-label", "スキル枠 " + (slotIndex + 1));
    select.disabled = state.phase !== GAME_PHASE.TITLE;

    const emptyOption = node("option", "", "未装備");
    emptyOption.value = "";
    select.append(emptyOption);

    for (const [skillId, skill] of characterSkills) {
      const option = node("option", "", skill.name + " · " +
        (SKILL_CATEGORY_LABELS[skill.category] ?? "スキル"));
      option.value = skillId;
      option.disabled = equippedSkillIds.some((equippedId, equippedIndex) =>
        equippedIndex !== slotIndex && equippedId === skillId);
      select.append(option);
    }
    select.value = characterSkills.some(([id]) => id === equippedSkillIds[slotIndex]) ? equippedSkillIds[slotIndex] : "";
    const hasAvailableSkill = characterSkills.some(([id]) =>
      !equippedSkillIds.some((equippedId, equippedIndex) => equippedIndex !== slotIndex && equippedId === id));
    if (!hasAvailableSkill && !select.value) {
      select.disabled = true;
      label.textContent += " · 技が未解放";
    }
    label.htmlFor = "skillSlot-" + slotIndex;
    select.id = "skillSlot-" + slotIndex;
    slotCard.append(label, select);
    loadoutGrid.append(slotCard);
  }
  loadoutPanel.append(loadoutGrid);
  root.append(loadoutPanel);

  const grid = node("div", "offer-grid");
  for (const [skillId, skill] of characterSkills) {
    const level = state.skillLevels[skillId] ?? skill.startingLevel ?? 1;
    const evolved = state.evolvedSkillIds?.includes(skillId) === true;
    const displayName = getSkillDisplayName(skillId, evolved);
    const range = getSkillWordDifficultyRange(skillId, level);
    const effect = getSkillEffectForLevel(skillId, level, evolved);
    const category = SKILL_CATEGORY_LABELS[skill.category] ?? "スキル";
    const effectText = getSkillEffectLabel(effect);
    const upgradeCost = getSkillUpgradeCost(skillId, level);
    const upgradeButton = node("button", upgradeCost === null ? "secondary-button" : "primary-button",
      upgradeCost === null ? "最大レベル" : "スキルを強化（" + upgradeCost + "G）");
    upgradeButton.type = "button";
    upgradeButton.disabled = upgradeCost === null || state.phase !== GAME_PHASE.TITLE ||
      state.inventory.gold < upgradeCost;
    if (upgradeCost !== null) upgradeButton.dataset.skillUpgrade = skillId;
    const recipe = getSkillEvolutionRecipe(skillId);
    const material = ITEM_DEFINITIONS[recipe.materialId];
    const ownedMaterial = state.inventory.items[recipe.materialId] ?? 0;
    const canEvolve = level === (skill.maxLevel ?? 5) && !evolved &&
      ownedMaterial >= recipe.materialQuantity && state.inventory.gold >= recipe.gold &&
      state.phase === GAME_PHASE.TITLE;
    const evolutionLabel = evolved ? "進化済み" :
      level < (skill.maxLevel ?? 5) ? "Lv." + (skill.maxLevel ?? 5) + "で進化可能" :
      "進化する（" + material.name + " ×" + recipe.materialQuantity + "・" + recipe.gold + "G）";
    const evolutionButton = node("button", evolved ? "secondary-button" : "primary-button", evolutionLabel);
    evolutionButton.type = "button";
    evolutionButton.disabled = evolved || !canEvolve;
    if (!evolved) evolutionButton.dataset.skillEvolve = skillId;
    const card = node("article", "offer-card");
    card.append(node("strong", "offer-name",
      displayName + " · Lv." + level + " · " + category + (evolved ? " · 進化済み" : "")));
    card.append(node("p", "offer-description",
      "単語難易度 " + range.min + "〜" + range.max + " · " + effectText));
    card.append(node("p", "offer-meta", skill.passive
      ? "パッシブ：装備中は常に効果が発動するよ。"
      : evolved
        ? "進化によって効果が上昇しているよ。"
      : "進化素材：" + material.name + " ×" + recipe.materialQuantity +
        "（所持 " + ownedMaterial + "） · " + recipe.gold + "G"));
    card.append(upgradeButton, evolutionButton);
    grid.append(card);
  }
  root.append(grid);
  root.append(node("p", "muted",
    "スキルはLv.5になると進化できるよ。進化すると効果が永久に上がり、素材とゴールドを消費するよ。"));
}

function render() {
  const state = store.getState();
  $("goldValue").textContent = state.inventory.gold + " G";
  $("levelValue").textContent = "LV." + state.player.level;
  $("hpValue").textContent = "HP " + state.player.hp + " / " + state.player.maxHp;
  if (page === "crafting") {
    window.WFQ_BLACKSMITH_CONTEXT = {
      phase: state.phase,
      inventory: {
        gold: state.inventory.gold,
        items: { ...state.inventory.items },
        equipment: { ...state.inventory.equipment },
      },
    };
    window.dispatchEvent(new Event("wfq:blacksmith-context-updated"));
  }
  if (page === "shop") {
    window.WFQ_MERCHANT_CONTEXT = {
      phase: state.phase,
      player: {
        hp: state.player.hp,
        maxHp: state.player.maxHp,
      },
      inventory: {
        gold: state.inventory.gold,
        items: { ...state.inventory.items },
        equipment: { ...state.inventory.equipment },
      },
    };
    window.dispatchEvent(new Event("wfq:merchant-context-updated"));
  }
  if (page === "skills") renderSkills(state);
  else if (page === "crafting") renderCrafting(state);
  else if (page === "shop") renderShop(state);

}

$("facilityContent").addEventListener("change", (event) => {
  const slotSelect = event.target.closest("select[data-skill-slot]");
  if (!slotSelect || page !== "skills") return;

  const slotIndex = Number(slotSelect.dataset.skillSlot);
  const skillId = slotSelect.value || null;
  if (skillId && SKILL_DEFINITIONS[skillId]?.characterId !== session.getSelectedCharacterId()) {
    $("feedback").textContent = "別のキャラクターの技は装備できないよ。";
    render();
    return;
  }
  const before = store.getState();
  const after = store.dispatch({
    type: GAME_ACTION.EQUIP_SKILL,
    slotIndex,
    skillId,
    characterId: session.getSelectedCharacterId(),
  });
  if (after === before) {
    $("feedback").textContent = "そのスキルは装備できないよ。枠や重複を確認してね。";
    render();
    return;
  }
  const saved = saves.save();
  const skillName = skillId ? SKILL_DEFINITIONS[skillId]?.name ?? "スキル" : "未装備";
  $("feedback").textContent = "スキル枠 " + (slotIndex + 1) + " を" + skillName +
    "に変更したよ。" + (saved.saved ? " 自動保存したよ。" : " 保存に失敗したよ。");
  render();
});

$("facilityContent").addEventListener("click", (event) => {
  const shopCategoryButton = event.target.closest("button[data-shop-category]");
  if (shopCategoryButton && page === "shop" &&
      SHOP_CATEGORY_OPTIONS.some((category) => category.id === shopCategoryButton.dataset.shopCategory)) {
    selectedShopCategory = shopCategoryButton.dataset.shopCategory;
    $("feedback").textContent = "";
    render();
    return;
  }

  const shopBackButton = event.target.closest("button[data-shop-back]");
  if (shopBackButton && page === "shop") {
    selectedShopCategory = null;
    $("feedback").textContent = "";
    render();
    return;
  }

  const categoryButton = event.target.closest("button[data-craft-category]");
  if (categoryButton && page === "crafting" &&
      EQUIPMENT_SLOTS.includes(categoryButton.dataset.craftCategory)) {
    selectedCraftSlot = categoryButton.dataset.craftCategory;
    $("feedback").textContent = "";
    render();
    return;
  }

  const backButton = event.target.closest("button[data-craft-back]");
  if (backButton && page === "crafting") {
    selectedCraftSlot = null;
    $("feedback").textContent = "";
    render();
    return;
  }

  const craftButton = event.target.closest("button[data-craft-item]");
  if (craftButton && !craftButton.disabled) {
    const result = crafting.craft(craftButton.dataset.craftItem);
    if (!result.crafted) {
      $("feedback").textContent = {
        "not-enough-materials": "必要な素材が足りないよ。",
        "not-enough-gold": "ゴールドが足りないよ。",
        "not-at-smithy": "街に戻ってから鍛冶屋を利用してね。",
      }[result.reason] ?? "装備を作成できなかったよ。";
      return;
    }
    const saved = saves.save();
    $("feedback").textContent = result.item.name + "を作成したよ！所持品から装備できるよ。" +
      (saved.saved ? " 自動保存したよ。" : " 保存に失敗したよ。");
    render();
    return;
  }

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

  const skillButton = event.target.closest("button[data-skill-upgrade]");
  if (skillButton && !skillButton.disabled) {
    const skillId = skillButton.dataset.skillUpgrade;
    if (SKILL_DEFINITIONS[skillId]?.characterId !== session.getSelectedCharacterId()) return;
    const before = store.getState();
    const after = store.dispatch({ type: GAME_ACTION.UPGRADE_SKILL, skillId });
    if (after === before) {
      $("feedback").textContent = "強化できなかったよ。ゴールドを確認してね。";
      return;
    }
    const level = after.skillLevels[skillId];
    const range = getSkillWordDifficultyRange(skillId, level);
    const effect = getSkillEffectForLevel(skillId, level);
    const saved = saves.save();
    const effectText = getSkillEffectLabel(effect);
    $("feedback").textContent = SKILL_DEFINITIONS[skillId].name + "がLv." + level +
      "になったよ。単語難易度 " + range.min + "〜" + range.max + " · " + effectText + "。" +
      (saved.saved ? " 自動保存したよ。" : " 保存に失敗したよ。");
    render();
    return;
  }

  const evolutionButton = event.target.closest("button[data-skill-evolve]");
  if (evolutionButton && !evolutionButton.disabled) {
    const skillId = evolutionButton.dataset.skillEvolve;
    if (SKILL_DEFINITIONS[skillId]?.characterId !== session.getSelectedCharacterId()) return;
    const before = store.getState();
    const after = store.dispatch({ type: GAME_ACTION.EVOLVE_SKILL, skillId });
    if (after === before) {
      $("feedback").textContent = "進化できなかったよ。レベル・素材・ゴールドを確認してね。";
      return;
    }
    const saved = saves.save();
    $("feedback").textContent = getSkillDisplayName(skillId, true) +
      "に進化したよ！効果が強くなったよ。" +
      (saved.saved ? " 自動保存したよ。" : " 保存に失敗したよ。");
    render();
  }
});

store.subscribe(render);
render();
if (session.initialLoad.loaded) $("feedback").textContent = "冒険データを読み込んだよ。";
else if (session.initialLoad.reason === "invalid-save") $("feedback").textContent = "保存データを読み込めなかったよ。";
window.addEventListener("pagehide", () => saves.save());
