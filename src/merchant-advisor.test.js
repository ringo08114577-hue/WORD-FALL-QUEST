import test from "node:test";
import assert from "node:assert/strict";
import { getMerchantAdvice } from "./merchant-advisor.js";

const context = (overrides = {}) => ({
  phase: "title",
  player: { hp: 100, maxHp: 100 },
  inventory: {
    gold: 100,
    items: { "small-potion": 2, "large-potion": 1 },
    equipment: { weapon: "wooden-sword", shield: null, armor: null, accessory: null },
    ...(overrides.inventory ?? {}),
  },
  ...(overrides.player ? { player: overrides.player } : {}),
});

test("回復薬がなくなったら回復薬をおすすめする", () => {
  const advice = getMerchantAdvice(context({
    inventory: { gold: 40, items: { "small-potion": 0, "large-potion": 0 } },
  }));
  assert.equal(advice.status, "recovery");
  assert.equal(advice.itemName, "回復薬");
  assert.match(advice.greeting, /回復薬が切れている/);
  assert.match(advice.meta, /15G/);
});

test("HPが少なく大きな回復薬もないときは大きな回復薬をすすめる", () => {
  const advice = getMerchantAdvice(context({
    player: { hp: 20, maxHp: 100 },
    inventory: { gold: 10, items: { "small-potion": 0, "large-potion": 0 } },
  }));
  assert.equal(advice.status, "short-gold");
  assert.equal(advice.itemName, "大きな回復薬");
  assert.match(advice.detail, /あと20G/);
});

test("現在の装備より強く、購入可能な装備を紹介する", () => {
  const advice = getMerchantAdvice(context({
    inventory: {
      gold: 100,
      items: { "small-potion": 2, "large-potion": 1, "iron-sword": 0 },
      equipment: { weapon: "wooden-sword", shield: null, armor: null, accessory: null },
    },
  }));
  assert.equal(advice.status, "equipment");
  assert.equal(advice.itemName, "革の鎧");
  assert.match(advice.detail, /防御力が15、最大HPが120上がる/);
});

test("売却可能な素材を所持している場合は売値合計とアイテム欄への案内を表示する", () => {
  const advice = getMerchantAdvice(context({
    inventory: {
      gold: 100,
      items: { "small-potion": 2, "large-potion": 1, "slime-gel": 3, "bat-silk": 2 },
    },
  }));
  assert.equal(advice.hasSellableMaterials, true);
  assert.equal(advice.totalSellValue, 48);
  assert.match(advice.sellableSummary, /スライムゼリー ×3（12G）/);
  assert.match(advice.sellableSummary, /コウモリの薄布 ×2（36G）/);
  assert.equal(advice.actionHref, "#facilityContent");
});

test("ゴールド不足の装備を次の候補として表示しない", () => {
  const advice = getMerchantAdvice(context({
    inventory: {
      gold: 0,
      items: { "small-potion": 2, "large-potion": 1 },
      equipment: { weapon: "wooden-sword", shield: null, armor: null, accessory: null },
    },
  }));
  assert.equal(advice.status, "ready");
  assert.equal(advice.itemName, "冒険の準備は万全");
  assert.notEqual(advice.label, "次の装備候補");
});

test("購入できる装備がない場合は素材売却か通常案内に切り替わる", () => {
  const advice = getMerchantAdvice(context({
    inventory: {
      gold: 0,
      items: { "small-potion": 2, "large-potion": 1, "iron-sword": 1, "wooden-shield": 1, "leather-armor": 1, "copper-charm": 1 },
      equipment: { weapon: "iron-sword", shield: "wooden-shield", armor: "leather-armor", accessory: "copper-charm" },
    },
  }));
  assert.equal(advice.status, "ready");
  assert.equal(advice.itemName, "冒険の準備は万全");
});

test("案内の生成ではゴールドや素材・アイテムの所持数を変更しない", () => {
  const original = context({
    inventory: { items: { "small-potion": 0, "large-potion": 0, "slime-gel": 4 } },
  });
  const snapshot = structuredClone(original);
  getMerchantAdvice(original);
  assert.deepEqual(original, snapshot);
});
