import { supabase, getCurrentUser } from "./supabase-auth.js";
import { createCloudSaveController } from "./cloud-save.js";
import { chooseAutoSyncAction } from "./auto-cloud-sync-core.js";

const DEFAULT_DEBOUNCE_MS = 900;
const attachedControllers = new WeakMap();

function emitSyncStatus(status, detail = {}) {
  try {
    if (typeof window !== "undefined" && typeof CustomEvent !== "undefined") {
      window.dispatchEvent(new CustomEvent("wq:auto-cloud-sync", {
        detail: { status, ...detail },
      }));
    }
  } catch {
    // A status notification must never interrupt the game.
  }
}

/**
 * Connects existing local autosaves to Supabase.
 * Local storage is always written first; cloud work is debounced and best-effort.
 */
export function attachAutoCloudSync({
  saveController,
  debounceMs = DEFAULT_DEBOUNCE_MS,
} = {}) {
  if (!saveController || typeof saveController.save !== "function" ||
      typeof saveController.getLocalSaveInfo !== "function") {
    throw new TypeError("自動同期にはローカル保存情報に対応したsave controllerが必要です。");
  }
  if (attachedControllers.has(saveController)) return attachedControllers.get(saveController);

  const cloudSave = createCloudSaveController({
    client: supabase,
    saveController,
    getUser: getCurrentUser,
  });

  let activeUserId = null;
  let ready = false;
  let dirty = false;
  let localChangeVersion = 0;
  let applyingCloudRestore = false;
  let startupPromise = Promise.resolve();
  let syncPromise = null;
  let queuedSync = false;
  let debounceTimer = null;

  function clearDebounce() {
    if (debounceTimer !== null) {
      globalThis.clearTimeout(debounceTimer);
      debounceTimer = null;
    }
  }

  function scheduleSync() {
    if (!ready || !activeUserId || !dirty) return;
    clearDebounce();
    debounceTimer = globalThis.setTimeout(() => {
      debounceTimer = null;
      void syncNow();
    }, debounceMs);
  }

  async function syncNow() {
    if (!ready || !activeUserId || !dirty) return;
    if (syncPromise) {
      queuedSync = true;
      return syncPromise;
    }

    const userId = activeUserId;
    syncPromise = (async () => {
      do {
        queuedSync = false;
        dirty = false;
        try {
          const currentUser = await getCurrentUser();
          if (!currentUser?.id || currentUser.id !== userId || activeUserId !== userId) {
            return;
          }
          const result = await cloudSave.saveToCloud({ overwrite: true });
          if (!result.saved) {
            dirty = true;
            emitSyncStatus("error", {
              message: result.error?.message ?? result.reason ?? "cloud-save-failed",
            });
            return;
          }
          emitSyncStatus("synced", { updatedAt: result.updatedAt ?? null });
        } catch (error) {
          dirty = true;
          emitSyncStatus("error", { message: error?.message ?? "cloud-save-failed" });
          return;
        }
      } while (queuedSync && activeUserId === userId);
    })();

    try {
      await syncPromise;
    } finally {
      syncPromise = null;
      if (queuedSync && dirty) scheduleSync();
    }
  }

  function onLocalSave() {
    dirty = true;
    localChangeVersion += 1;
    if (!ready) return;
    scheduleSync();
  }

  const originalSave = saveController.save.bind(saveController);
  saveController.save = (...args) => {
    const result = originalSave(...args);
    if (result?.saved && !applyingCloudRestore) onLocalSave();
    return result;
  };

  function reloadAfterCloudRestore(updatedAt) {
    if (typeof window === "undefined") return;
    try {
      const marker = `wq-cloud-restore-reload:${activeUserId}:${updatedAt ?? "unknown"}`;
      if (window.sessionStorage.getItem(marker) === "1") return;
      window.sessionStorage.setItem(marker, "1");
      globalThis.setTimeout(() => window.location.reload(), 120);
    } catch {
      // Session storage may be disabled; keep the current page usable.
    }
  }

  async function reconcile(user) {
    if (!user?.id) {
      activeUserId = null;
      ready = false;
      dirty = false;
      clearDebounce();
      emitSyncStatus("signed-out");
      return;
    }
    if (activeUserId === user.id && ready) return;
    if (activeUserId === user.id && !ready) return startupPromise;

    clearDebounce();
    activeUserId = user.id;
    ready = false;
    dirty = false;
    emitSyncStatus("checking");

    const thisUserId = user.id;
    startupPromise = (async () => {
      const startingChangeVersion = localChangeVersion;
      try {
        let local = saveController.getLocalSaveInfo();
        const cloud = await cloudSave.getCloudStatus();
        if (activeUserId !== thisUserId) return;

        // Re-read if the player saved while the cloud status was loading.
        if (localChangeVersion !== startingChangeVersion) {
          local = saveController.getLocalSaveInfo();
        }
        let decisionVersion = localChangeVersion;
        let action = chooseAutoSyncAction({ local, cloud });
        if (localChangeVersion !== decisionVersion) {
          local = saveController.getLocalSaveInfo();
          decisionVersion = localChangeVersion;
          action = chooseAutoSyncAction({ local, cloud });
        }
        const versionBeforeAction = localChangeVersion;
        if (action === "wait") {
          emitSyncStatus("error", { message: "クラウドの状態を確認できないため、自動同期を保留したよ。" });
          return;
        }
        if (action === "conflict") {
          emitSyncStatus("conflict", { message: "保存日時を確認できないため、自動同期を保留したよ。" });
          return;
        }

        if (action === "upload") {
          const result = await cloudSave.saveToCloud({ overwrite: true });
          if (!result.saved) {
            emitSyncStatus("error", { message: result.error?.message ?? result.reason });
            return;
          }
          emitSyncStatus("synced", { updatedAt: result.updatedAt ?? null });
        } else if (action === "download") {
          applyingCloudRestore = true;
          let result;
          try {
            result = await cloudSave.loadFromCloud();
          } finally {
            applyingCloudRestore = false;
          }
          if (!result.loaded) {
            emitSyncStatus("error", { message: result.error?.message ?? result.reason });
            return;
          }
          emitSyncStatus("restored", { updatedAt: result.updatedAt ?? null });
          reloadAfterCloudRestore(result.updatedAt ?? null);
        } else if (action === "none") {
          emitSyncStatus("synced");
        } else {
          emitSyncStatus("ready");
        }

        if (activeUserId !== thisUserId) return;
        ready = true;
        // Preserve saves made while the initial reconciliation was in flight.
        dirty = localChangeVersion > versionBeforeAction;
        if (dirty) scheduleSync();
      } catch (error) {
        emitSyncStatus("error", { message: error?.message ?? "cloud-sync-init-failed" });
      }
    })();
    return startupPromise;
  }

  function flush() {
    clearDebounce();
    if (dirty) void syncNow();
  }

  const authSubscription = supabase.auth.onAuthStateChange((_event, session) => {
    globalThis.setTimeout(() => {
      void reconcile(session?.user ?? null);
    }, 0);
  });

  if (typeof document !== "undefined") {
    document.addEventListener("visibilitychange", () => {
      if (document.hidden) globalThis.setTimeout(flush, 100);
    });
  }
  if (typeof window !== "undefined") {
    window.addEventListener("pagehide", () => globalThis.setTimeout(flush, 0));
  }

  void getCurrentUser()
    .then((user) => reconcile(user))
    .catch((error) => emitSyncStatus("error", { message: error?.message ?? "auth-check-failed" }));

  const handle = {
    flush,
    isReady: () => ready,
    dispose() {
      clearDebounce();
      authSubscription?.data?.subscription?.unsubscribe?.();
      attachedControllers.delete(saveController);
    },
  };
  attachedControllers.set(saveController, handle);
  return handle;
}
