import test from "node:test";
import assert from "node:assert/strict";

import {
  ENEMY_ATTACK_WARNING_WINDOW_MS,
  getEnemyAttackWarningState,
} from "./attack-warning.js";

test("通常の敵は攻撃まで3秒を超えている間は予告状態にならない", () => {
  const state = getEnemyAttackWarningState(5900, 9000);
  assert.equal(state.remainingMs, 3100);
  assert.equal(state.isWarning, false);
  assert.equal(state.progress, 5900 / 9000);
});

test("攻撃までちょうど3秒になると予告状態になる", () => {
  const state = getEnemyAttackWarningState(6000, 9000);
  assert.equal(state.remainingMs, ENEMY_ATTACK_WARNING_WINDOW_MS);
  assert.equal(state.isWarning, true);
});

test("ボスの7秒間隔にも同じ予告時間を適用できる", () => {
  const state = getEnemyAttackWarningState(4000, 7000);
  assert.equal(state.remainingMs, 3000);
  assert.equal(state.isWarning, true);
});

test("攻撃直前まで予告し、攻撃時間を過ぎた値は進捗を1に制限する", () => {
  const almost = getEnemyAttackWarningState(8999, 9000);
  const elapsed = getEnemyAttackWarningState(9500, 9000);
  assert.equal(almost.isWarning, true);
  assert.equal(almost.remainingMs, 1);
  assert.equal(elapsed.isWarning, false);
  assert.equal(elapsed.remainingMs, 0);
  assert.equal(elapsed.progress, 1);
});

test("不正な経過時間・攻撃間隔・予告時間を拒否する", () => {
  assert.throws(() => getEnemyAttackWarningState(-1, 9000), RangeError);
  assert.throws(() => getEnemyAttackWarningState(0, 0), RangeError);
  assert.throws(() => getEnemyAttackWarningState(0, 9000, -1), RangeError);
});
