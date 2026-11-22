import test from "node:test";
import assert from "node:assert/strict";
import { getReceptionistAdvice } from "./receptionist-advisor.js";

const emptyProgress = {
  "forest-ruins": { unlockedFloor: 1, cleared: false },
  "frozen-cavern": { unlockedFloor: 1, cleared: false },
};

test("レベル1では推奨レベルに合ったはじまりの森を案内する", () => {
  const advice = getReceptionistAdvice({
    player: { level: 1, hp: 100, maxHp: 100 },
    dungeonProgress: emptyProgress,
  });
  assert.equal(advice.dungeonId, "forest-ruins");
  assert.match(advice.greeting, /LV\.3/);
  assert.match(advice.meta, /推奨 LV\.1/);
});

test("森を制覇してレベル3以上なら氷結の洞窟をすすめる", () => {
  const advice = getReceptionistAdvice({
    player: { level: 3, hp: 100, maxHp: 120 },
    dungeonProgress: {
      "forest-ruins": { unlockedFloor: 5, cleared: true },
      "frozen-cavern": { unlockedFloor: 2, cleared: false },
    },
  });
  assert.equal(advice.dungeonId, "frozen-cavern");
  assert.match(advice.greeting, /氷結の洞窟/);
  assert.match(advice.detail, /推奨LV\.3/);
  assert.match(advice.meta, /2\/5階/);
});

test("HPが40パーセント以下なら出発前の回復をすすめる", () => {
  const advice = getReceptionistAdvice({
    player: { level: 5, hp: 35, maxHp: 100 },
    dungeonProgress: {
      "forest-ruins": { unlockedFloor: 5, cleared: true },
      "frozen-cavern": { unlockedFloor: 1, cleared: false },
    },
  });
  assert.match(advice.greeting, /HPが少なくなっています/);
  assert.match(advice.detail, /35%/);
});

test("両ダンジョン制覇後は氷結の洞窟の周回を案内する", () => {
  const advice = getReceptionistAdvice({
    player: { level: 8, hp: 100, maxHp: 150 },
    dungeonProgress: {
      "forest-ruins": { unlockedFloor: 5, cleared: true },
      "frozen-cavern": { unlockedFloor: 5, cleared: true },
    },
  });
  assert.equal(advice.dungeonId, "frozen-cavern");
  assert.match(advice.greeting, /素材集め/);
  assert.match(advice.detail, /周回/);
});
