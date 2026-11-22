import test from "node:test";
import assert from "node:assert/strict";
import {
  ELEMENT_IDS, ELEMENT_MATCHUP_MULTIPLIERS, getElementalMatchup,
  getElementLabel, isElementId,
} from "./elements.js";

test("5属性と表示名が登録されている", () => {
  assert.deepEqual(ELEMENT_IDS, ["fire", "thunder", "water", "wind", "earth"]);
  assert.deepEqual(ELEMENT_IDS.map(getElementLabel), ["炎", "雷", "水", "風", "土"]);
  assert.equal(isElementId("fire"), true);
  assert.equal(isElementId("ice"), false);
});

test("属性倍率は通常1倍・弱点1.3倍・耐性0.8倍", () => {
  assert.deepEqual(ELEMENT_MATCHUP_MULTIPLIERS, { normal: 1, weakness: 1.3, resistance: 0.8 });
  assert.equal(getElementalMatchup("fire", {}).multiplier, 1);
  assert.equal(getElementalMatchup("fire", { elementalWeakness: "fire" }).multiplier, 1.3);
  assert.equal(getElementalMatchup("fire", { elementalResistance: "fire" }).multiplier, 0.8);
});

test("属性なし攻撃や未登録属性は倍率に影響しない", () => {
  assert.equal(getElementalMatchup(null, { elementalWeakness: "fire" }).multiplier, 1);
  assert.equal(getElementalMatchup("ice", { elementalWeakness: "ice" }).multiplier, 1);
});

test("同じ属性が弱点と耐性に指定された場合は弱点を優先する", () => {
  assert.equal(getElementalMatchup("water", {
    elementalWeakness: "water", elementalResistance: "water",
  }).type, "weakness");
});
