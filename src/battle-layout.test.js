import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const html = readFileSync(new URL("../battle.html", import.meta.url), "utf8");

test("battle page gives English gameplay the wide desktop and tablet column", () => {
  assert.match(html, /class="battle-layout"/);
  assert.match(html, /class="game-column"/);
  assert.match(html, /class="info-column"/);
  assert.match(html, /grid-template-columns:\s*minmax\(0,\s*1\.7fr\)\s+minmax\(235px,\s*\.85fr\)/);
  assert.match(html, /@media\s*\(min-width:\s*720px\)/);
});

test("battle layout keeps all gameplay and status controls available", () => {
  for (const id of [
    "japanesePrompt", "spellingProgress", "arena", "lettersLayer",
    "leftButton", "confirmButton", "rightButton", "startButton",
    "nextButton", "enemyHp", "enemyHpFill", "playerHp", "playerHpFill",
    "enemyAttackTimer", "inventoryItems", "shopItems", "saveNowButton",
    "loadSaveButton", "clearSaveButton",
  ]) {
    assert.match(html, new RegExp('id="' + id + '"'));
  }
});

test("mobile layout retains a single-column fallback", () => {
  assert.match(html, /\.battle-layout\s*\{\s*display:\s*grid/);
  assert.match(html, /@media\s*\(max-width:\s*480px\)/);
  assert.match(html, /\.battle-layout\s*\{\s*display:flex;\s*flex-direction:column/);
  assert.match(html, /\.game-column,\s*\.info-column\s*\{\s*display:contents/);
  assert.match(html, /\.arena\s*\{\s*height:\s*clamp\(290px/);
});

test("desktop columns remain real grid items and the lane frame stays compact", () => {
  assert.match(html, /\.game-column,\s*\.info-column\s*\{\s*display:\s*block;\s*min-width:\s*0;\s*\}/);
  assert.match(html, /\.arena\s*\{\s*height:\s*clamp\(300px,\s*42svh,\s*460px\);\s*min-height:\s*300px;\s*\}/);
  assert.match(html, /\.arena\s*\{\s*height:\s*clamp\(340px,\s*46svh,\s*500px\);\s*min-height:\s*340px;\s*\}/);
});
