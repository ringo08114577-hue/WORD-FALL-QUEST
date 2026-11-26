/** Character-owned skill catalog. Add a skill by assigning its characterId. */
const UPGRADE_COSTS = Object.freeze([50, 100, 200, 400]);
function defineSkill(id, name, characterId, description) {
  return Object.freeze({
    id, name, evolvedName: name + "・改", characterId,
    category: "attack", initiallyEquipped: true,
    description, minWordLength: 3, maxWordLength: 4, damageMultiplier: 1,
    startingLevel: 1, maxLevel: 5, upgradeCosts: UPGRADE_COSTS,
  });
}
export const SKILL_DEFINITIONS = Object.freeze({
  "gou-basic": defineSkill("gou-basic", "あ", "gou-swordsman", "轟剣士の仮スキル。固有技を追加するための初期枠。"),
  "regen-basic": defineSkill("regen-basic", "い", "regen-knight", "再生騎士の仮スキル。固有技を追加するための初期枠。"),
  "shadow-basic": defineSkill("shadow-basic", "う", "shadow-blade", "影刃の仮スキル。固有技を追加するための初期枠。"),
  "elemental-basic": defineSkill("elemental-basic", "え", "elemental-mage", "元素術師の仮スキル。固有技を追加するための初期枠。"),
});
