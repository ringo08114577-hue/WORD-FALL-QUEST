import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const root = new URL("../", import.meta.url);
const read = (path) => readFileSync(new URL(path, root), "utf8");


test("旧店舗リンクはアイテム欄に表示しない", () => {
  const html = read("inventory.html");
  assert.doesNotMatch(html, /道具屋へ/);
  assert.doesNotMatch(html, /武器・防具屋へ/);
  assert.doesNotMatch(html, /href="\.\/items\.html"/);
  assert.doesNotMatch(html, /href="\.\/equipment\.html"/);
  assert.match(html, /href="\.\/index\.html"/);
});

test("アイテム欄の入手先と空表示は統合後のショップ名に統一する", () => {
  const script = read("src/inventory-page.js");
  assert.match(script, /sources\.push\("ショップ"\)/);
  assert.match(script, /ショップで装備を手に入れよう/);
  assert.match(read("inventory.html"), /data-category="weapon"[^>]*>装備<span id="weaponCount">/);
  assert.match(script, /装備タブには、武器・盾・鎧・アクセサリー/);
  assert.doesNotMatch(script, /武器タブ/);
  assert.match(script, /ショップやダンジョンの宝箱/);
  assert.doesNotMatch(script, /道具屋|武器・防具屋/);
});

test("装備4枠は装備タブ内だけに表示し、装備変更もそこで扱う", () => {
  const html = read("inventory.html");
  const script = read("src/inventory-page.js");
  const tabsIndex = html.indexOf('class="category-tabs"');
  const managementIndex = html.indexOf('id="equipmentManagement"');
  const itemsIndex = html.indexOf('id="inventoryGrid"');
  assert.ok(tabsIndex >= 0 && managementIndex > tabsIndex && itemsIndex > managementIndex);
  assert.match(html, /id="equipmentManagement"[^>]*hidden/);
  assert.match(html, /id="equipmentOverview"/);
  assert.match(script, /equipmentManagement\.hidden = activeCategory !== "weapon"/);
  assert.match(script, /if \(activeCategory === "weapon"\) renderEquipmentOverview/);
  assert.match(script, /equipButton\.dataset\.equipItem = item\.itemId/);
  assert.match(script, /GAME_ACTION\.PREPARE_EQUIPMENT/);
});

test("アイテム欄の未装備カードには現在の装備との能力比較を表示する", () => {
  const html = read("inventory.html");
  const script = read("src/inventory-page.js");
  const helper = read("src/equipment-comparison.js");
  assert.match(html, /\.item-comparison\{/);
  assert.match(html, /\.comparison-stat\.is-better/);
  assert.match(html, /\.comparison-stat\.is-worse/);
  assert.match(script, /compareEquipment\(item, currentItem\)/);
  assert.match(script, /現在の「/);
  assert.match(script, /未装備からの変化/);
  assert.match(script, /createItemCard\(item, state\.inventory\)/);
  assert.match(helper, /difference: after - before/);
  assert.match(helper, /hasChanges: stats\.some/);
});

test("アイテム欄の素材カードには1個売却とまとめ売却の操作がある", () => {
  const html = read("inventory.html");
  const script = read("src/inventory-page.js");
  assert.match(html, /sell-controls/);
  assert.match(script, /1個売る/);
  assert.match(script, /全部売る/);
  assert.match(script, /sellController\.sell\(itemId, quantity\)/);
  assert.match(script, /saves\.save\(\)/);
});

test("ホームは町マップを中心にし、施設一覧を重複表示しない", () => {
  const html = read("index.html");
  assert.match(html, /<main id="homePage">/);
  assert.match(html, /冒険者ギルド/);
  assert.match(html, /id="hpValue"/);
  assert.match(html, /id="goldValue"/);
  assert.match(html, /id="heroAvatar"/);
  assert.doesNotMatch(html, /class="facility-grid"/);
  assert.doesNotMatch(html, /<h2>街の施設<\/h2>/);
  assert.match(html, /town-map-panel/);
  assert.match(html, /createAppSession/);
  assert.match(html, /session\.returnToTown\(\)/);
  assert.doesNotMatch(html, /宿屋|innRestButton/);
});


test("ホームの町マップは建物から既存の施設へ移動できる", () => {
  const html = read("index.html");
  assert.match(html, /id="townMapTitle">町のマップ/);
  for (const route of ["dungeons.html", "shop.html", "crafting.html", "inventory.html"]) {
    assert.ok(html.includes('class="town-map-spot" href="./' + route + '"'), route + " map link");
  }
  assert.match(html, /aria-label="冒険者の町/);
  assert.doesNotMatch(html, /class="facility-grid"/);
  assert.match(html, /shared-layout\.css/);
  assert.match(html, /shared-layout\.js/);
});


test("統合ショップ・鍛冶屋・スキル工房はそれぞれ独立したHTMLページを持つ", () => {
  for (const [file, facility] of [
    ["shop.html", "shop"],
    ["crafting.html", "crafting"],
    ["skills.html", "skills"],
  ]) {
    const html = read(file);
    assert.match(html, new RegExp('data-facility="' + facility + '"'));
    assert.match(html, /facility-page\.js/);
    assert.match(html, /index\.html/);
  }
});

test("ショップのスマホ表示は幅360px以下でも商品カードを2列にする", () => {
  const html = read("shop.html");
  assert.match(html, /@media\(max-width:360px\)[\s\S]*?\.offer-grid\{grid-template-columns:repeat\(2,minmax\(0,1fr\)\)/);
  assert.match(html, /\.offer-card button\{padding:8px 6px/);
});

test("ショップは商品を種類ごとに選択して購入だけできる", () => {
  const html = read("shop.html");
  const script = read("src/facility-page.js");
  assert.match(html, /data-facility="shop"/);
  assert.match(html, /ショップ/);
  assert.match(script, /SHOP_CATEGORY_OPTIONS/);
  assert.match(script, /何を買う？/);
  assert.match(script, /data-shop-category/);
  assert.match(script, /data-shop-back/);
  assert.match(script, /item\.type === "consumable"/);
  assert.match(script, /item\.slot === category/);
  assert.match(script, /shop\.buy\(shopButton\.dataset\.shopItem\)/);
  assert.doesNotMatch(script, /data-equip-item|PREPARE_EQUIPMENT|EQUIP_ITEM/);
  assert.match(script, /saves\.save\(\)/);
});

test("装備変更はアイテム欄に集約し、装備中の装備と付け替えボタンを表示する", () => {
  const html = read("inventory.html");
  const script = read("src/inventory-page.js");
  assert.match(html, /\.equip-button\{/);
  assert.match(script, /item\.equipped \? "装備中"/);
  assert.match(script, /equipButton.dataset.equipItem = item.itemId/);
  assert.match(script, /GAME_ACTION\.PREPARE_EQUIPMENT/);
  assert.match(script, /saves\.save\(\)/);
});

test("旧店舗URLは旧店舗名を表示せず、統合ショップへ転送する", () => {
  for (const file of ["items.html", "equipment.html"]) {
    const html = read(file);
    assert.match(html, /http-equiv="refresh"/);
    assert.match(html, /window\.location\.replace\("\.\/shop\.html"\)/);
    assert.match(html, /href="\.\/shop\.html"/);
    assert.match(html, /このページはショップに統合されました/);
    assert.doesNotMatch(html, /道具屋|武器・防具屋/);
  }
});

test("鍛冶屋は素材とゴールドを使った装備作成だけを行う", () => {
  const html = read("crafting.html");
  const script = read("src/facility-page.js");
  assert.match(html, /data-facility="crafting"/);
  assert.match(script, /renderCrafting/);
  assert.match(script, /何を作る？/);
  assert.match(script, /data-craft-category/);
  assert.match(script, /data-craft-back/);
  assert.match(script, /CRAFTING_CATEGORY_LABELS/);
  assert.match(script, /ITEM_DEFINITIONS\[itemId\]\.slot === slot/);
  assert.match(script, /crafting\.craft\(craftButton\.dataset\.craftItem\)/);
  assert.doesNotMatch(script, /data-equip-item|PREPARE_EQUIPMENT|EQUIP_ITEM/);
  assert.match(script, /saves.save()/);
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
  for (const file of ["index.html", "status.html", "skills.html", "shop.html", "crafting.html"]) {
    const html = read(file);
    assert.match(html, /HP 100 \/ 100/, file + " の初期HP表示");
    assert.doesNotMatch(html, /HP 3 \/ 3/, file + " に古いHP表示を残さない");
  }

  assert.match(read("status.html"), /id="attackValue">20/, "ステータス画面の初期攻撃力表示");

  const status = read("status.html");
  assert.match(status, /EXP 0 \/ 100/);
  assert.match(status, /aria-valuemax="100" aria-valuenow="0" id="expBar"/);
});

test("ゲーム設定ページは演出設定を保存し、ホームへ戻れる", () => {
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
  assert.doesNotMatch(html, /href="\.\/battle\.html"/);
});

test("ホームとステータスはバトルと同じ主人公画像を共通ローダーで表示する", () => {
  const home = read("index.html");
  const status = read("status.html");
  const statusScript = read("src/status-page.js");
  const imageLoader = read("src/character-images.js");
  for (const html of [home, status]) {
    assert.match(html, /<img id="heroAvatar" alt="主人公" hidden>/);
    assert.match(html, /\.avatar img\{display:block;width:100%;height:100%/);
  }
  assert.match(home, /import \{ setCharacterImage \} from "\.\/src\/character-images\.js"/);
  assert.match(home, /setCharacterImage\(document\.getElementById\("heroAvatar"\), "hero"/);
  assert.match(statusScript, /import \{ setCharacterImage \} from "\.\/character-images\.js"/);
  assert.match(statusScript, /setCharacterImage\(\$\("heroAvatar"\), "hero"/);
  assert.match(imageLoader, /hero: Object\.freeze\(\{ image: "assets\/characters\/hero\.webp" \}\)/);
});

test("通常ページは共通レイアウトとダークファンタジーのデザインを読み込む", () => {
  const pages = ["index.html","inventory.html","shop.html","crafting.html","dungeons.html","status.html","skills.html","settings.html","account.html"];
  for (const page of pages) {
    const html = read(page);
    assert.ok(html.includes("shared-layout.css"), page + " stylesheet");
    assert.ok(html.includes("shared-layout.js"), page + " navigation");
    assert.ok(html.includes("<main"), page + " main content");
  }
  const css = read("src/shared-layout.css");
  assert.ok(css.includes("--wfq-page: #09121b"));
  assert.ok(css.includes("--wfq-green:"));
  assert.ok(css.includes("--wfq-gold: #e0b45b"));
  assert.ok(css.includes("color-scheme: dark"));
  assert.ok(css.includes(".wfq-mobile-nav"));
  assert.ok(css.includes("grid-template-columns:232px minmax(0,1fr)"));
});

test("共通ナビゲーションは主要4項目と施設ドロワーを持つ", () => {
  const script = read("src/shared-layout.js");
  for (const file of ["index.html","dungeons.html","inventory.html","status.html","shop.html","crafting.html","skills.html","settings.html","account.html"]) {
    assert.ok(script.includes(file), file + " navigation");
  }
  assert.match(script, /aria-current/);
  assert.match(script, /aria-expanded/);
  assert.ok(script.includes('event.key === "Escape"'));
  assert.match(script, /wfqFacilityDrawer/);
});

test("バトル画面には通常ナビゲーションを追加せず、戦闘操作を優先する", () => {
  const html = read("battle.html");
  assert.doesNotMatch(html, /shared-layout\\.js|shared-layout\\.css/);
});
