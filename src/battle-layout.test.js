import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const html = readFileSync(new URL("../battle.html", import.meta.url), "utf8");

test("battle page gives English gameplay more than half of the desktop and tablet width", () => {
  assert.match(html, /class="battle-layout"/);
  assert.match(html, /class="game-column"/);
  assert.match(html, /class="info-column"/);
  assert.match(html, /grid-template-columns:\s*minmax\(0,\s*1\.55fr\)\s+minmax\(270px,\s*1fr\)/);
  assert.match(html, /grid-template-columns:\s*minmax\(0,\s*1\.6fr\)\s+minmax\(320px,\s*1fr\)/);
  assert.match(html, /@media\s*\(min-width:\s*720px\)/);
});

test("battle layout keeps all gameplay, HP, inventory, and save controls available", () => {
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
  assert.match(html, /@media\s*\(max-width:\s*480px\)/);
  assert.match(html, /\.battle-layout\s*\{\s*display:flex;\s*flex-direction:column/);
  assert.match(html, /\.game-column,\s*\.info-column\s*\{\s*display:contents/);
  assert.ok(html.includes(".arena { height:clamp(205px, 34svh, 280px); min-height:205px; }"));
});

test("tablet and desktop columns remain real grid items with a compact lane frame", () => {
  assert.match(html, /\.game-column,\s*\.info-column\s*\{\s*display:block;\s*min-width:0;\s*\}/);
  assert.match(html, /height: clamp\(230px, 34svh, 350px\); min-height: 230px;/);
  assert.match(html, /height: clamp\(250px, 36svh, 380px\); min-height: 250px;/);
});

test("every DOM id is unique and every static script lookup resolves exactly once", () => {
  const ids = [...html.matchAll(/id="([^"]+)"/g)].map((match) => match[1]);
  const counts = new Map();
  for (const id of ids) counts.set(id, (counts.get(id) ?? 0) + 1);
  assert.equal(ids.length, counts.size, "同じidを持つ画面部品が重複しています");
  for (const match of html.matchAll(/\$\("([^"]+)"\)/g)) {
    assert.equal(counts.get(match[1]), 1, "JavaScript参照 #" + match[1] + " は1個だけ存在する必要があります");
  }
});

test("orphaned duplicate battle markup is removed", () => {
  assert.equal(html.split('elling" id="spellingProgress"').length - 1, 1);
  const asideEnd = html.indexOf("</aside>");
  const footerStart = html.indexOf('<p class="footer">');
  assert.ok(asideEnd >= 0 && footerStart > asideEnd);
  assert.match(html.slice(asideEnd, footerStart), /^<\/aside>\s*<\/div>\s*$/);
});

test("battle arena is compact at short-phone, phone, tablet, and desktop sizes", () => {
  assert.ok(html.includes("main { width: min(100%, 1280px); }"));
  assert.ok(html.includes("height:clamp(180px, 30svh, 225px); min-height:180px;"));
  assert.ok(html.includes("height:clamp(205px, 34svh, 280px); min-height:205px;"));
  assert.ok(html.includes("height:clamp(230px, 38svh, 340px); min-height:230px;"));
});
