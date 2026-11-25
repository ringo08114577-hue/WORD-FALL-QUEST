import test from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import {
  CHARACTER_IMAGE_CATALOG,
  DEFAULT_CHARACTER_IMAGE,
  clearCharacterImage,
  getCharacterImagePath,
  setCharacterImage,
} from "./character-images.js";

function createFakeImage() {
  return {
    dataset: {}, hidden: true, alt: "", src: "", onload: null, onerror: null,
    removeAttribute(name) { if (name === "src") this.src = ""; },
  };
}

test("主人公を含む全キャラクターに画像登録枠がある", () => {
  assert.ok(Object.hasOwn(CHARACTER_IMAGE_CATALOG, "hero"));
  assert.ok(Object.isFrozen(CHARACTER_IMAGE_CATALOG));
  for (const definition of Object.values(CHARACTER_IMAGE_CATALOG)) {
    assert.ok(Object.isFrozen(definition));
    assert.ok(definition.image === null || typeof definition.image === "string");
  }
});

test("既存・追加キャラクターの専用画像パスが登録されている", () => {
  assert.equal(getCharacterImagePath("hero"), "assets/characters/hero.webp");
  assert.equal(getCharacterImagePath("ice-wolf"), "assets/enemies/ice-wolf.svg");
  assert.equal(getCharacterImagePath("forest-dragon"), "assets/enemies/forest-dragon.svg");
  assert.equal(getCharacterImagePath("goblin"), "assets/enemies/goblin.svg");
  assert.equal(getCharacterImagePath("moss-golem"), "assets/enemies/moss-golem.svg");
  assert.equal(getCharacterImagePath("poison-mushroom"), "assets/enemies/poison-mushroom.webp");
  assert.equal(getCharacterImagePath("forest-spider"), "assets/enemies/forest-spider.webp");
  assert.equal(getCharacterImagePath("grandvel"), "assets/enemies/grandvel.webp");
  assert.equal(getCharacterImagePath("morgal"), "assets/enemies/morgal.webp");
  assert.equal(getCharacterImagePath("loggar"), "assets/enemies/loggar.webp");
  assert.equal(getCharacterImagePath("volgrif"), "assets/enemies/volgrif.webp");
  assert.equal(getCharacterImagePath("ice-golem"), "assets/enemies/ice-golem.webp");
  assert.equal(getCharacterImagePath("ice-dragon"), "assets/enemies/ice-dragon.webp");
});

test("登録済みのキャラクター画像は存在し、画像形式も正しい", () => {
  for (const [characterId, definition] of Object.entries(CHARACTER_IMAGE_CATALOG)) {
    if (!definition.image) continue;
    const assetUrl = new URL("../" + definition.image, import.meta.url);
    assert.ok(existsSync(assetUrl), characterId + " の画像ファイルがありません");

    if (definition.image.endsWith(".webp")) {
      const bytes = readFileSync(assetUrl);
      assert.equal(bytes.toString("ascii", 0, 4), "RIFF", characterId + " のWebPヘッダーが不正です");
      assert.equal(bytes.toString("ascii", 8, 12), "WEBP", characterId + " のWebP形式が不正です");
    } else if (definition.image.endsWith(".svg")) {
      const svg = readFileSync(assetUrl, "utf8");
      assert.match(svg, /<svg\s/, characterId + " のSVG画像が不正です");
      assert.match(svg, /viewBox=/, characterId + " のSVGにviewBoxがありません");
    } else {
      assert.fail(characterId + " の画像形式が未対応です: " + definition.image);
    }
  }
});
test("画像未登録・未知のキャラクターは共通仮画像を返す", () => {
  assert.equal(getCharacterImagePath("plain-slime"), DEFAULT_CHARACTER_IMAGE);
  assert.equal(getCharacterImagePath("not-registered"), DEFAULT_CHARACTER_IMAGE);
  assert.equal(getCharacterImagePath(null), DEFAULT_CHARACTER_IMAGE);
});

test("専用画像をGitHub Pagesのサブパス基準で読み込む", () => {
  const image = createFakeImage();
  setCharacterImage(image, "slime", {
    alt: "グリーンスライムの画像",
    baseUrl: "https://example.com/WORD-FALL-QUEST/battle.html",
  });
  assert.equal(image.src, "https://example.com/WORD-FALL-QUEST/assets/enemies/green-slime.webp");
  assert.equal(image.alt, "グリーンスライムの画像");
  assert.equal(image.hidden, true);
  image.onload();
  assert.equal(image.hidden, false);
});

test("専用画像の読み込みに失敗したら共通仮画像へ一度だけ切り替える", () => {
  const image = createFakeImage();
  setCharacterImage(image, "slime", {
    baseUrl: "https://example.com/WORD-FALL-QUEST/battle.html",
  });
  image.onerror();
  assert.equal(image.src, "https://example.com/WORD-FALL-QUEST/assets/characters/placeholder.svg");
  assert.equal(image.dataset.characterUsingPlaceholder, "true");
  image.onerror();
  assert.equal(image.hidden, true);
  assert.equal(image.dataset.characterImageFailed, "true");
  assert.equal(image.src, "https://example.com/WORD-FALL-QUEST/assets/characters/placeholder.svg");
});

test("仮画像自体が読み込めない場合は再試行を繰り返さず非表示にする", () => {
  const image = createFakeImage();
  setCharacterImage(image, "plain-slime", {
    baseUrl: "https://example.com/WORD-FALL-QUEST/battle.html",
  });
  const originalSource = image.src;
  image.onerror();
  assert.equal(image.src, originalSource);
  assert.equal(image.hidden, true);
  assert.equal(image.dataset.characterImageFailed, "true");
});

test("画像をクリアしたあと同じキャラクターを再設定できる", () => {
  const image = createFakeImage();
  setCharacterImage(image, "slime", {
    baseUrl: "https://example.com/WORD-FALL-QUEST/battle.html",
  });
  clearCharacterImage(image);
  assert.equal(image.hidden, true);
  assert.equal(image.src, "");
  assert.equal(image.dataset.characterId, undefined);
  setCharacterImage(image, "slime", {
    baseUrl: "https://example.com/WORD-FALL-QUEST/battle.html",
  });
  assert.ok(image.src.endsWith("/assets/enemies/green-slime.webp"));
});

test("共通仮画像はSVGファイルとして登録されている", () => {
  const path = new URL("../" + DEFAULT_CHARACTER_IMAGE, import.meta.url);
  assert.ok(existsSync(path), "共通仮画像ファイルがありません");
  const svg = readFileSync(path, "utf8");
  assert.match(svg, /<svg\s/);
  assert.match(svg, /viewBox=/);
});
