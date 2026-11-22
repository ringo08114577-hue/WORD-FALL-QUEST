import test from "node:test";
import assert from "node:assert/strict";
import { getBlacksmithAdvice } from "./blacksmith-advisor.js";

function emptyContext(overrides = {}) {
  return {
    phase: "title",
    inventory: {
      gold: 0,
      items: {},
      equipment: {},
      ...(overrides.inventory ?? {}),
    },
  };
}

test("素材がないときは最初に作れる強化装備と必要素材の入手情報を案内する", () => {
  const advice = getBlacksmithAdvice(emptyContext());
  assert.equal(advice.status, "gather");
  assert.equal(advice.itemName, "スライムバックラー");
  assert.match(advice.greeting, /スライムバックラー/);
  assert.match(advice.detail, /グリーンスライムのゼリー ×5/);
  assert.match(advice.detail, /グリーンスライムから手に入る/);
  assert.match(advice.meta, /35G/);
});

test("素材とゴールドがそろった装備を作成可能としてすすめる", () => {
  const advice = getBlacksmithAdvice(emptyContext({
    inventory: { gold: 50, items: { "slime-gel": 5 }, equipment: {} },
  }));
  assert.equal(advice.status, "ready");
  assert.equal(advice.itemName, "スライムバックラー");
  assert.match(advice.detail, /防御力 \+16/);
  assert.match(advice.meta, /作成可能/);
});

test("素材がそろっていてもゴールド不足なら作成可能と表示しない", () => {
  const advice = getBlacksmithAdvice(emptyContext({
    inventory: { gold: 20, items: { "slime-gel": 5 }, equipment: {} },
  }));
  assert.equal(advice.status, "gather");
  assert.match(advice.detail, /素材はそろった/);
  assert.match(advice.detail, /あと 15G/);
});

test("すでに所持している同じ装備を重複してすすめない", () => {
  const advice = getBlacksmithAdvice(emptyContext({
    inventory: {
      gold: 0,
      items: { "slime-buckler": 1 },
      equipment: {},
    },
  }));
  assert.notEqual(advice.itemName, "スライムバックラー");
});

test("街以外では鍛冶をすすめず、装備の作成も行わない", () => {
  const advice = getBlacksmithAdvice({
    phase: "battle",
    inventory: { gold: 1000, items: { "slime-gel": 5 }, equipment: {} },
  });
  assert.equal(advice.status, "unavailable");
  assert.match(advice.greeting, /街に戻って/);
});
