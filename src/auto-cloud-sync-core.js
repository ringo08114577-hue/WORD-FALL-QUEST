/**
 * Chooses a safe direction for the first cloud reconciliation.
 * Invalid timestamps are treated as a conflict instead of guessing.
 */
export function chooseAutoSyncAction({ local, cloud }) {
  if (!cloud?.available) return "wait";
  const localExists = local?.exists === true;
  const cloudExists = cloud?.exists === true;

  if (!localExists && !cloudExists) return "idle";
  if (localExists && !cloudExists) return "upload";
  if (!localExists && cloudExists) return "download";

  const localTime = Date.parse(local.savedAt ?? "");
  const cloudTime = Date.parse(cloud.updatedAt ?? "");
  if (!Number.isFinite(localTime) || !Number.isFinite(cloudTime)) return "conflict";
  if (localTime > cloudTime) return "upload";
  if (cloudTime > localTime) return "download";
  return "none";
}
