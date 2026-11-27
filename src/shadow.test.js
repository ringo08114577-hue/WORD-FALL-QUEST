import test from "node:test";
import assert from "node:assert/strict";
import {
  SHADOW_BASE_CRITICAL_RATE,
  SHADOW_MAX_CRITICAL_RATE,
  SHADOW_MAX_STREAK,
  createInitialShadowState,
  isValidShadowState,
  normalizeShadowState,
  getShadowCriticalRate,
  getShadowHeavyRate,
  registerShadowMistake,
  registerShadowWordComplete,
  setShadowNextAttackBonus,
  consumeShadowNextAttackBonus,
} from "./shadow.js";

test("影刃の会心率は5%から始まり、正解した単語ごとに5%ずつ上がる", () => {
  let state = createInitialShadowState();
  assert.equal(getShadowCriticalRate(state), SHADOW_BASE_CRITICAL_RATE);
  for (let index = 1; index <= 5; index += 1) {
    state = registerShadowWordComplete(state);
    assert.equal(getShadowCriticalRate(state), 5 + index * 5);
  }
});

test("会心率は60%で上限になり、それ以上正解しても増えない", () => {
  let state = createInitialShadowState();
  for (let index = 0; index < SHADOW_MAX_STREAK + 5; index += 1) {
    state = registerShadowWordComplete(state);
  }
  assert.equal(getShadowCriticalRate(state), SHADOW_MAX_CRITICAL_RATE);
  assert.equal(state.consecutiveCorrectWords, SHADOW_MAX_STREAK);
});

test("問題の途中でミスすると会心率が5%に戻り、その問題は連続正解に数えない", () => {
  let state = createInitialShadowState();
  state = registerShadowWordComplete(registerShadowWordComplete(state));
  assert.equal(getShadowCriticalRate(state), 15);
  state = registerShadowMistake(state);
  assert.equal(getShadowCriticalRate(state), 5);
  assert.equal(state.mistakeInCurrentWord, true);
  state = registerShadowWordComplete(state);
  assert.equal(getShadowCriticalRate(state), 5);
  assert.equal(state.mistakeInCurrentWord, false);
  state = registerShadowWordComplete(state);
  assert.equal(getShadowCriticalRate(state), 10);
});

test("会心率が高いほど、会心後に抽選する重撃率も上がる", () => {
  assert.equal(getShadowHeavyRate(5, 0.1), 0.1);
  assert.equal(getShadowHeavyRate(20, 0.1), 0.13);
  assert.equal(getShadowHeavyRate(35, 0.1), 0.16);
  assert.equal(getShadowHeavyRate(60, 0.1), 0.21);
});

test("スキルごとの基本重撃率とパッシブ補正を加算する", () => {
  assert.equal(getShadowHeavyRate(60, 0.2, 0.05), 0.36);
  assert.equal(getShadowHeavyRate(60, 0.9, 0.5), 0.95);
});

test("会心の構えのボーナスは次の攻撃で消費できる", () => {
  let state = setShadowNextAttackBonus(createInitialShadowState(), 15);
  assert.equal(state.nextAttackCriticalBonus, 15);
  state = consumeShadowNextAttackBonus(state);
  assert.equal(state.nextAttackCriticalBonus, 0);
});

test("不正なセーブデータは初期状態へ戻す", () => {
  assert.equal(isValidShadowState(createInitialShadowState()), true);
  assert.equal(isValidShadowState({ consecutiveCorrectWords: 99 }), false);
  assert.deepEqual(normalizeShadowState({ consecutiveCorrectWords: -1 }), createInitialShadowState());
});
