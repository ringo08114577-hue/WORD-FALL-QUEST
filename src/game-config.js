/**
 * Global gameplay balance. Dungeon-specific encounter and reward values are
 * stored with each dungeon in ./data/dungeons.js.
 */
import { DEFAULT_DUNGEON_ID, DUNGEON_DEFINITIONS } from "./data/dungeons.js";

const defaultReward = DUNGEON_DEFINITIONS[DEFAULT_DUNGEON_ID].reward;

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
  // Compatibility view for existing balance screens/tests. The source of
  // truth is the selected dungeon's reward block, not this derived object.
  dungeon: Object.freeze({
    baseFloorGold: defaultReward.baseGold,
    goldPerFloor: defaultReward.goldPerFloor,
    floorRewardQuantity: defaultReward.itemQuantity,
    oddFloorRewardItemId: defaultReward.oddFloorItemId,
    evenFloorRewardItemId: defaultReward.evenFloorItemId,
  }),
});

export function getDungeonFloorReward(floor, dungeonId = DEFAULT_DUNGEON_ID) {
  if (!Number.isSafeInteger(floor) || floor < 1) {
    throw new TypeError("floorは1以上の整数にしてください。");
  }
  const dungeon = Object.hasOwn(DUNGEON_DEFINITIONS, dungeonId)
    ? DUNGEON_DEFINITIONS[dungeonId]
    : null;
  if (!dungeon) throw new RangeError("登録されていないダンジョンです: " + dungeonId);

  const reward = dungeon.reward;
  return Object.freeze({
    itemId: floor % 2 === 1 ? reward.oddFloorItemId : reward.evenFloorItemId,
    quantity: reward.itemQuantity,
    gold: reward.baseGold + floor * reward.goldPerFloor,
  });
}
