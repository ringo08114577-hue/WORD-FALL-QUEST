import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const html = readFileSync(new URL("../index.html", import.meta.url), "utf8");

test("街の拠点はダンジョンカタログから行き先を自動表示する", () => {
  assert.match(html, /id="dungeonSelectionGrid"/);
  assert.match(html, /import \{ DUNGEON_DEFINITIONS \} from "\.\/src\/data\/dungeons\.js"/);
  assert.match(html, /Object\.values\(DUNGEON_DEFINITIONS\)/);
  assert.match(html, /data-dungeon-id/);
  assert.match(html, /id="townFacilities"/);
  assert.match(html, /href="#dungeonPanel"/);
});

test("街の宿屋とショップが既存のゲームコントローラーに接続されている", () => {
  assert.match(html, /createTownController\(store\)/);
  assert.match(html, /town\.restAtInn\(\)/);
  assert.match(html, /id="innRestButton"/);
  assert.match(html, /createShopController\(store, dungeon\)/);
  assert.match(html, /Object\.entries\(SHOP_CATALOG\)/);
  assert.match(html, /data-shop-item/);
  assert.match(html, /id="itemShopGrid"/);
  assert.match(html, /id="equipmentShopGrid"/);
  assert.match(html, /saves\.save\(\)/);
});

test("選択したダンジョンを保存し、冒険開始後は切り替えられない", () => {
  assert.match(html, /dungeon\.selectDungeon\(button\.dataset\.dungeonId\)/);
  assert.match(html, /const saved = saves\.save\(\)/);
  assert.match(html, /state\.phase === GAME_PHASE\.TITLE && !progress\.started/);
  assert.match(html, /冒険開始後は変更できません/);
});

test("街の画面IDは一意でJavaScript参照先も存在する", () => {
  const ids = [...html.matchAll(/id="([^"]+)"/g)].map((match) => match[1]);
  assert.equal(ids.length, new Set(ids).size);
  for (const match of html.matchAll(/\$\("([^"]+)"\)/g)) {
    assert.equal(ids.filter((id) => id === match[1]).length, 1, match[1]);
  }
});
