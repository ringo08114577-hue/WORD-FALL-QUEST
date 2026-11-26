/**
 * Persistent review data for vocabulary words missed during battles.
 * The entries live inside the normal save snapshot, so local and cloud saves
 * carry the same notebook between pages and devices.
 */
import { WORD_CHALLENGES } from "./data/words.js";

const WORD_IDS = new Set(WORD_CHALLENGES.map((challenge) => challenge.id));
const MAX_ENTRIES = WORD_CHALLENGES.length;

function isTimestamp(value) {
  return Number.isSafeInteger(value) && value >= 0;
}

export function isValidWeakWordEntries(entries) {
  if (!Array.isArray(entries) || entries.length > MAX_ENTRIES) return false;
  const seen = new Set();
  return entries.every((entry) => {
    if (!entry || typeof entry !== "object" || Array.isArray(entry)) return false;
    if (!WORD_IDS.has(entry.wordId) || seen.has(entry.wordId)) return false;
    if (!Number.isSafeInteger(entry.mistakes) || entry.mistakes < 1) return false;
    if (!isTimestamp(entry.firstMissedAt) || !isTimestamp(entry.lastMissedAt)) return false;
    if (entry.firstMissedAt > entry.lastMissedAt) return false;
    seen.add(entry.wordId);
    return true;
  });
}

export function sortWeakWordEntries(entries) {
  return [...normalizeWeakWordEntries(entries)].sort((a, b) =>
    b.mistakes - a.mistakes ||
    b.lastMissedAt - a.lastMissedAt ||
    a.wordId.localeCompare(b.wordId),
  );
}

export function normalizeWeakWordEntries(entries) {
  if (!Array.isArray(entries)) return [];
  const normalized = [];
  const seen = new Set();
  for (const entry of entries) {
    if (!entry || typeof entry !== "object" || Array.isArray(entry)) continue;
    const { wordId, mistakes, firstMissedAt, lastMissedAt } = entry;
    if (!WORD_IDS.has(wordId) || seen.has(wordId)) continue;
    if (!Number.isSafeInteger(mistakes) || mistakes < 1) continue;
    if (!isTimestamp(firstMissedAt) || !isTimestamp(lastMissedAt) ||
        firstMissedAt > lastMissedAt) continue;
    normalized.push({ wordId, mistakes, firstMissedAt, lastMissedAt });
    seen.add(wordId);
    if (normalized.length >= MAX_ENTRIES) break;
  }
  return normalized;
}

export function recordWeakWordMistake(entries, challenge, timestamp = Date.now()) {
  if (!challenge || typeof challenge !== "object" || !WORD_IDS.has(challenge.id)) {
    throw new RangeError("登録されていない単語です。");
  }
  if (!isTimestamp(timestamp)) {
    throw new RangeError("timestampは0以上の安全な整数にしてください。");
  }
  const current = normalizeWeakWordEntries(entries);
  const existing = current.find((entry) => entry.wordId === challenge.id);
  if (existing) {
    return current.map((entry) => entry.wordId === challenge.id
      ? { ...entry, mistakes: entry.mistakes + 1, lastMissedAt: Math.max(entry.lastMissedAt, timestamp) }
      : entry);
  }
  return [
    ...current,
    {
      wordId: challenge.id,
      mistakes: 1,
      firstMissedAt: timestamp,
      lastMissedAt: timestamp,
    },
  ];
}

export function removeWeakWordEntry(entries, wordId) {
  return normalizeWeakWordEntries(entries).filter((entry) => entry.wordId !== wordId);
}
