/**
 * WORD FALL QUEST - Central gameplay balance configuration.
 *
 * Keep tunable gameplay numbers here so future classes, dungeons, and
 * progression systems can share one predictable source of truth.
 */
export const GAME_CONFIG = Object.freeze({
  player: Object.freeze({
    startingMaxHp: 3,
    startingAttackPower: 1,
  }),
  progression: Object.freeze({
    experiencePerLevel: 10,
  }),
  enemyScaling: Object.freeze({
    hpPerFloor: 1,
    attackPowerEveryFloors: 3,
    attackPowerPerStep: 1,
    experiencePerFloor: 2,
  }),
  dungeon: Object.freeze({
    baseFloorGold: 10,
    goldPerFloor: 5,
    floorRewardQuantity: 1,
    oddFloorRewardItemId: "small-potion",
    evenFloorRewardItemId: "large-potion",
  }),
});

/**
 * Build the standard reward for a cleared floor.
 * Keeping this calculation pure makes reward balancing easy to test.
 */
export function getDungeonFloorReward(floor) {
  if (!Number.isSafeInteger(floor) || floor < 1) {
    throw new TypeError("floorは1以上の整数にしてください。");
  }

  return Object.freeze({
    itemId: floor % 2 === 1
      ? GAME_CONFIG.dungeon.oddFloorRewardItemId
      : GAME_CONFIG.dungeon.evenFloorRewardItemId,
    quantity: GAME_CONFIG.dungeon.floorRewardQuantity,
    gold: GAME_CONFIG.dungeon.baseFloorGold +
      floor * GAME_CONFIG.dungeon.goldPerFloor,
  });
}
