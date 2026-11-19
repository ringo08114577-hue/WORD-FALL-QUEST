import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const root = new URL("../", import.meta.url);
const read = (path) => readFileSync(new URL(path, root), "utf8");

test("ホームは冒険者ステータスと施設ページへの入口を表示する", () => {
  const html = read("index.html");
  for (const link of ["status.html", "items.html", "equipment.html", "skills.html", "dungeons.html", "settings.html"]) {
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


test("ステータス画面は4枠のスキル装備を行い、強化はスキル工房に分ける", () => {
  const html = read("status.html");
  const script = read("src/status-page.js");
  assert.match(html, /冒険者ステータス/);
  assert.match(html, /status-page\.js/);
  assert.match(script, /GAME_ACTION\.EQUIP_SKILL/);
  assert.match(script, /equippedSkillIds/);
  assert.match(script, /skillLevels/);
  assert.match(read("skills.html"), /スキル工房/);
});

test("ホームには開発用画面へのリンクを表示せず、開発用ページも含めない", () => {
  const html = read("index.html");
  assert.ok(!html.includes("debug-state.html"));
  assert.doesNotMatch(html, /開発用画面/);
  assert.throws(() => read("debug-state.html"), { code: "ENOENT" });
});




test("ホームと各施設の初期表示は新しい冒険者の能力値と一致する", () => {
  for (const file of ["index.html", "status.html", "skills.html", "items.html", "equipment.html"]) {
    const html = read(file);
    assert.match(html, /HP 100 \/ 100/, file + " の初期HP表示");
    assert.doesNotMatch(html, /HP 3 \/ 3/, file + " に古いHP表示を残さない");
  }

  for (const file of ["index.html", "status.html"]) {
    assert.match(read(file), /id="attackValue">20/, file + " の初期攻撃力表示");
  }

  const status = read("status.html");
  assert.match(status, /EXP 0 \/ 100/);
  assert.match(status, /aria-valuemax="100" aria-valuenow="0" id="expBar"/);
});


test("ゲーム設定ページはレーン発光の4段階を保存し、ホームとバトルへ戻れる", () => {
  const html = read("settings.html");
  assert.match(html, /ゲーム設定/);
  assert.match(html, /id="laneFlashIntensity"/);
  assert.match(html, /<option value="none">なし<\/option>/);
  assert.match(html, /<option value="weak">弱<\/option>/);
  assert.match(html, /<option value="normal">標準<\/option>/);
  assert.match(html, /<option value="strong">強<\/option>/);
  assert.match(html, /wordFallQuestLaneFlashIntensity/);
  assert.match(html, /localStorage\.setItem\(laneFlashStorageKey, intensity\)/);
  assert.match(html, /href="\.\/index\.html"/);
  assert.match(html, /href="\.\/battle\.html"/);
});
