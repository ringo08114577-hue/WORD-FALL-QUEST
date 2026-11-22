/** Shared five-element rules for attacks, enemies, and equipment. */
export const ELEMENT_IDS = Object.freeze(["fire", "thunder", "water", "wind", "earth"]);
export const ELEMENT_LABELS = Object.freeze({
  fire: "炎", thunder: "雷", water: "水", wind: "風", earth: "土",
});
export const ELEMENT_MATCHUP_MULTIPLIERS = Object.freeze({
  normal: 1, weakness: 1.3, resistance: 0.8,
});
export function isElementId(value) {
  return typeof value === "string" && ELEMENT_IDS.includes(value);
}
export function getElementalMatchup(element, target = {}) {
  if (!isElementId(element)) return Object.freeze({ type: "normal", multiplier: 1, label: "" });
  if (target?.elementalWeakness === element) {
    return Object.freeze({ type: "weakness", multiplier: 1.3, label: "弱点" });
  }
  if (target?.elementalResistance === element) {
    return Object.freeze({ type: "resistance", multiplier: 0.8, label: "耐性" });
  }
  return Object.freeze({ type: "normal", multiplier: 1, label: "" });
}
export function getElementLabel(element) {
  return isElementId(element) ? ELEMENT_LABELS[element] : "";
}
