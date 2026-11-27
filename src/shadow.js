/**
 * Shadow Blade combat momentum and two-stage critical system.
 * A flawless completed spelling challenge raises critical chance by 5 points.
 */
export const SHADOW_BASE_CRITICAL_RATE = 5;
export const SHADOW_CRITICAL_RATE_STEP = 5;
export const SHADOW_MAX_CRITICAL_RATE = 60;
export const SHADOW_MAX_STREAK =
  (SHADOW_MAX_CRITICAL_RATE - SHADOW_BASE_CRITICAL_RATE) / SHADOW_CRITICAL_RATE_STEP;

export function createInitialShadowState() {
  return {
    consecutiveCorrectWords: 0,
    mistakeInCurrentWord: false,
    nextAttackCriticalBonus: 0,
  };
}

export function isValidShadowState(state) {
  return Boolean(
    state &&
    typeof state === "object" &&
    !Array.isArray(state) &&
    Number.isInteger(state.consecutiveCorrectWords) &&
    state.consecutiveCorrectWords >= 0 &&
    state.consecutiveCorrectWords <= SHADOW_MAX_STREAK &&
    typeof state.mistakeInCurrentWord === "boolean" &&
    Number.isInteger(state.nextAttackCriticalBonus) &&
    state.nextAttackCriticalBonus >= 0 &&
    state.nextAttackCriticalBonus <= 50
  );
}

export function normalizeShadowState(state) {
  if (!isValidShadowState(state)) return createInitialShadowState();
  return { ...state };
}

export function getShadowCriticalRate(state) {
  const normalized = normalizeShadowState(state);
  return Math.min(
    SHADOW_MAX_CRITICAL_RATE,
    SHADOW_BASE_CRITICAL_RATE +
      normalized.consecutiveCorrectWords * SHADOW_CRITICAL_RATE_STEP,
  );
}

export function registerShadowMistake(state) {
  const normalized = normalizeShadowState(state);
  return {
    ...normalized,
    consecutiveCorrectWords: 0,
    mistakeInCurrentWord: true,
    nextAttackCriticalBonus: 0,
  };
}

export function registerShadowWordComplete(state) {
  const normalized = normalizeShadowState(state);
  return {
    ...normalized,
    consecutiveCorrectWords: normalized.mistakeInCurrentWord
      ? 0
      : Math.min(SHADOW_MAX_STREAK, normalized.consecutiveCorrectWords + 1),
    mistakeInCurrentWord: false,
  };
}

export function setShadowNextAttackBonus(state, bonus) {
  const normalized = normalizeShadowState(state);
  if (!Number.isInteger(bonus) || bonus < 0 || bonus > 50) {
    throw new RangeError("影刃の次回会心率ボーナスは0〜50の整数にしてください。");
  }
  return { ...normalized, nextAttackCriticalBonus: bonus };
}

export function consumeShadowNextAttackBonus(state) {
  const normalized = normalizeShadowState(state);
  return { ...normalized, nextAttackCriticalBonus: 0 };
}

/**
 * 重撃率は会心判定が成功した後に使う条件付き確率。
 * 会心率が5ポイント上がるごとに、重撃率も1ポイント増える。
 */
export function getShadowHeavyRate(criticalRate, baseHeavyRate, passiveBonus = 0) {
  const safeCriticalRate = Number.isFinite(criticalRate)
    ? Math.max(SHADOW_BASE_CRITICAL_RATE, Math.min(100, criticalRate))
    : SHADOW_BASE_CRITICAL_RATE;
  const safeBaseRate = Number.isFinite(baseHeavyRate)
    ? Math.max(0, Math.min(0.95, baseHeavyRate))
    : 0;
  const safePassiveBonus = Number.isFinite(passiveBonus)
    ? Math.max(0, Math.min(0.5, passiveBonus))
    : 0;
  const momentumBonus = Math.floor(
    (safeCriticalRate - SHADOW_BASE_CRITICAL_RATE) / SHADOW_CRITICAL_RATE_STEP,
  ) * 0.01;
  return Math.min(0.95, safeBaseRate + momentumBonus + safePassiveBonus);
}
