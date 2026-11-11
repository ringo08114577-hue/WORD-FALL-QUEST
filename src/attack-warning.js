/**
 * Enemy attack telegraph timing shared by the battle UI and unit tests.
 * The warning begins during the final three seconds before an attack.
 */
export const ENEMY_ATTACK_WARNING_WINDOW_MS = 3000;

/**
 * Return the normalized countdown state for a normal enemy or boss attack.
 * elapsedMs is clamped to the interval so progress always stays in [0, 1].
 */
export function getEnemyAttackWarningState(
  elapsedMs,
  intervalMs,
  warningWindowMs = ENEMY_ATTACK_WARNING_WINDOW_MS,
) {
  if (!Number.isFinite(elapsedMs) || elapsedMs < 0) {
    throw new RangeError("elapsedMsは0以上の有限数値にしてください。");
  }
  if (!Number.isFinite(intervalMs) || intervalMs <= 0) {
    throw new RangeError("intervalMsは正の有限数値にしてください。");
  }
  if (!Number.isFinite(warningWindowMs) || warningWindowMs < 0) {
    throw new RangeError("warningWindowMsは0以上の有限数値にしてください。");
  }

  const boundedElapsedMs = Math.min(elapsedMs, intervalMs);
  const remainingMs = intervalMs - boundedElapsedMs;
  return {
    progress: boundedElapsedMs / intervalMs,
    remainingMs,
    isWarning: remainingMs > 0 && remainingMs <= warningWindowMs,
  };
}
