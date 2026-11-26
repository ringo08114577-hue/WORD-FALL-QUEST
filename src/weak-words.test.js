import test from "node:test";
import assert from "node:assert/strict";
import { WORD_CHALLENGES } from "./data/words.js";
import {
  isValidWeakWordEntries,
  normalizeWeakWordEntries,
  recordWeakWordMistake,
  removeWeakWordEntry,
  sortWeakWordEntries,
} from "./weak-words.js";

const apple = WORD_CHALLENGES.find((word) => word.id === "apple");
const journey = WORD_CHALLENGES.find((word) => word.id === "journey");

test("苦手単語帳は最初は空で、空配列を有効な記録として扱う", () => {
  assert.deepEqual(normalizeWeakWordEntries(undefined), []);
  assert.equal(isValidWeakWordEntries([]), true);
});

test("同じ単語を間違えるたびに回数と最終日時を更新し、初回日時は維持する", () => {
  const first = recordWeakWordMistake([], apple, 100);
  const second = recordWeakWordMistake(first, apple, 250);
  assert.deepEqual(second, [{
    wordId: "apple",
    mistakes: 2,
    firstMissedAt: 100,
    lastMissedAt: 250,
  }]);
  assert.equal(isValidWeakWordEntries(second), true);
});

test("異なる単語をそれぞれ登録し、ミス回数の多い順に並べる", () => {
  let entries = recordWeakWordMistake([], apple, 100);
  entries = recordWeakWordMistake(entries, journey, 200);
  entries = recordWeakWordMistake(entries, journey, 300);
  const sorted = sortWeakWordEntries(entries);
  assert.deepEqual(sorted.map((entry) => entry.wordId), ["journey", "apple"]);
});

test("覚えた単語を苦手単語帳から取り除く", () => {
  const entries = [
    ...recordWeakWordMistake([], apple, 100),
    ...recordWeakWordMistake([], journey, 200),
  ];
  assert.deepEqual(removeWeakWordEntry(entries, "apple").map((entry) => entry.wordId), ["journey"]);
});

test("未知の単語・重複・不正な回数や日時を保存データとして受け付けない", () => {
  assert.equal(isValidWeakWordEntries([{ wordId: "unknown", mistakes: 1, firstMissedAt: 1, lastMissedAt: 1 }]), false);
  assert.equal(isValidWeakWordEntries([
    { wordId: "apple", mistakes: 1, firstMissedAt: 1, lastMissedAt: 1 },
    { wordId: "apple", mistakes: 2, firstMissedAt: 1, lastMissedAt: 2 },
  ]), false);
  assert.equal(isValidWeakWordEntries([{ wordId: "apple", mistakes: 0, firstMissedAt: 1, lastMissedAt: 1 }]), false);
  assert.equal(isValidWeakWordEntries([{ wordId: "apple", mistakes: 1, firstMissedAt: 2, lastMissedAt: 1 }]), false);
  assert.deepEqual(normalizeWeakWordEntries([
    { wordId: "unknown", mistakes: 1, firstMissedAt: 1, lastMissedAt: 1 },
    { wordId: "apple", mistakes: -1, firstMissedAt: 1, lastMissedAt: 1 },
  ]), []);
});

test("存在しない単語を追加しようとするとエラーになる", () => {
  assert.throws(() => recordWeakWordMistake([], { id: "unknown" }, 1), RangeError);
});
