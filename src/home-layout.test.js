import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";

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

test("ホームは冒険を主役にし、プレイヤー情報と4つの施設をコンパクトにまとめる", () => {
  const html = read("index.html");
  assert.match(html, /<main id="homePage"/);
  assert.match(html, /冒険者ギルド/);
  assert.match(html, /id="home-player-panel"|class="home-player-panel"/);
  assert.match(html, /id="hpValue"/);
  assert.match(html, /id="goldValue"/);
  assert.match(html, /id="heroAvatar"/);
  assert.match(html, /class="home-choice-card home-choice-featured" href="\.\/dungeons\.html"/);
  assert.match(html, /次の行動を選ぼう/);
  assert.doesNotMatch(html, /class="facility-grid"/);
  assert.doesNotMatch(html, /town-map-panel|town-map|<h2>街の施設<\/h2>/);
  assert.match(html, /createAppSession/);
  assert.match(html, /session\.returnToTown\(\)/);
  assert.doesNotMatch(html, /宿屋|innRestButton/);
});


test("ホーム中央に冒険・装備・ショップ・鍛冶屋・スキル工房の選択肢を表示する", () => {
  const html = read("index.html");
  assert.match(html, /id="homePage"/);
  for (const route of ["dungeons.html", "inventory.html", "shop.html", "crafting.html", "skills.html"]) {
    assert.ok(html.includes('href="./' + route + '"'), route + " home destination");
  }
  assert.match(html, /冒険に出る/);
  assert.match(html, /装備を整える/);
  assert.match(html, /スキル工房/);
  assert.match(html, /id="heroAvatar"/);
  assert.match(html, /id="hpValue"/);
  assert.match(html, /id="goldValue"/);
  const homeMarkup = html.slice(html.indexOf("<main"), html.indexOf("</main>"));
  assert.doesNotMatch(homeMarkup, /town-map|facility-grid/);
  assert.match(html, /createAppSession/);
  assert.match(html, /session\.returnToTown\(\)/);
});

test("その他メニューは設定とアカウントだけを表示し、ホームの施設を重複させない", () => {
  const script = read("src/shared-layout.js");
  assert.match(script, /const MORE_ITEMS = Object\.freeze\(\[([\s\S]*?)settings\.html[\s\S]*?account\.html[\s\S]*?\]\)/);
  for (const file of ["shop.html", "crafting.html", "skills.html"]) {
    assert.doesNotMatch(script.match(/const MORE_ITEMS = Object\.freeze\(\[([\s\S]*?)\]\);/)[1], new RegExp(file.replace(".", "\\.")));
  }
});



test("共通レイアウトはページごとにNPCの立ち絵とセリフを切り替える", () => {
  const script = read("src/shared-layout.js");
  for (const [page, portrait] of [
    ["index.html", "guild-receptionist.webp"],
    ["dungeons.html", "guild-receptionist.webp"],
    ["shop.html", "merchant.webp"],
    ["crafting.html", "blacksmith.webp"],
    ["inventory.html", "quartermaster.svg"],
    ["status.html", "trainer.svg"],
    ["skills.html", "arcanist.svg"],
    ["settings.html", "guild-receptionist.webp"],
    ["account.html", "guild-receptionist.webp"],
  ]) {
    assert.match(script, new RegExp('"' + page + '"[\\s\\S]*?' + portrait));
  }
  assert.match(script, /createNpcStage\(current\)/);
  assert.match(script, /wfq-npc-stage/);
  const css = read("src/shared-layout.css");
  assert.match(css, /\.wfq-npc-portrait/);
  assert.match(css, /\.wfq-npc-dialogue/);
  assert.match(css, /\.wfq-npc-next/);
  assert.match(css, /@keyframes wfq-npc-line-in/);
  assert.match(script, /lineIndex = \(lineIndex \+ 1\) % lines\.length/);
  assert.ok(existsSync(new URL("assets/npcs/guild-receptionist.webp", root)), "受付嬢のWebP画像が存在する");
  assert.ok(existsSync(new URL("assets/npcs/merchant.webp", root)), "商人のWebP画像が存在する");
  assert.ok(existsSync(new URL("assets/npcs/blacksmith.webp", root)), "鍛冶師のWebP画像が存在する");
  for (const file of [
    "assets/npcs/blacksmith.svg",
    "assets/npcs/quartermaster.svg",
    "assets/npcs/trainer.svg",
    "assets/npcs/arcanist.svg",
  ]) assert.ok(read(file).includes("<svg"), file);
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

test("ダンジョンカードは専用背景画像とコンパクトな進行情報を表示する", () => {
  const html = read("dungeons.html");
  const script = read("src/dungeons-page.js");
  const catalog = read("src/data/dungeons.js");
  assert.match(html, /<main id="dungeonPage">/);
  assert.match(html, /id="dungeonGrid"/);
  assert.match(html, /id="floorGrid"/);
  assert.match(html, /id="selectedDungeonName"/);
  assert.match(html, /id="selectedFloorLabel"/);
  assert.match(html, /id="adventureButton" href="\.\/battle\.html"/);
  assert.match(html, /repeat\(auto-fill,minmax\(145px,1fr\)\)/);
  assert.match(html, /repeat\(auto-fill,minmax\(130px,1fr\)\)/);
  assert.match(html, /\.dungeon-card-art img/);
  assert.match(html, /\.dungeon-card-shade/);
  assert.match(script, /artImage\.src = info\.art/);
  assert.match(script, /dungeon-card-head/);
  assert.match(script, /dungeon-card-footer/);
  assert.match(catalog, /art: "\.\/assets\/dungeons\/forest-ruins\.svg"/);
  assert.match(catalog, /art: "\.\/assets\/dungeons\/frozen-cavern\.svg"/);
  for (const path of ["assets/dungeons/forest-ruins.svg","assets/dungeons/frozen-cavern.svg"]) {
    assert.ok(existsSync(new URL("../" + path, root)), path + " artwork exists");
    assert.match(read(path), /<svg[\s\S]*viewBox=/);
  }
  assert.doesNotMatch(script, /info\.description|dungeon-reward/);
  assert.match(script, /dungeon\.selectDungeon\(id\)/);
  assert.match(script, /dungeon\.selectFloor\(Number\(button\.dataset\.floor\)\)/);
  assert.match(script, /progress\.unlockedFloor/);
  assert.match(script, /\$\("selectedFloorLabel"\)\.textContent/);
  assert.match(script, /saves\.save\(\)/);
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
    assert.match(html, /\.avatar img\s*\{[\s\S]*?width:100%;[\s\S]*?height:100%/);
  }
  assert.match(home, /import \{ setCharacterImage \} from "\.\/src\/character-images\.js"/);
  assert.match(home, /setCharacterImage\(document\.getElementById\("heroAvatar"\), "hero"/);
  assert.match(statusScript, /import \{ setCharacterImage \} from "\.\/character-images\.js"/);
  assert.match(statusScript, /setCharacterImage\(\$\("heroAvatar"\), "hero"/);
  assert.match(imageLoader, /hero: Object\.freeze\(\{ image: "assets\/characters\/hero\.webp" \}\)/);
});

test("共通UIにカードへ重なる円形の装飾ラインを表示しない", () => {
  const css = read("src/shared-layout.css");
  assert.doesNotMatch(css, /\.wfq-npc-stage::after/);
  assert.doesNotMatch(css, /\.wfq-content \.facility-link::after/);
  assert.doesNotMatch(css, /border-radius:\s*50%/);
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


test("ホームは受付嬢にプレイヤーレベルと各ダンジョンの進行状況を渡す", () => {
  const html = read("index.html");
  const script = read("src/shared-layout.js");
  assert.match(html, /window\.WFQ_HOME_CONTEXT = \{/);
  assert.match(html, /dungeonProgress: dungeon\.getAllProgress\(\)/);
  assert.match(script, /getReceptionistAdvice\(window\.WFQ_HOME_CONTEXT \?\? \{\}\)/);
  assert.match(script, /wfq-npc-advice/);
  assert.match(script, /冒険先を見る/);
});

test("受付嬢のおすすめ表示は現在のレベルとクリア状況に合わせて変わる", () => {
  const script = read("src/receptionist-advisor.js");
  assert.match(script, /推奨LV\.3/);
  assert.match(script, /HPが少なくなっています/);
  assert.match(script, /forestProgress\.cleared/);
  assert.match(script, /frozenProgress\.cleared/);
  assert.match(script, /presentation-only/);
});


test("鍛冶師NPCは素材・ゴールド・装備状況に応じた案内を表示する", () => {
  const script = read("src/shared-layout.js");
  const html = read("crafting.html");
  const facility = read("src/facility-page.js");
  assert.match(script, /getBlacksmithAdvice\(window\.WFQ_BLACKSMITH_CONTEXT/);
  assert.match(script, /wfq-npc-stage--blacksmith/);
  assert.match(script, /ガルドの鍛冶アドバイス/);
  assert.match(facility, /WFQ_BLACKSMITH_CONTEXT/);
  assert.match(facility, /wfq:blacksmith-context-updated/);
  assert.match(script, /blacksmith\.webp/);
});

test("鍛冶師のおすすめは装備・レシピを参照し、ゲーム状態を変更しない", () => {
  const script = read("src/blacksmith-advisor.js");
  assert.match(script, /CRAFTING_RECIPES/);
  assert.match(script, /ITEM_DEFINITIONS/);
  assert.match(script, /missingMaterials/);
  assert.match(script, /equipmentPower/);
  assert.match(script, /never spends gold, crafts items, or changes equipment/);
});


test("商人ロウは所持HP・回復薬・装備・素材に応じた案内を表示する", () => {
  const script = read("src/shared-layout.js");
  const facility = read("src/facility-page.js");
  const html = read("shop.html");
  assert.match(script, /getMerchantAdvice\(window\.WFQ_MERCHANT_CONTEXT/);
  assert.match(script, /wfq-npc-advice--merchant/);
  assert.match(script, /wfq:merchant-context-updated/);
  assert.match(facility, /WFQ_MERCHANT_CONTEXT/);
  assert.match(facility, /state\.player\.hp/);
  assert.match(script, /素材を売却する/);
  assert.match(html, /data-facility="shop"/);
});

test("商人の案内は購入や売却を自動実行せず、アイテム欄の売却画面へ案内する", () => {
  const script = read("src/merchant-advisor.js");
  assert.match(script, /ITEM_SHOP_PRICES/);
  assert.match(script, /sellPrice/);
  assert.match(script, /never purchases items or sells materials/);
  assert.match(script, /inventory\.html/);
  assert.match(script, /small-potion/);
  assert.match(script, /equipment/);
});



test("ショップのロウの画像・会話・おすすめ・操作ボタンは一つのパネルにまとまる", () => {
  const script = read("src/shared-layout.js");
  const css = read("src/shared-layout.css");
  assert.match(script, /wfq-npc-stage--merchant/);
  assert.match(script, /wfq-npc-advice-actions/);
  assert.match(script, /素材を売却する/);
  assert.match(css, /grid-template-areas:[\s\S]*"portrait dialogue"[\s\S]*"advice advice"/);
  assert.match(css, /\.wfq-npc-stage--merchant \.wfq-npc-dialogue[\s\S]*background:transparent/);
  assert.match(css, /@media\(max-width:480px\)[\s\S]*\.wfq-npc-stage--merchant/);
});
