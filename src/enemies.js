/**
 * Enemy domain logic. The dungeon catalog selects the ordered enemies for each floor.
 */
import { GAME_CONFIG } from "./game-config.js";
import { ENEMY_ABILITY_DEFINITIONS, ENEMY_DEFINITIONS } from "./data/enemies.js";
import { DEFAULT_DUNGEON_ID, DUNGEON_DEFINITIONS } from "./data/dungeons.js";

export { ENEMY_ABILITY_DEFINITIONS, ENEMY_DEFINITIONS };

export function getLegacyFloorEnemyIds(dungeonId = DEFAULT_DUNGEON_ID) {
  const dungeon = Object.hasOwn(DUNGEON_DEFINITIONS, dungeonId)
    ? DUNGEON_DEFINITIONS[dungeonId]
    : null;
  if (!dungeon?.legacyEncounterSet) {
    throw new RangeError("旧セーブに対応していないダンジョンです: " + dungeonId);
  }
  return [...dungeon.legacyEncounterSet];
}

export function getFloorEnemyIds(floor, dungeonId = DEFAULT_DUNGEON_ID) {
  if (!Number.isSafeInteger(floor) || floor < 1) {
    throw new TypeError("floorは1以上の整数にしてください。");
  }
  const dungeon = Object.hasOwn(DUNGEON_DEFINITIONS, dungeonId)
    ? DUNGEON_DEFINITIONS[dungeonId]
    : null;
  if (!dungeon) throw new RangeError("登録されていないダンジョンです: " + dungeonId);
  const sets = dungeon.encounterSets;
  if (!Array.isArray(sets) || sets.length === 0) {
    throw new Error("ダンジョンに敵編成が登録されていません: " + dungeonId);
  }
  if (floor > (dungeon.floorCount ?? sets.length) || !sets[floor - 1]) {
    throw new RangeError("このダンジョンにその階層はありません: " + dungeonId + " / " + floor);
  }
  return [...sets[floor - 1]];
}

export function getEnemyAbilityEffects(enemy) {
  const effects = { counterAttackBonus: 0, damageReduction: 0, defensePiercing: 0 };
  for (const abilityId of (Array.isArray(enemy?.abilities) ? enemy.abilities : [])) {
    const ability = Object.hasOwn(ENEMY_ABILITY_DEFINITIONS, abilityId)
      ? ENEMY_ABILITY_DEFINITIONS[abilityId]
      : null;
    if (!ability) continue;
    effects.counterAttackBonus += ability.counterAttackBonus ?? 0;
    effects.damageReduction += ability.damageReduction ?? 0;
    effects.defensePiercing += ability.defensePiercing ?? 0;
  }
  return effects;
}

export function createEnemy(enemyId, { floor = 1 } = {}) {
  const definition = Object.hasOwn(ENEMY_DEFINITIONS, enemyId)
    ? ENEMY_DEFINITIONS[enemyId]
    : null;
  if (!definition) throw new RangeError("登録されていない敵です: " + enemyId);
  if (!Number.isSafeInteger(floor) || floor < 1) {
    throw new TypeError("floorは1以上の整数にしてください。");
  }
  const difficulty = floor - 1;
  return {
    ...definition,
    abilities: [...definition.abilities],
    isBoss: definition.isBoss === true,
    maxHp: definition.maxHp + difficulty * GAME_CONFIG.enemyScaling.hpPerFloor,
    attackPower: definition.attackPower +
      Math.floor(difficulty / GAME_CONFIG.enemyScaling.attackPowerEveryFloors) *
      GAME_CONFIG.enemyScaling.attackPowerPerStep,
    experienceReward: definition.experienceReward +
      difficulty * GAME_CONFIG.enemyScaling.experiencePerFloor,
  };
}
