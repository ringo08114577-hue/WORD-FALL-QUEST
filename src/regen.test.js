import test from "node:test";
import assert from "node:assert/strict";
import {
  createInitialRegenState, isValidRegenState, normalizeRegenState,
  getRegenOverHpCap, getRegenDrainRatio, gainRegenOverHp, absorbRegenOverHp,
} from "./regen.js";

test("再生騎士のオーバーHPは0で始まり、安全な整数だけを保存する", () => {
  assert.deepEqual(createInitialRegenState(), { overHp: 0 });
  assert.equal(isValidRegenState({ overHp: 25 }), true);
  assert.equal(isValidRegenState({ overHp: -1 }), false);
  assert.equal(isValidRegenState({ overHp: 1.5 }), false);
  assert.deepEqual(normalizeRegenState({ overHp: 12 }), { overHp: 12 });
  assert.deepEqual(normalizeRegenState({ overHp: "12" }), { overHp: 0 });
});

test("不滅の器はオーバーHP上限を最大HPの1.15倍から最大1.5倍まで広げる", () => {
  const state = {
    player: { maxHp: 100 },
    equippedSkillIds: ["regen-eternal-vessel"],
    skillLevels: { "regen-eternal-vessel": 1 },
    evolvedSkillIds: [],
  };
  assert.equal(getRegenOverHpCap(state), 115);
  assert.equal(getRegenOverHpCap({
    ...state,
    skillLevels: { "regen-eternal-vessel": 5 },
  }), 150);
  assert.equal(getRegenOverHpCap({ player: { maxHp: 100 }, equippedSkillIds: [] }), 100);
});

test("吸命の極意はドレイン率を追加で高める", () => {
  const state = {
    equippedSkillIds: ["regen-vampiric-will"],
    skillLevels: { "regen-vampiric-will": 1 },
    evolvedSkillIds: [],
  };
  assert.equal(getRegenDrainRatio(state, 0.6), 0.65);
  assert.equal(getRegenDrainRatio({
    ...state,
    skillLevels: { "regen-vampiric-will": 5 },
  }, 0.95), 1.11);
  assert.equal(getRegenDrainRatio(state, 1.2), 1.25);
});

test("ドレインのあふれた回復分だけオーバーHPになり、上限以上には増えない", () => {
  assert.deepEqual(gainRegenOverHp({ overHp: 90 }, 25, 100), {
    state: { overHp: 100 }, gained: 10,
  });
  assert.deepEqual(gainRegenOverHp({ overHp: 100 }, 25, 100), {
    state: { overHp: 100 }, gained: 0,
  });
});

test("敵の攻撃はオーバーHPから先に吸収する", () => {
  assert.deepEqual(absorbRegenOverHp({ overHp: 15 }, 20), {
    state: { overHp: 0 }, absorbed: 15, remainingDamage: 5,
  });
  assert.deepEqual(absorbRegenOverHp({ overHp: 30 }, 10), {
    state: { overHp: 20 }, absorbed: 10, remainingDamage: 0,
  });
});
