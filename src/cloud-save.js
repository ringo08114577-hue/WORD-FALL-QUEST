/**
 * Explicit cloud-save operations for authenticated players.
 * Local saves remain the primary working copy until the player chooses to sync.
 */
export const CLOUD_SAVE_TABLE = "player_saves";

export function createCloudSaveController({ client, saveController, getUser }) {
  if (!client || typeof client.from !== "function") {
    throw new TypeError("cloud saveにはSupabase clientが必要です。");
  }
  if (!saveController ||
      typeof saveController.exportSnapshot !== "function" ||
      typeof saveController.restoreSnapshot !== "function" ||
      typeof saveController.save !== "function") {
    throw new TypeError("cloud saveにはsnapshot対応save controllerが必要です。");
  }
  if (typeof getUser !== "function") {
    throw new TypeError("cloud saveにはログインユーザー取得関数が必要です。");
  }

  async function requireUser() {
    const user = await getUser();
    if (!user?.id) return null;
    return user;
  }

  return {
    async getCloudStatus() {
      try {
        const user = await requireUser();
        if (!user) return { available: false, reason: "not-authenticated" };
        const { data, error } = await client
          .from(CLOUD_SAVE_TABLE)
          .select("updated_at, save_version")
          .eq("user_id", user.id)
          .maybeSingle();
        if (error) return { available: false, reason: "cloud-read-failed", error };
        return {
          available: true,
          exists: Boolean(data),
          updatedAt: data?.updated_at ?? null,
          version: data?.save_version ?? null,
        };
      } catch (error) {
        return { available: false, reason: "cloud-status-failed", error };
      }
    },

    async saveToCloud({ overwrite = false } = {}) {
      try {
        const user = await requireUser();
        if (!user) return { saved: false, reason: "not-authenticated" };

        const exported = saveController.exportSnapshot();
        if (!exported.exported) return { saved: false, reason: exported.reason };

        const { data: existing, error: readError } = await client
          .from(CLOUD_SAVE_TABLE)
          .select("updated_at")
          .eq("user_id", user.id)
          .maybeSingle();
        if (readError) return { saved: false, reason: "cloud-read-failed", error: readError };
        if (existing && !overwrite) {
          return {
            saved: false,
            reason: "cloud-save-exists",
            updatedAt: existing.updated_at ?? null,
          };
        }

        const snapshot = exported.snapshot;
        const { data, error } = await client
          .from(CLOUD_SAVE_TABLE)
          .upsert({
            user_id: user.id,
            save_version: snapshot.version,
            save_data: snapshot,
          }, { onConflict: "user_id" })
          .select("updated_at")
          .single();
        if (error) return { saved: false, reason: "cloud-write-failed", error };
        return { saved: true, updatedAt: data?.updated_at ?? null };
      } catch (error) {
        return { saved: false, reason: "cloud-write-failed", error };
      }
    },

    async loadFromCloud() {
      try {
        const user = await requireUser();
        if (!user) return { loaded: false, reason: "not-authenticated" };

        const { data, error } = await client
          .from(CLOUD_SAVE_TABLE)
          .select("save_data, save_version, updated_at")
          .eq("user_id", user.id)
          .maybeSingle();
        if (error) return { loaded: false, reason: "cloud-read-failed", error };
        if (!data) return { loaded: false, reason: "cloud-save-not-found" };

        const restored = saveController.restoreSnapshot(data.save_data);
        if (!restored.restored) {
          return { loaded: false, reason: restored.reason ?? "invalid-cloud-save" };
        }
        const local = saveController.save();
        if (!local.saved) {
          return {
            loaded: false,
            reason: "local-save-failed",
            restoredInMemory: true,
          };
        }
        return {
          loaded: true,
          updatedAt: data.updated_at ?? null,
          migrated: data.save_version !== restored.version,
        };
      } catch (error) {
        return { loaded: false, reason: "cloud-read-failed", error };
      }
    },
  };
}
