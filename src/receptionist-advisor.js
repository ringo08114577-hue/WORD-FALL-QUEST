import { DUNGEON_DEFINITIONS } from "./data/dungeons.js";

const FOREST_ID = "forest-ruins";
const FROZEN_ID = "frozen-cavern";

function safeProgress(progress, id, definition) {
  const entry = progress && typeof progress === "object" ? progress[id] : null;
  const unlockedFloor = Number.isSafeInteger(entry?.unlockedFloor)
    ? Math.max(1, Math.min(definition.floorCount, entry.unlockedFloor))
    : 1;
  return {
    unlockedFloor,
    cleared: entry?.cleared === true,
  };
}

/**
 * Build a receptionist recommendation from the current player and dungeon save.
 * This is presentation-only: it never changes progression or selects a dungeon.
 */
export function getReceptionistAdvice(context = {}) {
  const player = context?.player ?? {};
  const level = Number.isSafeInteger(player.level) && player.level > 0 ? player.level : 1;
  const hp = Number.isFinite(player.hp) && player.hp >= 0 ? player.hp : null;
  const maxHp = Number.isFinite(player.maxHp) && player.maxHp > 0 ? player.maxHp : null;
  const hpIsLow = hp !== null && maxHp !== null && hp / maxHp <= 0.4;

  const forest = DUNGEON_DEFINITIONS[FOREST_ID];
  const frozen = DUNGEON_DEFINITIONS[FROZEN_ID];
  const progress = context?.dungeonProgress ?? {};
  const forestProgress = safeProgress(progress, FOREST_ID, forest);
  const frozenProgress = safeProgress(progress, FROZEN_ID, frozen);

  const recommendFrozen = level >= frozen.recommendedLevel && forestProgress.cleared;
  const targetId = recommendFrozen ? FROZEN_ID : FOREST_ID;
  const target = recommendFrozen ? frozen : forest;
  const targetProgress = recommendFrozen ? frozenProgress : forestProgress;

  let greeting;
  if (hpIsLow) {
    greeting = "HPが少なくなっています。出発前に回復アイテムや装備を確認しましょう。";
  } else if (level < frozen.recommendedLevel) {
    greeting = "今は「はじまりの森」で経験を積むのがおすすめです。LV.3を目指しましょう！";
  } else if (!forestProgress.cleared) {
    greeting = "レベルが上がってきましたね！まずは「はじまりの森」の制覇を目指しましょう。";
  } else if (!frozenProgress.cleared) {
    greeting = "次の目標は「氷結の洞窟」です。準備ができたら挑戦してみましょう！";
  } else {
    greeting = "二つのダンジョンを制覇しましたね！次は高階層で素材集めに挑戦しましょう。";
  }

  let detail;
  if (targetId === FOREST_ID && level < frozen.recommendedLevel) {
    detail = "まずは森で経験を積み、LV.3を目指しましょう。";
  } else if (targetId === FOREST_ID && !forestProgress.cleared) {
    detail = "最深部のボス撃破を目指しましょう。初回制覇報酬もありますよ。";
  } else if (targetId === FROZEN_ID && !frozenProgress.cleared) {
    detail = "推奨LV.3。氷狼たちが待つ、新しいダンジョンに挑戦しましょう。";
  } else {
    detail = "制覇済みのダンジョンです。高階層を周回して素材や報酬を集めましょう。";
  }

  if (hpIsLow) {
    const hpPercent = Math.round((hp / maxHp) * 100);
    detail = "現在のHPは約" + hpPercent + "%です。回復や装備の確認をしてから出発しましょう。";
  }

  return {
    greeting,
    dungeonId: targetId,
    dungeonName: target.name,
    dungeonIcon: target.icon,
    detail,
    meta: "推奨 LV." + target.recommendedLevel + " · " +
      targetProgress.unlockedFloor + "/" + target.floorCount + "階まで解放",
  };
}
