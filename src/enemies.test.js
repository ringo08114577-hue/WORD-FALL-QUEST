import test from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import {
  ENEMY_ABILITY_DEFINITIONS, ENEMY_DEFINITIONS, createEnemy,
  getEnemyAbilityEffects, getEnemyImagePath, getFloorEnemyIds,
} from "./enemies.js";
import { CHARACTER_IMAGE_CATALOG, DEFAULT_CHARACTER_IMAGE, getCharacterImagePath } from "./character-images.js";

test("敵カタログには基本敵・追加敵・ボスが登録されている", () => {
  assert.deepEqual(Object.keys(ENEMY_DEFINITIONS).slice(0, 7), [
    "slime", "orange-slime", "bat", "goblin", "orc", "moss-golem", "forest-dragon",
  ]);
  assert.deepEqual(Object.keys(ENEMY_DEFINITIONS).slice(7), [
    "ice-wolf", "ice-golem", "ice-dragon",
  ]);
  assert.equal(ENEMY_DEFINITIONS["forest-dragon"].isBoss, true);
  assert.equal(Object.isFrozen(ENEMY_DEFINITIONS), true);
});

test("キャラクター画像は共通カタログで管理され、未登録キャラは仮画像になる", () => {
  const expected = {
    slime: ["グリーンスライム", "assets/enemies/green-slime.webp"],
    "orange-slime": ["オレンジスライム", "assets/enemies/orange-slime.webp"],
    bat: ["お化けコウモリ", "assets/enemies/ghost-bat.webp"],
    orc: ["オーク", "assets/enemies/orc.webp"],
  };
  for (const [id, [name, image]] of Object.entries(expected)) {
    assert.equal(ENEMY_DEFINITIONS[id].name, name);
    assert.equal(CHARACTER_IMAGE_CATALOG[id].image, image);
    assert.equal(getCharacterImagePath(id), image);
    assert.equal(getEnemyImagePath(createEnemy(id)), image);
  }
  const addedArtwork = {
    hero: "assets/characters/hero.webp",
    goblin: "assets/enemies/goblin.webp",
    "moss-golem": "assets/enemies/moss-golem.webp",
    "forest-dragon": "assets/enemies/forest-dragon.webp",
    "ice-wolf": "assets/enemies/ice-wolf.webp",
  };
  for (const [id, image] of Object.entries(addedArtwork)) {
    assert.equal(getCharacterImagePath(id), image);
    if (id !== "hero") assert.equal(getEnemyImagePath(createEnemy(id)), image);
  }
  for (const id of Object.keys(ENEMY_DEFINITIONS)) {
    assert.ok(Object.hasOwn(CHARACTER_IMAGE_CATALOG, id), id + " の画像登録枠がありません");
  }
  for (const id of ["ice-golem", "ice-dragon"]) {
    assert.equal(getCharacterImagePath(id), DEFAULT_CHARACTER_IMAGE);
  }
});

test("共通カタログに登録した専用画像がすべて実在し、WebPとして読める", () => {
  const imageEntries = Object.entries(CHARACTER_IMAGE_CATALOG)
    .filter(([, definition]) => definition.image);
  assert.equal(imageEntries.length, 9);
  for (const [id, definition] of imageEntries) {
    const path = new URL("../" + definition.image, import.meta.url);
    assert.ok(existsSync(path), id + " の画像ファイルがありません: " + definition.image);
    const image = readFileSync(path);
    assert.equal(image.toString("ascii", 8, 12), "WEBP", id + " の画像がWebP形式ではありません");
  }
  const placeholderPath = new URL("../" + DEFAULT_CHARACTER_IMAGE, import.meta.url);
  assert.ok(existsSync(placeholderPath), "共通仮画像がありません");
  assert.match(readFileSync(placeholderPath, "utf8"), /<svg\s/);
});

test("古いセーブの画像パスは無視し、未登録キャラを共通仮画像へ切り替える", () => {
  assert.equal(
    getEnemyImagePath({ id: "slime", image: "assets/old-green-slime.webp" }),
    "assets/enemies/green-slime.webp",
  );
  assert.equal(
    getEnemyImagePath({ id: "goblin", image: "assets/old-goblin.webp" }),
    "assets/enemies/goblin.webp",
  );
  assert.equal(getEnemyImagePath({ id: "legacy-enemy", image: "assets/legacy.webp" }), DEFAULT_CHARACTER_IMAGE);
  assert.equal(getEnemyImagePath(null), null);
});

test("敵の能力IDから戦闘効果を集計できる", () => {
  assert.deepEqual(getEnemyAbilityEffects(createEnemy("bat")), {
    counterAttackBonus: 10, damageReduction: 0, defensePiercing: 0,
  });
  assert.deepEqual(getEnemyAbilityEffects(createEnemy("moss-golem")), {
    counterAttackBonus: 10, damageReduction: 10, defensePiercing: 0,
  });
  assert.deepEqual(getEnemyAbilityEffects(createEnemy("forest-dragon")), {
    counterAttackBonus: 10, damageReduction: 10, defensePiercing: 10,
  });
});

test("敵の能力一覧は個別生成され、呼び出し元の変更が定義へ影響しない", () => {
  const first = createEnemy("bat");
  first.abilities.push("guard");
  assert.deepEqual(createEnemy("bat").abilities, ["swift"]);
  assert.equal(ENEMY_ABILITY_DEFINITIONS.swift.name, "すばやい反撃");
});

test("フロア編成は5階分あり、最深部にボスがいる", () => {
  assert.deepEqual(getFloorEnemyIds(1), ["slime", "orange-slime", "goblin"]);
  assert.deepEqual(getFloorEnemyIds(2), ["bat", "orc", "moss-golem"]);
  assert.deepEqual(getFloorEnemyIds(3), ["goblin", "orc", "moss-golem"]);
  assert.deepEqual(getFloorEnemyIds(4), ["orc", "moss-golem", "goblin"]);
  assert.deepEqual(getFloorEnemyIds(5), ["moss-golem", "goblin", "forest-dragon"]);
  assert.throws(() => getFloorEnemyIds(0), TypeError);
  assert.throws(() => getFloorEnemyIds(6), RangeError);
});

test("階層補正は敵の基礎能力と経験値を保ちながら強化する", () => {
  const dragon = createEnemy("forest-dragon", { floor: 5 });
  assert.equal(dragon.maxHp, 940);
  assert.equal(dragon.attackPower, 60);
  assert.equal(dragon.experienceReward, 630);
  assert.equal(dragon.isBoss, true);
  assert.throws(() => createEnemy("unknown"), RangeError);
});
