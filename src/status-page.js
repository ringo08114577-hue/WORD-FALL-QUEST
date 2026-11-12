import { createAppSession } from "./app-session.js";
import { GAME_ACTION } from "./game-state.js";
import {
  SKILL_DEFINITIONS, SKILL_CATEGORY_LABELS, getSkillWordDifficultyRange,
  getSkillEffectForLevel,
} from "./skills.js";

const $ = (id) => document.getElementById(id);
const session = createAppSession();
session.returnToTown();
const { store, saves } = session;

function node(tag, className, text) {
  const element = document.createElement(tag);
  if (className) element.className = className;
  if (text !== undefined) element.textContent = text;
  return element;
}

function renderSlots(state) {
  const root = $("equippedSkillSlots");
  root.replaceChildren();
  state.equippedSkillIds.forEach((equippedId, slotIndex) => {
    const card = node("div", "slot-card");
    card.append(node("strong", "slot-title", "スキル枠 " + (slotIndex + 1)));
    const select = node("select", "skill-select");
    select.dataset.skillSlot = String(slotIndex);
    select.setAttribute("aria-label", "スキル枠 " + (slotIndex + 1) + "の装備");
    const empty = node("option", "", "未装備");
    empty.value = "";
    select.append(empty);
    for (const [skillId, skill] of Object.entries(SKILL_DEFINITIONS)) {
      const usedElsewhere = state.equippedSkillIds.some((id, index) => index !== slotIndex && id === skillId);
      if (usedElsewhere) continue;
      const option = node("option", "", skill.name);
      option.value = skillId;
      select.append(option);
    }
    select.value = equippedId ?? "";
    const button = node("button", "change-button", "この枠を変更");
    button.type = "button";
    button.dataset.applySkillSlot = String(slotIndex);
    button.disabled = true;
    select.addEventListener("change", () => { button.disabled = select.value === (equippedId ?? ""); });
    card.append(select, button);
    root.append(card);
  });
}

function renderSkills(state) {
  const root = $("skillList");
  root.replaceChildren();
  for (const [skillId, skill] of Object.entries(SKILL_DEFINITIONS)) {
    const level = state.skillLevels[skillId] ?? skill.startingLevel ?? 1;
    const range = getSkillWordDifficultyRange(skillId, level);
    const effect = getSkillEffectForLevel(skillId, level);
    const category = SKILL_CATEGORY_LABELS[skill.category] ?? "スキル";
    const effectText = effect.type === "attack"
      ? "威力倍率 ×" + effect.damageMultiplier
      : effect.type === "heal"
        ? "回復量 " + effect.amount + " HP"
        : effect.type === "defense"
          ? "防御力 +" + effect.bonus + " · 次の" + effect.hits + "回"
          : "攻撃倍率 ×" + effect.multiplier + " · 次の攻撃" + effect.uses + "回";
    const card = node("article", "skill-card");
    card.append(node("strong", "", skill.name + " · Lv." + level));
    card.append(node("p", "", category + " · " + skill.description));
    card.append(node("p", "skill-meta", "単語難易度 " + range.min + "〜" + range.max + " · " + effectText));
    root.append(card);
  }
}

function render(state = store.getState()) {
  const player = state.player;
  $("levelValue").textContent = "LV." + player.level;
  $("hpValue").textContent = "HP " + player.hp + " / " + player.maxHp;
  $("expValue").textContent = "EXP " + player.experience + " / " + player.nextLevelXp;
  $("attackValue").textContent = String(player.attackPower);
  $("defenseValue").textContent = String(player.defensePower);
  $("goldValue").textContent = state.inventory.gold + " G";
  $("defeatedValue").textContent = String(state.stats.enemiesDefeated);
  $("totalExpValue").textContent = String(state.stats.totalExperienceEarned);
  $("battleCountValue").textContent = String(state.battle.number);
  const percent = Math.min(100, (player.experience / player.nextLevelXp) * 100);
  $("expFill").style.width = percent.toFixed(1) + "%";
  $("expBar").setAttribute("aria-valuemax", String(player.nextLevelXp));
  $("expBar").setAttribute("aria-valuenow", String(player.experience));
  renderSlots(state);
  renderSkills(state);
}

$("equippedSkillSlots").addEventListener("click", (event) => {
  const button = event.target.closest("button[data-apply-skill-slot]");
  if (!button || button.disabled) return;
  const slotIndex = Number(button.dataset.applySkillSlot);
  const select = $("equippedSkillSlots").querySelector('select[data-skill-slot="' + slotIndex + '"]');
  const skillId = select?.value || null;
  const before = store.getState();
  const after = store.dispatch({ type: GAME_ACTION.EQUIP_SKILL, slotIndex, skillId });
  if (after === before) {
    $("feedback").textContent = "そのスキルは変更できなかったよ。別の枠と重複していないか確認してね。";
    return;
  }
  const saved = saves.save();
  const skillName = skillId ? SKILL_DEFINITIONS[skillId].name : "未装備";
  $("feedback").textContent = "スキル枠 " + (slotIndex + 1) + "を" + skillName +
    "に変更したよ。" + (saved.saved ? " 自動保存したよ。" : " 保存に失敗したよ。");
  render(after);
});

store.subscribe(render);
render();
if (session.initialLoad.loaded) $("feedback").textContent = "冒険データを読み込んだよ。";
else if (session.initialLoad.reason === "invalid-save") $("feedback").textContent = "保存データを読み込めなかったよ。";
window.addEventListener("pagehide", () => saves.save());
