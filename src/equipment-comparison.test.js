import test from "node:test";
import assert from "node:assert/strict";
import { compareEquipment } from "./equipment-comparison.js";

test("同じ枠の武器を比較して能力値の差を計算する", () => {
  const result = compareEquipment(
    { slot: "weapon", name: "鉄の剣", attackBonus: 20 },
    { slot: "weapon", name: "木の剣", attackBonus: 10 },
  );
  assert.equal(result.currentItemName, "木の剣");
  assert.equal(result.hasChanges, true);
  assert.deepEqual(result.stats.map(({ label, difference }) => [label, difference]), [
    ["攻撃力", 10], ["防御力", 0], ["最大HP", 0],
  ]);
});

test("現在より弱い装備はマイナスの差になる", () => {
  const result = compareEquipment(
    { slot: "armor", name: "革の鎧", defenseBonus: 15, maxHpBonus: 100 },
    { slot: "armor", name: "氷竜の鎧", defenseBonus: 65, maxHpBonus: 300 },
  );
  assert.deepEqual(result.stats.map(({ difference }) => difference), [0, -50, -200]);
  assert.equal(result.hasChanges, true);
});

test("未装備の枠は能力補正ゼロから比較する", () => {
  const result = compareEquipment(
    { slot: "shield", name: "木の盾", defenseBonus: 10 },
    null,
  );
  assert.equal(result.currentItemName, null);
  assert.deepEqual(result.stats.map(({ difference }) => difference), [0, 10, 0]);
});

test("能力値が同じなら変化なしと判定する", () => {
  const result = compareEquipment(
    { slot: "accessory", name: "新しいお守り", attackBonus: 10, defenseBonus: 5 },
    { slot: "accessory", name: "古いお守り", attackBonus: 10, defenseBonus: 5 },
  );
  assert.equal(result.hasChanges, false);
  assert.deepEqual(result.stats.map(({ difference }) => difference), [0, 0, 0]);
});

test("別の装備枠のアイテムとは比較せず未装備扱いにする", () => {
  const result = compareEquipment(
    { slot: "weapon", name: "剣", attackBonus: 12 },
    { slot: "shield", name: "盾", defenseBonus: 30 },
  );
  assert.equal(result.currentItemName, null);
  assert.deepEqual(result.stats.map(({ difference }) => difference), [12, 0, 0]);
});

test("装備品でない値は比較対象にしない", () => {
  assert.equal(compareEquipment(null, null), null);
  assert.equal(compareEquipment({ type: "material" }, null), null);
});
