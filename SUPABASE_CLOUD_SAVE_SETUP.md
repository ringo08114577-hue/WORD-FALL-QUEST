# Supabase cloud save setup

## 1. Create the save table

1. Open the Supabase project.
2. Open SQL Editor.
3. Create a new query.
4. Copy and run the SQL in \`supabase/migrations/20261113000100_create_player_saves.sql\`.
5. Confirm that \`public.player_saves\` appears in Table Editor.

The migration enables RLS and grants authenticated users access only to the row whose \`user_id\` matches their own \`auth.uid()\`. It intentionally does not create a DELETE policy.

## 2. Use cloud saves in the game

1. Open the game's Account page and sign in as a guest or with Google.
2. Choose **この端末のセーブをクラウドへ保存** to upload this browser's current local snapshot.
3. If a cloud save already exists, the game asks before overwriting it.
4. On another device, sign in with the same Google account and choose **クラウドのセーブをこの端末へ復元**.
5. The cloud snapshot is validated and migrated by the existing versioned save system before it replaces the local save.

Cloud synchronization is manual in this first release. The game continues to write local saves normally. Automatic background sync and conflict resolution will be added only after this flow is tested.

## Important

- Never place a Supabase Secret key or service-role key in browser code.
- A Publishable key is intended for browser use, but RLS must remain enabled.
- Do not delete browser data while playing as an anonymous guest before linking that guest to Google.
- Cloud restore replaces the current local save after a confirmation prompt.
