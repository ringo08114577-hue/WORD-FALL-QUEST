import test from "node:test";
import assert from "node:assert/strict";

import {
  EQUIPMENT_SLOTS, ITEM_DEFINITIONS, ITEM_SHOP_PRICES, createInitialInventory,
} from "../items.js";
import { ENEMY_ABILITY_DEFINITIONS, ENEMY_DEFINITIONS } from "../enemies.js";
import { DUNGEON_DEFINITIONS, DEFAULT_DUNGEON_ID } from "./dungeons.js";
import { SKILL_DEFINITIONS } from "./skills.js";
import { WORD_CHALLENGES } from "./words.js";
import { TARGET1400_WORDS } from "./target1400-words.js";
import { getSkillWordDifficultyRange } from "../skills.js";
import { getWordDifficultyLevelFromLength } from "../word-difficulty.js";
import { CRAFTING_RECIPES } from "./crafting-recipes.js";

test("アイテム定義を増やすと初期所持品とショップ価格へ自動で反映される", () => {
  for (const [id, item] of Object.entries(ITEM_DEFINITIONS)) {
    assert.equal(item.id, id);
    assert.equal(typeof item.name, "string");
    if (item.slot !== undefined) assert.ok(EQUIPMENT_SLOTS.includes(item.slot));
    if (item.shopPrice !== undefined) assert.equal(ITEM_SHOP_PRICES[id], item.shopPrice);
    if (item.startingQuantity !== undefined) {
      assert.equal(createInitialInventory().items[id], item.startingQuantity);
    }
  }
  assert.equal(Object.isFrozen(ITEM_DEFINITIONS), true);
});

test("鍛冶屋の全レシピは有効な装備と素材・ゴールドを参照する", () => {
  assert.equal(Object.isFrozen(CRAFTING_RECIPES), true);
  for (const [itemId, recipe] of Object.entries(CRAFTING_RECIPES)) {
    const item = ITEM_DEFINITIONS[itemId];
    assert.ok(item && item.slot, itemId + " output equipment");
    assert.equal(recipe.itemId, itemId);
    assert.ok(Number.isSafeInteger(recipe.gold) && recipe.gold > 0, itemId + " gold");
    assert.ok(Object.isFrozen(recipe.materials), itemId + " frozen materials");
    assert.ok(Object.keys(recipe.materials).length > 0, itemId + " materials");
    for (const [materialId, quantity] of Object.entries(recipe.materials)) {
      assert.equal(ITEM_DEFINITIONS[materialId]?.type, "material", itemId + " -> " + materialId);
      assert.ok(Number.isSafeInteger(quantity) && quantity > 0, itemId + " -> " + materialId);
    }
  }
});

test("敵が参照する能力IDと能力の効果値が有効", () => {
  for (const enemy of Object.values(ENEMY_DEFINITIONS)) {
    assert.equal(typeof enemy.id, "string");
    for (const abilityId of enemy.abilities) {
      assert.ok(Object.hasOwn(ENEMY_ABILITY_DEFINITIONS, abilityId), enemy.id + " -> " + abilityId);
    }
  }
  for (const ability of Object.values(ENEMY_ABILITY_DEFINITIONS)) {
    for (const key of ["counterAttackBonus", "damageReduction", "defensePiercing"]) {
      if (ability[key] !== undefined) {
        assert.ok(Number.isSafeInteger(ability[key]) && ability[key] > 0);
      }
    }
  }
});

test("ダンジョンが参照する敵IDと報酬アイテムIDが存在する", () => {
  assert.ok(Object.hasOwn(DUNGEON_DEFINITIONS, DEFAULT_DUNGEON_ID));
  for (const [id, dungeon] of Object.entries(DUNGEON_DEFINITIONS)) {
    assert.equal(dungeon.id, id);
    assert.equal(dungeon.floorCount, 5);
    assert.equal(dungeon.encounterSets.length, dungeon.floorCount);
    for (const set of dungeon.encounterSets) {
      assert.ok(set.length > 0);
      for (const enemyId of set) {
        assert.ok(Object.hasOwn(ENEMY_DEFINITIONS, enemyId), id + " -> " + enemyId);
      }
    }
    for (const enemyId of dungeon.encounterSets.at(-1)) {
      if (ENEMY_DEFINITIONS[enemyId].isBoss) continue;
      assert.ok(!ENEMY_DEFINITIONS[enemyId].isBoss, id + " final boss");
    }
    assert.ok(dungeon.encounterSets.at(-1).some((enemyId) => ENEMY_DEFINITIONS[enemyId].isBoss));
    assert.ok(dungeon.encounterSets.slice(0, -1).every((set) =>
      set.every((enemyId) => !ENEMY_DEFINITIONS[enemyId].isBoss)));
    assert.ok(Object.hasOwn(ITEM_DEFINITIONS, dungeon.reward.oddFloorItemId));
    assert.ok(Object.hasOwn(ITEM_DEFINITIONS, dungeon.reward.evenFloorItemId));
    assert.ok(Number.isSafeInteger(dungeon.reward.baseGold) && dungeon.reward.baseGold >= 0);
    assert.ok(Number.isSafeInteger(dungeon.reward.goldPerFloor) && dungeon.reward.goldPerFloor >= 0);
    assert.ok(Object.hasOwn(ITEM_DEFINITIONS, dungeon.clearReward.itemId));
    assert.equal(ITEM_DEFINITIONS[dungeon.clearReward.itemId].type, "material");
    assert.ok(Number.isSafeInteger(dungeon.clearReward.quantity) && dungeon.clearReward.quantity > 0);
    assert.ok(Number.isSafeInteger(dungeon.clearReward.gold) && dungeon.clearReward.gold > 0);
  }
});

test("各技の文字数範囲に合う英単語のお題が必ずある", () => {
  for (const skill of Object.values(SKILL_DEFINITIONS)) {
    assert.ok(
      WORD_CHALLENGES.some((challenge) =>
        challenge.word.length >= skill.minWordLength &&
        challenge.word.length <= skill.maxWordLength),
      skill.id,
    );
  }
});

test("全スキル・全レベルに文字数と難易度が合う単語候補がある", () => {
  for (const [skillId, skill] of Object.entries(SKILL_DEFINITIONS)) {
    if (skill.passive) continue;
    for (let level = 1; level <= skill.maxLevel; level += 1) {
      const range = getSkillWordDifficultyRange(skillId, level);
      assert.ok(
        WORD_CHALLENGES.some((challenge) =>
          challenge.word.length >= skill.minWordLength &&
          challenge.word.length <= skill.maxWordLength &&
          challenge.difficulty >= range.min &&
          challenge.difficulty <= range.max),
        skillId + " Lv." + level,
      );
    }
  }
});
test("轟剣士と再生騎士の専用技は所属キャラクターに正しく登録される", () => {
  const gouSkills = Object.values(SKILL_DEFINITIONS).filter((skill) => skill.characterId === "gou-swordsman");
  assert.ok(gouSkills.length >= 15);
  assert.ok(gouSkills.some((skill) => skill.effect?.type === "gouki-charge"));
  assert.ok(gouSkills.some((skill) => skill.effect?.type === "gouki-consume-all"));
  assert.ok(gouSkills.some((skill) => skill.passive));
  assert.equal(SKILL_DEFINITIONS["regen-drain-slash"].characterId, "regen-knight");
  assert.equal(SKILL_DEFINITIONS["regen-life-breaker"].characterId, "regen-knight");
  assert.equal(SKILL_DEFINITIONS["regen-eternal-vessel"].passive, true);
  assert.equal(SKILL_DEFINITIONS["shadow-basic"].characterId, "shadow-blade");
  assert.equal(SKILL_DEFINITIONS["elemental-basic"].characterId, "elemental-mage");
  for (const [skillId, skill] of Object.entries(SKILL_DEFINITIONS)) {
    if (skill.passive) continue;
    assert.deepEqual(getSkillWordDifficultyRange(skillId), {
      min: getWordDifficultyLevelFromLength(skill.minWordLength ?? 3),
      max: getWordDifficultyLevelFromLength(skill.maxWordLength ?? 4),
    });
  }
});
test("ターゲット1400の全番号・英単語・日本語訳がゲーム内に登録されている", () => {
  assert.deepEqual(TARGET1400_WORDS.map((entry) => entry.targetNumber),
    Array.from({ length: 1400 }, (_, index) => index + 1));
  assert.equal(new Set(TARGET1400_WORDS.map((entry) => entry.word)).size, 1400);
  for (const sourceEntry of TARGET1400_WORDS) {
    const gameEntry = WORD_CHALLENGES.find((entry) => entry.word === sourceEntry.word);
    assert.ok(gameEntry, sourceEntry.targetNumber + " " + sourceEntry.word);
    assert.equal(gameEntry.japanese, sourceEntry.japanese, sourceEntry.word);
    assert.equal(gameEntry.targetNumber, sourceEntry.targetNumber, sourceEntry.word);
    assert.equal(gameEntry.difficulty, sourceEntry.difficulty, sourceEntry.word);
  }
});

test("コンテンツ定義は変更できない", () => {
  assert.equal(Object.isFrozen(ENEMY_ABILITY_DEFINITIONS), true);
  assert.equal(Object.isFrozen(ENEMY_DEFINITIONS), true);
  assert.equal(Object.isFrozen(SKILL_DEFINITIONS), true);
  assert.equal(Object.isFrozen(WORD_CHALLENGES), true);
  assert.equal(Object.isFrozen(DUNGEON_DEFINITIONS[DEFAULT_DUNGEON_ID].encounterSets), true);
});

test("単語データはID・英単語の重複がなく、文字数に応じた難易度1〜5を正しく保持する", () => {
  const ids = WORD_CHALLENGES.map((challenge) => challenge.id);
  const words = WORD_CHALLENGES.map((challenge) => challenge.word);
  assert.equal(WORD_CHALLENGES.length, 1516);
  assert.equal(TARGET1400_WORDS.length, 1400);
  assert.equal(new Set(ids).size, ids.length);
  assert.equal(new Set(words).size, words.length);
  for (const challenge of WORD_CHALLENGES) {
    assert.match(challenge.word, /^[A-Z]{3,14}$/);
    assert.ok(challenge.japanese.length > 0);
    assert.ok(Number.isInteger(challenge.difficulty) && challenge.difficulty >= 1 && challenge.difficulty <= 5);
    assert.ok(["noun", "verb", "adjective", "adverb", "preposition", "conjunction", "unknown"].includes(challenge.partOfSpeech));
  }
  assert.deepEqual(
    Object.fromEntries([1, 2, 3, 4, 5].map((difficulty) => [
      difficulty, WORD_CHALLENGES.filter((challenge) => challenge.difficulty === difficulty).length,
    ])),
    { 1: 246, 2: 554, 3: 299, 4: 181, 5: 236 },
  );
});
