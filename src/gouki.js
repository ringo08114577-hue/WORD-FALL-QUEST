/** Persistent 轟気 resource helpers. Stacks have no gameplay cap. */
export const GOUKI_DEFAULT_STATE = Object.freeze({
  stacks: 0,
  nextGainMultiplier: 1,
});

export function createInitialGoukiState() {
  return { ...GOUKI_DEFAULT_STATE };
}

export function isValidGoukiState(value) {
  return Boolean(
    value && typeof value === "object" && !Array.isArray(value) &&
    Number.isSafeInteger(value.stacks) && value.stacks >= 0 &&
    Number.isFinite(value.nextGainMultiplier) &&
    value.nextGainMultiplier >= 1 && value.nextGainMultiplier <= 100,
  );
}

export function normalizeGoukiState(value) {
  if (!isValidGoukiState(value)) return createInitialGoukiState();
  return {
    stacks: value.stacks,
    nextGainMultiplier: value.nextGainMultiplier,
  };
}

export function getGoukiAbilityMultiplier(stacks) {
  if (!Number.isSafeInteger(stacks) || stacks < 0) return 1;
  return 1 + stacks / 100;
}

export function gainGouki(value, baseAmount) {
  const current = normalizeGoukiState(value);
  if (!Number.isSafeInteger(baseAmount) || baseAmount < 1) {
    return { state: current, gained: 0 };
  }
  const gained = Math.ceil(baseAmount * current.nextGainMultiplier);
  const stacks = current.stacks + gained;
  if (!Number.isSafeInteger(stacks)) return { state: current, gained: 0 };
  return {
    state: { stacks, nextGainMultiplier: 1 },
    gained,
  };
}

export function setNextGoukiGainMultiplier(value, multiplier) {
  const current = normalizeGoukiState(value);
  if (!Number.isFinite(multiplier) || multiplier < 1 || multiplier > 100) return current;
  return { ...current, nextGainMultiplier: Math.max(current.nextGainMultiplier, multiplier) };
}

export function spendGouki(value, amount) {
  const current = normalizeGoukiState(value);
  if (!Number.isSafeInteger(amount) || amount < 1 || current.stacks < amount) {
    return { state: current, spent: 0, success: false };
  }
  return {
    state: { ...current, stacks: current.stacks - amount },
    spent: amount,
    success: true,
  };
}

export function spendAllGouki(value) {
  const current = normalizeGoukiState(value);
  if (current.stacks < 1) return { state: current, spent: 0, success: false };
  return {
    state: { ...current, stacks: 0 },
    spent: current.stacks,
    success: true,
  };
}
