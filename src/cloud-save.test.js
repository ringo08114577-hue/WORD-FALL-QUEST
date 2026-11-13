import test from "node:test";
import assert from "node:assert/strict";
import { createAppSession } from "./app-session.js";
import { GAME_ACTION } from "./game-state.js";
import { createCloudSaveController } from "./cloud-save.js";

function memoryStorage() {
  const values = new Map();
  return {
    getItem(key) { return values.has(key) ? values.get(key) : null; },
    setItem(key, value) { values.set(key, String(value)); },
    removeItem(key) { values.delete(key); },
  };
}

function fakeSupabaseClient() {
  const rows = new Map();
  return {
    rows,
    from(table) {
      assert.equal(table, "player_saves");
      return {
        select() {
          let userId = null;
          const query = {
            eq(column, value) {
              assert.equal(column, "user_id");
              userId = value;
              return query;
            },
            async maybeSingle() {
              return { data: rows.get(userId) ?? null, error: null };
            },
          };
          return query;
        },
        upsert(row, options) {
          assert.equal(options.onConflict, "user_id");
          return {
            select() {
              return {
                async single() {
                  const saved = {
                    ...structuredClone(row),
                    updated_at: "2026-11-13T00:00:00.000Z",
                  };
                  rows.set(row.user_id, saved);
                  return { data: { updated_at: saved.updated_at }, error: null };
                },
              };
            },
          };
        },
      };
    },
  };
}

function controllerFor(session, client, user = { id: "player-1" }) {
  return createCloudSaveController({
    client,
    saveController: session.saves,
    getUser: async () => user,
  });
}

test("クラウドセーブはユーザーID付きで保存し、別セッションへ復元できる", async () => {
  const client = fakeSupabaseClient();
  const first = createAppSession({ storage: memoryStorage() });
  first.store.dispatch({ type: GAME_ACTION.ADD_GOLD, amount: 75 });
  const firstCloud = controllerFor(first, client);

  const saved = await firstCloud.saveToCloud();
  assert.equal(saved.saved, true);
  assert.equal(client.rows.get("player-1").user_id, "player-1");
  assert.equal(client.rows.get("player-1").save_version, 8);

  const second = createAppSession({ storage: memoryStorage() });
  const secondCloud = controllerFor(second, client);
  const loaded = await secondCloud.loadFromCloud();
  assert.equal(loaded.loaded, true);
  assert.equal(second.store.getState().inventory.gold, 75);
  assert.equal(second.saves.exportSnapshot().snapshot.gameState.inventory.gold, 75);
});

test("既存クラウドセーブは明示的な上書き指定なしでは上書きしない", async () => {
  const client = fakeSupabaseClient();
  const first = createAppSession({ storage: memoryStorage() });
  first.store.dispatch({ type: GAME_ACTION.ADD_GOLD, amount: 20 });
  const cloud = controllerFor(first, client);
  assert.equal((await cloud.saveToCloud()).saved, true);

  first.store.dispatch({ type: GAME_ACTION.ADD_GOLD, amount: 10 });
  const blocked = await cloud.saveToCloud();
  assert.equal(blocked.saved, false);
  assert.equal(blocked.reason, "cloud-save-exists");
  assert.equal(client.rows.get("player-1").save_data.gameState.inventory.gold, 20);

  const overwritten = await cloud.saveToCloud({ overwrite: true });
  assert.equal(overwritten.saved, true);
  assert.equal(client.rows.get("player-1").save_data.gameState.inventory.gold, 30);
});

test("未ログイン時はクラウド読み書きを拒否する", async () => {
  const client = fakeSupabaseClient();
  const session = createAppSession({ storage: memoryStorage() });
  const cloud = controllerFor(session, client, null);
  assert.deepEqual(await cloud.saveToCloud(), {
    saved: false,
    reason: "not-authenticated",
  });
  assert.deepEqual(await cloud.loadFromCloud(), {
    loaded: false,
    reason: "not-authenticated",
  });
  assert.equal(client.rows.size, 0);
});

test("存在しないクラウドセーブを読み込もうとしてもローカルデータを変えない", async () => {
  const client = fakeSupabaseClient();
  const session = createAppSession({ storage: memoryStorage() });
  session.store.dispatch({ type: GAME_ACTION.ADD_GOLD, amount: 99 });
  const cloud = controllerFor(session, client);
  const result = await cloud.loadFromCloud();
  assert.equal(result.loaded, false);
  assert.equal(result.reason, "cloud-save-not-found");
  assert.equal(session.store.getState().inventory.gold, 99);
});
