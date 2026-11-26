import test from "node:test";
import assert from "node:assert/strict";
import { createGameStore, GAME_ACTION } from "./game-state.js";
import { createCombatController } from "./combat.js";

function prepareStore({ playerAttackPower = 100, playerMaxHp = 1000, itemId = null, enemy }) {
  const store = createGameStore({ playerAttackPower, playerMaxHp });
  if (itemId) {
    store.dispatch({ type: GAME_ACTION.ADD_ITEM, itemId, quantity: 1 });
    store.dispatch({ type: GAME_ACTION.PREPARE_EQUIPMENT, itemId });
  }
  store.dispatch({ type: GAME_ACTION.START_BATTLE, enemy });
  return store;
}

test("属性武器は属性を付与し、装備固有の強化と敵の弱点倍率を適用する", () => {
  const store = prepareStore({
    itemId: "forest-dragon-sword",
    enemy: { id: "test-weak", name: "属性テスト敵", maxHp: 1000,
      attackPower: 1, elementalWeakness: "wind" },
  });
  const result = createCombatController(store).handle({
    eventId: "elemental-weapon-test", type: "word-complete", skillId: "gou-slash",
  });
  assert.equal(result.damage, 251);
  assert.match(result.message, /風属性・弱点/);
});

test("属性耐性のある防具は対応属性の反撃ダメージを軽減する", () => {
  const store = prepareStore({
    playerAttackPower: 1, itemId: "moss-guardian-armor",
    enemy: { id: "test-earth", name: "土属性テスト敵", maxHp: 100,
      attackPower: 100, attackElement: "earth" },
  });
  const result = createCombatController(store).handle({
    eventId: "elemental-armor-test", type: "wrong", letter: "X",
  });
  assert.equal(result.damage, 56);
  assert.match(result.message, /土属性攻撃・耐性/);
});

test("氷竜の鎧は水属性を軽減し、炎属性に弱い", () => {
  const waterStore = prepareStore({
    playerAttackPower: 1, itemId: "ice-dragon-armor",
    enemy: { id: "test-water", name: "水属性テスト敵", maxHp: 100,
      attackPower: 100, attackElement: "water" },
  });
  const waterHit = createCombatController(waterStore).handle({
    eventId: "ice-armor-water-test", type: "wrong", letter: "X",
  });
  assert.equal(waterHit.damage, 28);

  const fireStore = prepareStore({
    playerAttackPower: 1, itemId: "ice-dragon-armor",
    enemy: { id: "test-fire", name: "炎属性テスト敵", maxHp: 100,
      attackPower: 100, attackElement: "fire" },
  });
  const fireHit = createCombatController(fireStore).handle({
    eventId: "ice-armor-fire-test", type: "wrong", letter: "X",
  });
  assert.equal(fireHit.damage, 39);
  assert.match(fireHit.message, /炎属性攻撃・弱点/);
});
