import test from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import {
  ENEMY_ABILITY_DEFINITIONS, ENEMY_DEFINITIONS, createEnemy,
  getEnemyAbilityEffects, getEnemyImagePath, getFloorEnemyIds,
  isValidFloorEncounterIds,
} from "./enemies.js";
import {
  CHARACTER_IMAGE_CATALOG, DEFAULT_CHARACTER_IMAGE, getCharacterImagePath,
} from "./character-images.js";

test("森の雑魚8体・中ボス4体・大ボスがキャラクターカタログに登録されている", () => {
  const forestNormalIds = ["slime", "plain-slime", "goblin", "bat",
    "poison-mushroom", "forest-spider", "orc", "moss-golem"];
  const miniBossIds = ["grandvel", "morgal", "loggar", "volgrif"];
  for (const id of forestNormalIds) {
    assert.equal(ENEMY_DEFINITIONS[id].rank, "normal", id);
    assert.equal(ENEMY_DEFINITIONS[id].encounter.type, "normal", id);
  }
  for (const id of miniBossIds) {
    assert.equal(ENEMY_DEFINITIONS[id].rank, "miniBoss", id);
    assert.equal(ENEMY_DEFINITIONS[id].isMiniBoss, true, id);
    assert.equal(ENEMY_DEFINITIONS[id].encounter.type, "miniBoss", id);
  }
  assert.equal(ENEMY_DEFINITIONS["forest-dragon"].rank, "boss");
  assert.equal(ENEMY_DEFINITIONS["forest-dragon"].isBoss, true);
  assert.equal(Object.isFrozen(ENEMY_DEFINITIONS), true);
  for (const id of Object.keys(ENEMY_DEFINITIONS)) {
    assert.ok(Object.hasOwn(CHARACTER_IMAGE_CATALOG, id), id + " の画像登録枠がありません");
  }
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
    goblin: "assets/enemies/goblin.svg",
    "moss-golem": "assets/enemies/moss-golem.svg",
    "forest-dragon": "assets/enemies/forest-dragon.svg",
    "ice-wolf": "assets/enemies/ice-wolf.svg",
  };
  for (const [id, image] of Object.entries(addedArtwork)) {
    assert.equal(getCharacterImagePath(id), image);
    if (id !== "hero") assert.equal(getEnemyImagePath(createEnemy(id)), image);
  }
  for (const id of ["plain-slime", "poison-mushroom", "forest-spider",
    "grandvel", "morgal", "loggar", "volgrif", "ice-golem", "ice-dragon"]) {
    assert.equal(getCharacterImagePath(id), DEFAULT_CHARACTER_IMAGE);
  }
});

test("共通カタログに登録した専用画像がすべて実在し、形式も正しい", () => {
  const imageEntries = Object.entries(CHARACTER_IMAGE_CATALOG)
    .filter(([, definition]) => definition.image);
  assert.equal(imageEntries.length, 9);
  for (const [id, definition] of imageEntries) {
    const path = new URL("../" + definition.image, import.meta.url);
    assert.ok(existsSync(path), id + " の画像ファイルがありません: " + definition.image);
    const image = readFileSync(path);
    if (definition.image.endsWith(".webp")) {
      assert.equal(image.toString("ascii", 0, 4), "RIFF", id + " のWebPヘッダーが不正です");
      assert.equal(image.toString("ascii", 8, 12), "WEBP", id + " の画像がWebP形式ではありません");
    } else if (definition.image.endsWith(".svg")) {
      const svg = image.toString("utf8");
      assert.match(svg, /<svg\s/, id + " のSVG画像が不正です");
      assert.match(svg, /viewBox=/, id + " のSVGにviewBoxがありません");
    } else {
      assert.fail(id + " の画像形式が未対応です: " + definition.image);
    }
  }
  const placeholderPath = new URL("../" + DEFAULT_CHARACTER_IMAGE, import.meta.url);
  assert.ok(existsSync(placeholderPath), "共通仮画像がありません");
  assert.match(readFileSync(placeholderPath, "utf8"), /<svg\s/);
});

test("各階は通常敵4体と中ボス、5階は通常敵4体と大ボスになる", () => {
  for (let floor = 1; floor <= 5; floor += 1) {
    const ids = getFloorEnemyIds(floor, "forest-ruins", { random: () => 0 });
    assert.equal(ids.length, 5);
    assert.equal(new Set(ids.slice(0, 4)).size, 4);
    assert.ok(ids.slice(0, 4).every((id) =>
      ENEMY_DEFINITIONS[id].encounter.type === "normal"));
    assert.equal(ENEMY_DEFINITIONS[ids.at(-1)].rank,
      floor === 5 ? "boss" : "miniBoss");
    const expectedSpecial = ["grandvel", "morgal", "loggar", "volgrif", "forest-dragon"][floor - 1];
    assert.equal(ids.at(-1), expectedSpecial);
    assert.equal(isValidFloorEncounterIds(floor, "forest-ruins", ids), true);
  }
});

test("通常敵は階層ごとの出現条件・重みで抽選され、同じ階でも編成が変わる", () => {
  const commonBiased = getFloorEnemyIds(1, "forest-ruins", { random: () => 0 });
  const rareBiased = getFloorEnemyIds(1, "forest-ruins", { random: () => 0.99 });
  assert.notDeepEqual(commonBiased.slice(0, 4), rareBiased.slice(0, 4));
  assert.equal(commonBiased.at(-1), "grandvel");
  assert.equal(rareBiased.at(-1), "grandvel");
  assert.equal(isValidFloorEncounterIds(1, "forest-ruins",
    ["slime", "slime", "bat", "goblin", "grandvel"]), false);
  assert.equal(isValidFloorEncounterIds(1, "forest-ruins",
    ["ice-wolf", "plain-slime", "bat", "goblin", "grandvel"]), false);
  assert.throws(() => getFloorEnemyIds(1, "forest-ruins", { random: () => 1 }), RangeError);
});

test("氷結の洞窟の既存編成は専用中ボスが決まるまで維持する", () => {
  assert.deepEqual(getFloorEnemyIds(1, "frozen-cavern"), ["ice-wolf", "orc", "ice-golem"]);
  assert.deepEqual(getFloorEnemyIds(5, "frozen-cavern"), ["orc", "ice-golem", "ice-dragon"]);
  assert.throws(() => getFloorEnemyIds(0), TypeError);
  assert.throws(() => getFloorEnemyIds(6), RangeError);
});

test("敵の能力IDから戦闘効果を集計し、中ボスの属性も生成される", () => {
  assert.deepEqual(getEnemyAbilityEffects(createEnemy("bat")), {
    counterAttackBonus: 10, damageReduction: 0, defensePiercing: 0,
  });
  assert.deepEqual(getEnemyAbilityEffects(createEnemy("moss-golem")), {
    counterAttackBonus: 10, damageReduction: 10, defensePiercing: 0,
  });
  assert.deepEqual(getEnemyAbilityEffects(createEnemy("forest-dragon")), {
    counterAttackBonus: 10, damageReduction: 10, defensePiercing: 10,
  });
  const miniBoss = createEnemy("grandvel", { floor: 2 });
  assert.equal(miniBoss.isMiniBoss, true);
  assert.equal(miniBoss.isBoss, false);
  assert.equal(miniBoss.attackElement, "earth");
  assert.equal(miniBoss.elementalWeakness, "fire");
  assert.equal(miniBoss.elementalResistance, "earth");
  assert.equal(createEnemy("forest-dragon").isBoss, true);
});

test("敵の能力一覧は個別生成され、呼び出し元の変更が定義へ影響しない", () => {
  const first = createEnemy("bat");
  first.abilities.push("guard");
  assert.deepEqual(createEnemy("bat").abilities, ["swift"]);
  assert.equal(ENEMY_ABILITY_DEFINITIONS.swift.name, "すばやい反撃");
});

test("階層補正はHPと攻撃力を階層ごとの倍率で大きく強化する", () => {
  const expected = [
    [800, 50],
    [1080, 63],
    [1458, 78],
    [1968, 98],
    [2656, 122],
  ];
  for (let floor = 1; floor <= 5; floor += 1) {
    const dragon = createEnemy("forest-dragon", { floor });
    assert.equal(dragon.maxHp, expected[floor - 1][0]);
    assert.equal(dragon.attackPower, expected[floor - 1][1]);
    assert.equal(dragon.experienceReward, 550 + (floor - 1) * 20);
    assert.equal(dragon.isBoss, true);
  }
  assert.throws(() => createEnemy("unknown"), RangeError);
});
