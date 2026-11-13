import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, APP_REDIRECT_URL } from "./supabase-config.js";

export const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
});

export async function getCurrentUser() {
  const { data, error } = await supabase.auth.getUser();
  if (error && error.name !== "AuthSessionMissingError") throw error;
  return data?.user ?? null;
}

export async function startGuestSession() {
  const { data: current } = await supabase.auth.getSession();
  if (current.session?.user) return { user: current.session.user, existing: true };
  const { data, error } = await supabase.auth.signInAnonymously();
  if (error) throw error;
  return { user: data.user, existing: false };
}

export async function signInWithGoogle() {
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: { redirectTo: APP_REDIRECT_URL },
  });
  if (error) throw error;
  return data;
}

export async function linkGuestToGoogle() {
  const user = await getCurrentUser();
  if (!user) throw new Error("先にゲストプレイを開始してください。");
  if (user.is_anonymous !== true) throw new Error("このアカウントはすでにGoogle連携済みです。");
  const { data, error } = await supabase.auth.linkIdentity({
    provider: "google",
    options: { redirectTo: APP_REDIRECT_URL },
  });
  if (error) throw error;
  return data;
}
