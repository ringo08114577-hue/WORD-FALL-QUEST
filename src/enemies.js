/**
 * Enemy domain logic. Character data and encounter selection are separate.
 */
import { GAME_CONFIG } from "./game-config.js";
import { ENEMY_ABILITY_DEFINITIONS, ENEMY_DEFINITIONS } from "./data/enemies.js";
import { getCharacterImagePath } from "./character-images.js";
import { DEFAULT_DUNGEON_ID, DUNGEON_DEFINITIONS } from "./data/dungeons.js";

export { ENEMY_ABILITY_DEFINITIONS, ENEMY_DEFINITIONS };

export function getEnemyImagePath(enemy) {
  if (!enemy || typeof enemy !== "object" || Array.isArray(enemy)) return null;
  return getCharacterImagePath(enemy.id);
}

function getDungeon(dungeonId) {
  return Object.hasOwn(DUNGEON_DEFINITIONS, dungeonId)
    ? DUNGEON_DEFINITIONS[dungeonId]
    : null;
}

function validateFloor(floor) {
  if (!Number.isSafeInteger(floor) || floor < 1) {
    throw new TypeError("floorは1以上の整数にしてください。");
  }
}

function isEligible(definition, type, floor, dungeonId) {
  const rule = definition?.encounter;
  if (!rule || rule.type !== type || !rule.dungeonIds?.includes(dungeonId)) return false;
  if (type === "normal") {
    return Number.isSafeInteger(rule.minFloor) && Number.isSafeInteger(rule.maxFloor) &&
      floor >= rule.minFloor && floor <= rule.maxFloor &&
      Number.isFinite(rule.weight) && rule.weight > 0;
  }
  const matchesFloor = Array.isArray(rule.floors)
    ? rule.floors.includes(floor)
    : Number.isSafeInteger(rule.minFloor) && floor >= rule.minFloor &&
      (rule.maxFloor === undefined || (Number.isSafeInteger(rule.maxFloor) && floor <= rule.maxFloor));
  return matchesFloor && Number.isFinite(rule.weight ?? 1) && (rule.weight ?? 1) > 0;
}

function randomValue(random) {
  const value = random();
  if (!Number.isFinite(value) || value < 0 || value >= 1) {
    throw new RangeError("乱数関数は0以上1未満の数値を返してください。");
  }
  return value;
}

function chooseWeighted(entries, random) {
  if (entries.length === 0) return null;
  const totalWeight = entries.reduce((sum, [, definition]) =>
    sum + (definition.encounter.weight ?? 1), 0);
  let target = randomValue(random) * totalWeight;
  for (const entry of entries) {
    target -= entry[1].encounter.weight ?? 1;
    if (target < 0) return entry;
  }
  return entries.at(-1);
}

function getEligibleEntries(type, floor, dungeonId) {
  return Object.entries(ENEMY_DEFINITIONS)
    .filter(([, definition]) => isEligible(definition, type, floor, dungeonId));
}

/**
 * Create a floor roster from per-character spawn rules. Normal enemies are
 * weighted and sampled without replacement; the final slot is a fixed-rank
 * mini-boss or major boss according to the dungeon's boss interval.
 */
export function getFloorEnemyIds(floor, dungeonId = DEFAULT_DUNGEON_ID, { random = Math.random } = {}) {
  validateFloor(floor);
  if (typeof random !== "function") throw new TypeError("乱数関数を指定してください。");
  const dungeon = getDungeon(dungeonId);
  if (!dungeon) throw new RangeError("登録されていないダンジョンです: " + dungeonId);

  const plan = dungeon.encounterPlan;
  if (!plan) {
    const sets = dungeon.encounterSets;
    if (!Array.isArray(sets) || !sets[floor - 1]) {
      throw new RangeError("このダンジョンにその階層はありません: " + dungeonId + " / " + floor);
    }
    return [...sets[floor - 1]];
  }

  if (floor > (dungeon.floorCount ?? 0)) {
    throw new RangeError("このダンジョンにその階層はありません: " + dungeonId + " / " + floor);
  }
  const normalPool = getEligibleEntries("normal", floor, dungeonId);
  const normalCount = plan.normalEnemyCount;
  if (!Number.isSafeInteger(plan.enemiesPerFloor) || plan.enemiesPerFloor < 2 ||
      !Number.isSafeInteger(normalCount) || normalCount < 1 ||
      plan.enemiesPerFloor !== normalCount + 1 ||
      !Number.isSafeInteger(plan.majorBossEveryFloors) || plan.majorBossEveryFloors < 1) {
    throw new Error("階層編成設定が不正です: " + dungeonId);
  }
  if (normalPool.length < normalCount) {
    throw new Error("階層の通常敵プールが不足しています: " + dungeonId + " / " + floor);
  }

  const normalIds = [];
  const remaining = [...normalPool];
  while (normalIds.length < normalCount) {
    const selected = chooseWeighted(remaining, random);
    if (!selected) throw new Error("通常敵を抽選できません: " + dungeonId + " / " + floor);
    normalIds.push(selected[0]);
    remaining.splice(remaining.findIndex(([id]) => id === selected[0]), 1);
  }

  const isMajorBossFloor = floor % plan.majorBossEveryFloors === 0;
  const specialType = isMajorBossFloor ? "boss" : "miniBoss";
  const specialPool = getEligibleEntries(specialType, floor, dungeonId);
  const special = chooseWeighted(specialPool, random);
  if (!special) {
    throw new Error("階層に必要な" + (isMajorBossFloor ? "大ボス" : "中ボス") +
      "が登録されていません: " + dungeonId + " / " + floor);
  }

  return [...normalIds, special[0]];
}

/** Verify a saved random encounter roster without rerolling it. */
export function isValidFloorEncounterIds(floor, dungeonId, ids) {
  if (!Array.isArray(ids)) return false;
  const dungeon = getDungeon(dungeonId);
  if (!dungeon) return false;
  const plan = dungeon.encounterPlan;
  if (!plan) {
    const sets = dungeon.encounterSets;
    return Array.isArray(sets?.[floor - 1]) &&
      ids.length === sets[floor - 1].length &&
      ids.every((id, index) => id === sets[floor - 1][index]);
  }
  if (!Number.isSafeInteger(floor) || floor < 1 || floor > dungeon.floorCount ||
      ids.length !== plan.normalEnemyCount + 1) return false;

  const normalIds = ids.slice(0, plan.normalEnemyCount);
  if (new Set(normalIds).size !== normalIds.length ||
      normalIds.some((id) => !Object.hasOwn(ENEMY_DEFINITIONS, id) ||
        !isEligible(ENEMY_DEFINITIONS[id], "normal", floor, dungeonId))) return false;

  const specialType = floor % plan.majorBossEveryFloors === 0 ? "boss" : "miniBoss";
  const special = ENEMY_DEFINITIONS[ids.at(-1)];
  return Boolean(special && isEligible(special, specialType, floor, dungeonId));
}

export function getLegacyFloorEnemyIds(dungeonId = DEFAULT_DUNGEON_ID) {
  const dungeon = getDungeon(dungeonId);
  if (!dungeon?.legacyEncounterSet) {
    throw new RangeError("旧セーブに対応していないダンジョンです: " + dungeonId);
  }
  return [...dungeon.legacyEncounterSet];
}

export function getLegacyFloorV4EnemyIds(floor, dungeonId = DEFAULT_DUNGEON_ID) {
  validateFloor(floor);
  const dungeon = getDungeon(dungeonId);
  const sets = dungeon?.legacyEncounterSetsV4 ?? dungeon?.encounterSets;
  if (!Array.isArray(sets) || !sets[floor - 1]) {
    throw new RangeError("旧編成バージョン4に対応していないダンジョンです: " + dungeonId);
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
  validateFloor(floor);
  const difficulty = floor - 1;
  const enemy = {
    id: definition.id,
    name: definition.name,
    maxHp: definition.maxHp + difficulty * GAME_CONFIG.enemyScaling.hpPerFloor,
    attackPower: definition.attackPower +
      Math.floor(difficulty / GAME_CONFIG.enemyScaling.attackPowerEveryFloors) *
      GAME_CONFIG.enemyScaling.attackPowerPerStep,
    experienceReward: definition.experienceReward +
      difficulty * GAME_CONFIG.enemyScaling.experiencePerFloor,
    abilities: [...definition.abilities],
    isBoss: definition.isBoss === true,
  };
  if (definition.isMiniBoss === true) enemy.isMiniBoss = true;
  for (const property of ["attackElement", "elementalWeakness", "elementalResistance"]) {
    if (definition[property]) enemy[property] = definition[property];
  }
  return enemy;
}
