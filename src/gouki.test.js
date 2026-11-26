import test from "node:test";
import assert from "node:assert/strict";
import {
  createInitialGoukiState, isValidGoukiState, normalizeGoukiState,
  getGoukiAbilityMultiplier, gainGouki, setNextGoukiGainMultiplier,
  spendGouki, spendAllGouki,
} from "./gouki.js";

test("轟気は99個を超えても上限なしで蓄積できる", () => {
  const gained = gainGouki({ stacks: 98, nextGainMultiplier: 1 }, 10);
  assert.equal(gained.gained, 10);
  assert.equal(gained.state.stacks, 108);
  assert.equal(getGoukiAbilityMultiplier(99), 1.99);
  assert.equal(getGoukiAbilityMultiplier(200), 3);
});

test("限界突破は次の轟気獲得量だけを倍率強化し、獲得後に解除", () => {
  const ready = setNextGoukiGainMultiplier(createInitialGoukiState(), 2.5);
  const gained = gainGouki(ready, 10);
  assert.equal(gained.gained, 25);
  assert.deepEqual(gained.state, { stacks: 25, nextGainMultiplier: 1 });
});

test("轟気の固定消費・全消費は失敗時に状態を変更しない", () => {
  const insufficient = spendGouki({ stacks: 4, nextGainMultiplier: 1 }, 5);
  assert.equal(insufficient.success, false);
  assert.deepEqual(insufficient.state, { stacks: 4, nextGainMultiplier: 1 });
  const partial = spendGouki({ stacks: 20, nextGainMultiplier: 2 }, 5);
  assert.equal(partial.spent, 5);
  assert.deepEqual(partial.state, { stacks: 15, nextGainMultiplier: 2 });
  const all = spendAllGouki(partial.state);
  assert.equal(all.spent, 15);
  assert.deepEqual(all.state, { stacks: 0, nextGainMultiplier: 2 });
});

test("轟気セーブは不正値を拒否し、古い値を安全に初期化する", () => {
  assert.equal(isValidGoukiState(createInitialGoukiState()), true);
  assert.equal(isValidGoukiState({ stacks: -1, nextGainMultiplier: 1 }), false);
  assert.equal(isValidGoukiState({ stacks: 2.4, nextGainMultiplier: 1 }), false);
  assert.deepEqual(normalizeGoukiState({ stacks: "many" }), createInitialGoukiState());
});
