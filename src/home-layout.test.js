import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const html = readFileSync(new URL("../index.html", import.meta.url), "utf8");

test("冒険者ホームはダンジョンカタログから行き先を自動表示する", () => {
  assert.match(html, /id="dungeonSelectionGrid"/);
  assert.match(html, /import \{ DUNGEON_DEFINITIONS \} from "\.\/src\/data\/dungeons\.js"/);
  assert.match(html, /Object\.values\(DUNGEON_DEFINITIONS\)/);
  assert.match(html, /data-dungeon-id/);
});

test("選択したダンジョンを保存し、冒険開始後は切り替えられない", () => {
  assert.match(html, /dungeon\.selectDungeon\(button\.dataset\.dungeonId\)/);
  assert.match(html, /const saved = saves\.save\(\)/);
  assert.match(html, /state\.phase === GAME_PHASE\.TITLE && !progress\.started/);
  assert.match(html, /冒険開始後は変更できません/);
});

test("ダンジョン選択画面のIDは一意でJavaScript参照も存在する", () => {
  const ids = [...html.matchAll(/id="([^"]+)"/g)].map((match) => match[1]);
  assert.equal(ids.length, new Set(ids).size);
  for (const match of html.matchAll(/\$\("([^"]+)"\)/g)) {
    assert.equal(ids.filter((id) => id === match[1]).length, 1, match[1]);
  }
});
