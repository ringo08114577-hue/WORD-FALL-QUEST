import {
  EQUIPMENT_SLOTS, EQUIPMENT_SLOT_LABELS, ITEM_DEFINITIONS,
  getEquipmentBonuses, getEquipmentElementalBonuses, getElementalResistanceMultiplier,
} from "./items.js";
import { createEnemy, ENEMY_DEFINITIONS } from "./enemies.js";
import { SKILL_DEFINITIONS } from "./skills.js";
import { WORD_DIFFICULTY_DEFINITIONS } from "./word-difficulty.js";
import { ELEMENT_IDS, ELEMENT_LABELS, getElementLabel } from "./elements.js";
import {
  createEmptyPrototypeEquipment, getPrototypePlayerBaseStats,
  simulatePrototypeAttack, simulatePrototypeIncomingAttack,
} from "./prototype-lab-simulator.js";

const $ = (id) => document.getElementById(id);
const slotSelectIds = {
  weapon: "weaponSelect",
  shield: "shieldSelect",
  armor: "armorSelect",
  accessory: "accessorySelect",
};

function addOption(select, value, label) {
  const option = document.createElement("option");
  option.value = value;
  option.textContent = label;
  select.append(option);
}

function fillElementSelect(select, selected = "") {
  select.replaceChildren();
  addOption(select, "", "なし");
  for (const element of ELEMENT_IDS) {
    addOption(select, element, ELEMENT_LABELS[element]);
  }
  select.value = selected ?? "";
}

function fillInitialSelects() {
  for (const slot of EQUIPMENT_SLOTS) {
    const select = $(slotSelectIds[slot]);
    addOption(select, "", "未装備");
    for (const [itemId, item] of Object.entries(ITEM_DEFINITIONS)) {
      if (item.slot === slot) addOption(select, itemId, item.name);
    }
  }

  const floorSelect = $("floorSelect");
  for (let floor = 1; floor <= 5; floor += 1) {
    addOption(floorSelect, String(floor), floor + "階");
  }

  const enemySelect = $("enemySelect");
  for (const [enemyId, enemy] of Object.entries(ENEMY_DEFINITIONS)) {
    addOption(enemySelect, enemyId, enemy.name + (enemy.isBoss ? "（ボス）" : ""));
  }

  const skillSelect = $("skillSelect");
  for (const [skillId, skill] of Object.entries(SKILL_DEFINITIONS)) {
    if (skill.category === "attack") addOption(skillSelect, skillId, skill.name);
  }

  const difficultySelect = $("difficultySelect");
  for (const [level, difficulty] of Object.entries(WORD_DIFFICULTY_DEFINITIONS)) {
    addOption(
      difficultySelect,
      level,
      "Lv." + level + " " + difficulty.label + "（×" + difficulty.damageMultiplier + "）",
    );
  }

  fillElementSelect($("enemyAttackElement"));
  fillElementSelect($("enemyWeakness"));
  fillElementSelect($("enemyResistance"));
  $("enemySelect").value = "forest-dragon";
  applyEnemyDefaults();
}

function applyEnemyDefaults() {
  const enemyId = $("enemySelect").value;
  if (!Object.hasOwn(ENEMY_DEFINITIONS, enemyId)) return;
  const enemy = createEnemy(enemyId, { floor: Number($("floorSelect").value) || 1 });
  $("enemyAttackPower").value = enemy.attackPower;
  fillElementSelect($("enemyAttackElement"), enemy.attackElement ?? "");
  fillElementSelect($("enemyWeakness"), enemy.elementalWeakness ?? "");
  fillElementSelect($("enemyResistance"), enemy.elementalResistance ?? "");
  updatePreview();
}

function readEquipment() {
  return Object.fromEntries(EQUIPMENT_SLOTS.map((slot) => [
    slot, $(slotSelectIds[slot]).value || null,
  ]));
}

function readEnemy() {
  const enemyId = $("enemySelect").value;
  if (!Object.hasOwn(ENEMY_DEFINITIONS, enemyId)) {
    throw new RangeError("テストする敵を選択してください。");
  }
  const scaledEnemy = createEnemy(enemyId, {
    floor: Number($("floorSelect").value) || 1,
  });
  return {
    ...scaledEnemy,
    attackPower: Number($("enemyAttackPower").value),
    attackElement: $("enemyAttackElement").value || null,
    elementalWeakness: $("enemyWeakness").value || null,
    elementalResistance: $("enemyResistance").value || null,
  };
}

function readOptions() {
  return {
    equipment: readEquipment(),
    enemy: readEnemy(),
    playerLevel: Number($("playerLevel").value),
    baseDefensePower: Number($("baseDefensePower").value),
    skillId: $("skillSelect").value,
    wordDifficulty: Number($("difficultySelect").value),
  };
}

function node(tag, className, value) {
  const element = document.createElement(tag);
  if (className) element.className = className;
  if (value !== undefined) element.textContent = value;
  return element;
}

function renderStat(container, label, value, note = "") {
  const card = node("div", "stat-card");
  card.append(node("span", "stat-label", label));
  card.append(node("strong", "stat-value", value));
  if (note) card.append(node("small", "stat-note", note));
  container.append(card);
}

function updatePreview() {
  const equipment = readEquipment();
  const bonuses = getEquipmentBonuses(equipment);
  const elements = getEquipmentElementalBonuses(equipment);
  const playerLevel = Math.max(1, Number($("playerLevel").value) || 1);
  const playerBase = getPrototypePlayerBaseStats(playerLevel);
  const baseAttack = playerBase.attackPower;
  const baseMaxHp = playerBase.maxHp;
  const baseDefense = Number($("baseDefensePower").value) || 0;
  const enemyId = $("enemySelect").value;
  const baseEnemy = Object.hasOwn(ENEMY_DEFINITIONS, enemyId)
    ? createEnemy(enemyId, { floor: Number($("floorSelect").value) || 1 })
    : null;
  const statGrid = $("effectiveStats");
  statGrid.replaceChildren();

  renderStat(statGrid, "攻撃力", String(baseAttack + bonuses.attackBonus),
    "基本 " + baseAttack + " ＋装備 " + bonuses.attackBonus);
  renderStat(statGrid, "防御力", String(baseDefense + bonuses.defenseBonus),
    "基本 " + baseDefense + " ＋装備 " + bonuses.defenseBonus);
  renderStat(statGrid, "最大HP", String(baseMaxHp + bonuses.maxHpBonus),
    "Lv." + playerLevel + " 基本 " + baseMaxHp + " ＋装備 " + bonuses.maxHpBonus);
  renderStat(statGrid, "武器属性", getElementLabel(elements.attackElement) || "なし",
    elements.attackElement ? "通常攻撃スキルに属性が付く" : "属性付与なし");

  const gearList = $("selectedGear");
  gearList.replaceChildren();
  for (const slot of EQUIPMENT_SLOTS) {
    const itemId = equipment[slot];
    const item = itemId ? ITEM_DEFINITIONS[itemId] : null;
    const card = node("div", "gear-chip");
    card.append(node("span", "gear-slot", EQUIPMENT_SLOT_LABELS[slot]));
    card.append(node("strong", "gear-name", item?.name ?? "未装備"));
    if (item?.description) card.append(node("small", "gear-description", item.description));
    gearList.append(card);
  }

  const elementalGrid = $("elementalSummary");
  elementalGrid.replaceChildren();
  for (const element of ELEMENT_IDS) {
    const resistanceMultiplier = getElementalResistanceMultiplier(equipment, element);
    const resistancePercent = Math.round((1 - resistanceMultiplier) * 100);
    const attackPercent = Math.round((elements.attackBonus[element] ?? 0) * 100);
    const detail = [];
    if (element === elements.attackElement) detail.push("武器属性");
    if (attackPercent !== 0) detail.push("攻撃 +" + attackPercent + "%");
    if (resistancePercent > 0) detail.push("被ダメージ -" + resistancePercent + "%");
    if (resistancePercent < 0) detail.push("被ダメージ +" + Math.abs(resistancePercent) + "%");
    const item = node("div", "element-chip" + (detail.length ? " active" : ""));
    item.append(node("strong", "element-name", ELEMENT_LABELS[element]));
    item.append(node("span", "element-detail", detail.join(" · ") || "補正なし"));
    elementalGrid.append(item);
  }

  const enemyName = baseEnemy?.name ?? "未選択";
  $("enemyPreview").textContent = enemyName + " / " + $("floorSelect").value + "階補正" +
    " / HP " + (baseEnemy?.maxHp ?? "—") +
    " / 攻撃力 " + (Number($("enemyAttackPower").value) || 0) +
    " / 攻撃属性 " + (getElementLabel($("enemyAttackElement").value) || "なし");
}

function showResult(prefix, result, baseline, incoming = false) {
  const value = result?.damage;
  const numberNode = $(prefix + "Damage");
  const noteNode = $(prefix + "Diff");
  const messageNode = $(prefix + "Message");
  if (result?.ignored || !Number.isSafeInteger(value)) {
    numberNode.textContent = "—";
    noteNode.textContent = "この条件では計算できなかったよ。設定を確認してね。";
    messageNode.textContent = result?.reason ?? "計算結果がありません。";
    return;
  }

  numberNode.textContent = value.toLocaleString("ja-JP");
  const difference = value - (baseline?.damage ?? value);
  if (difference === 0) {
    noteNode.textContent = "装備なしと同じダメージ";
  } else if (incoming) {
    noteNode.textContent = difference < 0
      ? "装備なしより " + Math.abs(difference) + " ダメージ軽減"
      : "装備なしより " + difference + " ダメージ増加";
  } else {
    noteNode.textContent = difference > 0
      ? "装備なしより " + difference + " ダメージ増加"
      : "装備なしより " + Math.abs(difference) + " ダメージ減少";
  }
  messageNode.textContent = result.message;
}

function resetResults() {
  $("attackDamage").textContent = "—";
  $("attackDiff").textContent = "装備と敵を選んで攻撃テストを実行";
  $("attackMessage").textContent = "";
  $("incomingDamage").textContent = "—";
  $("incomingDiff").textContent = "敵の攻撃と防具を選んで被ダメージテストを実行";
  $("incomingMessage").textContent = "";
}

function runAttackTest() {
  try {
    const options = readOptions();
    const result = simulatePrototypeAttack(options);
    const baseline = simulatePrototypeAttack({
      ...options,
      equipment: createEmptyPrototypeEquipment(),
    });
    showResult("attack", result, baseline);
  } catch (error) {
    $("attackDamage").textContent = "—";
    $("attackDiff").textContent = error.message;
    $("attackMessage").textContent = "";
  }
}

function runIncomingTest() {
  try {
    const options = readOptions();
    const result = simulatePrototypeIncomingAttack(options);
    const baseline = simulatePrototypeIncomingAttack({
      ...options,
      equipment: createEmptyPrototypeEquipment(),
    });
    showResult("incoming", result, baseline, true);
  } catch (error) {
    $("incomingDamage").textContent = "—";
    $("incomingDiff").textContent = error.message;
    $("incomingMessage").textContent = "";
  }
}

function clearEquipment() {
  for (const slot of EQUIPMENT_SLOTS) $(slotSelectIds[slot]).value = "";
  updatePreview();
  resetResults();
}

function resetAll() {
  $("playerLevel").value = "1";
  $("baseDefensePower").value = "0";
  $("skillSelect").value = "quick-strike";
  $("difficultySelect").value = "1";
  $("enemySelect").value = "forest-dragon";
  $("floorSelect").value = "1";
  clearEquipment();
  applyEnemyDefaults();
}

fillInitialSelects();
updatePreview();
resetResults();

$("enemySelect").addEventListener("change", applyEnemyDefaults);
$("floorSelect").addEventListener("change", applyEnemyDefaults);
$("attackTest").addEventListener("click", runAttackTest);
$("incomingTest").addEventListener("click", runIncomingTest);
$("clearEquipment").addEventListener("click", clearEquipment);
$("resetAll").addEventListener("click", resetAll);

const controls = document.querySelectorAll(
  "#playerLevel, #baseDefensePower, #skillSelect, #difficultySelect, #floorSelect, " +
  "#weaponSelect, #shieldSelect, #armorSelect, #accessorySelect, #enemyAttackPower, " +
  "#enemyAttackElement, #enemyWeakness, #enemyResistance",
);
for (const control of controls) {
  control.addEventListener("input", () => {
    updatePreview();
    resetResults();
  });
  control.addEventListener("change", () => {
    updatePreview();
    resetResults();
  });
}
