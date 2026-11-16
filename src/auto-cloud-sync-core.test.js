import test from "node:test";
import assert from "node:assert/strict";
import { chooseAutoSyncAction } from "./auto-cloud-sync-core.js";

test("クラウドがないときはローカルデータを初回アップロードする", () => {
  assert.equal(chooseAutoSyncAction({
    local: { exists: true, savedAt: "2026-11-16T00:00:00.000Z" },
    cloud: { available: true, exists: false },
  }), "upload");
});

test("ローカルデータがない別端末ではクラウドから復元する", () => {
  assert.equal(chooseAutoSyncAction({
    local: { exists: false },
    cloud: { available: true, exists: true, updatedAt: "2026-11-16T00:00:00.000Z" },
  }), "download");
});

test("新しい方のセーブを残す", () => {
  assert.equal(chooseAutoSyncAction({
    local: { exists: true, savedAt: "2026-11-16T10:00:00.000Z" },
    cloud: { available: true, exists: true, updatedAt: "2026-11-16T09:00:00.000Z" },
  }), "upload");
  assert.equal(chooseAutoSyncAction({
    local: { exists: true, savedAt: "2026-11-16T09:00:00.000Z" },
    cloud: { available: true, exists: true, updatedAt: "2026-11-16T10:00:00.000Z" },
  }), "download");
});

test("日時が不明な場合は危険な上書きを避けて競合扱いにする", () => {
  assert.equal(chooseAutoSyncAction({
    local: { exists: true, savedAt: null },
    cloud: { available: true, exists: true, updatedAt: null },
  }), "conflict");
  assert.equal(chooseAutoSyncAction({
    local: { exists: false },
    cloud: { available: false, exists: false },
  }), "wait");
});
