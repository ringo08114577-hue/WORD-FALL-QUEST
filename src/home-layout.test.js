import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const root = new URL("../", import.meta.url);
const read = (path) => readFileSync(new URL(path, root), "utf8");

test("ホームは冒険者ステータスと施設ページへの入口を表示する", () => {
  const html = read("index.html");
  for (const link of ["items.html", "equipment.html", "skills.html", "dungeons.html"]) {
    assert.ok(html.includes('href="./' + link + '"'), link);
  }
  assert.match(html, /createAppSession/);
  assert.match(html, /session\.returnToTown\(\)/);
  assert.doesNotMatch(html, /宿屋|innRestButton/);
});

test("ショップ・スキル工房はそれぞれ独立したHTMLページを持つ", () => {
  for (const [file, facility] of [
    ["items.html", "items"],
    ["equipment.html", "equipment"],
    ["skills.html", "skills"],
  ]) {
    const html = read(file);
    assert.match(html, new RegExp('data-facility="' + facility + '"'));
    assert.match(html, /facility-page\.js/);
    assert.match(html, /index\.html/);
  }
});

test("ダンジョン選択ページはダンジョンと階層の両方を選べる", () => {
  const html = read("dungeons.html");
  const script = read("src/dungeons-page.js");
  assert.match(html, /id="dungeonGrid"/);
  assert.match(html, /id="floorGrid"/);
  assert.match(script, /dungeon\.selectDungeon\(id\)/);
  assert.match(script, /dungeon\.selectFloor\(Number\(button\.dataset\.floor\)\)/);
  assert.match(script, /progress\.unlockedFloor/);
});

test("施設ページのID参照先がすべてHTML内に存在する", () => {
  const html = read("index.html");
  const ids = [...html.matchAll(/id="([^"]+)"/g)].map((match) => match[1]);
  assert.equal(ids.length, new Set(ids).size);
});
