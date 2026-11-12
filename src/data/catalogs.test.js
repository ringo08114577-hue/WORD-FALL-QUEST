import test from "node:test";
import assert from "node:assert/strict";

import {
  EQUIPMENT_SLOTS, ITEM_DEFINITIONS, ITEM_SHOP_PRICES, createInitialInventory,
} from "../items.js";
import { ENEMY_ABILITY_DEFINITIONS, ENEMY_DEFINITIONS } from "../enemies.js";
import { DUNGEON_DEFINITIONS, DEFAULT_DUNGEON_ID } from "./dungeons.js";
import { SKILL_DEFINITIONS } from "./skills.js";
import { WORD_CHALLENGES } from "./words.js";
import { getSkillLevelDifficultyRange } from "../word-difficulty.js";

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
    for (let level = 1; level <= skill.maxLevel; level += 1) {
      const range = getSkillLevelDifficultyRange(level);
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

test("コンテンツ定義は変更できない", () => {
  assert.equal(Object.isFrozen(ENEMY_ABILITY_DEFINITIONS), true);
  assert.equal(Object.isFrozen(ENEMY_DEFINITIONS), true);
  assert.equal(Object.isFrozen(SKILL_DEFINITIONS), true);
  assert.equal(Object.isFrozen(WORD_CHALLENGES), true);
  assert.equal(Object.isFrozen(DUNGEON_DEFINITIONS[DEFAULT_DUNGEON_ID].encounterSets), true);
});
