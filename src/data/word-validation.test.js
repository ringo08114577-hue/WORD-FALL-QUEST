import test from "node:test";
import assert from "node:assert/strict";

import { WORD_CHALLENGES } from "./words.js";
import {
  WORD_PARTS_OF_SPEECH,
  validateWordCatalog,
} from "./word-validation.js";

test("現在の単語一覧102語は新しいデータ形式の検査に合格する", () => {
  const result = validateWordCatalog(WORD_CHALLENGES);
  assert.equal(result.valid, true, result.errors.join("\n"));
  assert.deepEqual(result.errors, []);
  assert.equal(result.stats.total, 102);
  assert.equal(Object.values(result.stats.byDifficulty).reduce((sum, count) => sum + count, 0), 102);
  assert.equal(Object.values(result.stats.byPartOfSpeech).reduce((sum, count) => sum + count, 0), 102);
});

test("英単語は品詞・意味・難易度を含む正しい形式で登録されている", () => {
  for (const entry of WORD_CHALLENGES) {
    assert.equal(typeof entry.id, "string");
    assert.equal(typeof entry.japanese, "string");
    assert.match(entry.word, /^[A-Z]+$/);
    assert.ok(Number.isInteger(entry.difficulty) && entry.difficulty >= 1 && entry.difficulty <= 6);
    assert.ok(WORD_PARTS_OF_SPEECH.includes(entry.partOfSpeech));
  }
});

test("ID・英単語・意味・難易度・品詞の不正を検出する", () => {
  const invalid = [
    { id: "same", japanese: "ねこ", word: "CAT", difficulty: 1, partOfSpeech: "noun" },
    { id: "same", japanese: "", word: "dog", difficulty: 7, partOfSpeech: "animal" },
    { id: "bad id", japanese: "本", word: "BOOK!", difficulty: 2, partOfSpeech: "noun" },
  ];
  const result = validateWordCatalog(invalid);
  assert.equal(result.valid, false);
  assert.ok(result.errors.some((error) => error.includes("ID")));
  assert.ok(result.errors.some((error) => error.includes("重複")));
  assert.ok(result.errors.some((error) => error.includes("意味")));
  assert.ok(result.errors.some((error) => error.includes("大文字")));
  assert.ok(result.errors.some((error) => error.includes("難易度")));
  assert.ok(result.errors.some((error) => error.includes("品詞")));
});

test("同じスペルで異なる品詞は警告し、同じスペルと品詞の重複はエラーにする", () => {
  const records = [
    { id: "record-1", japanese: "本", word: "BOOK", difficulty: 1, partOfSpeech: "noun" },
    { id: "record-2", japanese: "予約する", word: "BOOK", difficulty: 2, partOfSpeech: "verb" },
    { id: "record-3", japanese: "書籍", word: "BOOK", difficulty: 1, partOfSpeech: "noun" },
  ];
  const result = validateWordCatalog(records);
  assert.equal(result.valid, false);
  assert.ok(result.warnings.some((warning) => warning.includes("BOOK")));
  assert.ok(result.errors.some((error) => error.includes("品詞「noun」が重複")));
});

test("alternateMeaningsは空欄や重複を許可しない", () => {
  const valid = {
    id: "run",
    japanese: "走る",
    word: "RUN",
    difficulty: 2,
    partOfSpeech: "verb",
    alternateMeanings: ["駆ける", "急いで進む"],
  };
  assert.equal(validateWordCatalog([valid]).valid, true);
  assert.equal(validateWordCatalog([
    { ...valid, alternateMeanings: ["走る", "走る"] },
  ]).valid, false);
  assert.equal(validateWordCatalog([
    { ...valid, alternateMeanings: [""] },
  ]).valid, false);
});

test("配列以外を単語一覧に指定するとエラーにする", () => {
  const result = validateWordCatalog(null);
  assert.equal(result.valid, false);
  assert.equal(result.errors.length, 1);
});
