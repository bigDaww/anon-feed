import { getAnonId } from "@/lib/anon";
import { supabase } from "@/lib/supabase";

export type Profile = {
  id: string;
  display_name: string;
  public_id: string;
  avatar: string;
  karma: number;
  rep_insightful: number;
  rep_helpful: number;
  rep_funny: number;
  rep_supportive: number;
  created_at: string;
};

const PROFILE_CACHE_KEY = "ol_profile_cache";

function readCache(): Profile | null {
  try {
    const raw = localStorage.getItem(PROFILE_CACHE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as Profile;
  } catch {
    return null;
  }
}

function writeCache(profile: Profile | null) {
  try {
    if (!profile) {
      localStorage.removeItem(PROFILE_CACHE_KEY);
      return;
    }
    localStorage.setItem(PROFILE_CACHE_KEY, JSON.stringify(profile));
  } catch {
    // ignore
  }
}

export function getCachedProfile(): Profile | null {
  return readCache();
}

export function setCachedProfile(profile: Profile | null) {
  writeCache(profile);
}

export async function fetchProfileById(id: string): Promise<Profile | null> {
  const { data, error } = await supabase
    .from("profiles")
    .select(
      "id, display_name, public_id, avatar, karma, rep_insightful, rep_helpful, rep_funny, rep_supportive, created_at",
    )
    .eq("id", id)
    .maybeSingle();

  if (error) throw error;
  return (data as Profile | null) ?? null;
}

export async function fetchCurrentProfile(): Promise<Profile | null> {
  const id = getAnonId();
  const profile = await fetchProfileById(id);
  if (profile) setCachedProfile(profile);
  return profile;
}

function rpcErrorMessage(error: unknown): string {
  if (!error) return "Could not create profile";
  if (typeof error === "object" && error !== null && "message" in error) {
    const msg = String((error as { message: unknown }).message);
    if (msg.includes("digest")) {
      return "Database setup incomplete: run supabase/fix_profiles_digest_search_path.sql in the Supabase SQL editor, then try again.";
    }
    return msg || "Could not create profile";
  }
  if (error instanceof Error) return error.message;
  return "Could not create profile";
}

export async function createProfile(input: {
  id: string;
  displayName: string;
  publicId: string;
  recoveryKey: string;
  avatar: string;
}): Promise<Profile> {
  const { data, error } = await supabase.rpc("create_anon_profile", {
    p_id: input.id,
    p_display_name: input.displayName.trim() || "Anonymous User",
    p_public_id: input.publicId,
    p_recovery_key: input.recoveryKey,
    p_avatar: input.avatar,
  });

  if (error) throw new Error(rpcErrorMessage(error));
  const profile = data as Profile;
  if (!profile?.id) throw new Error("Could not create profile");
  setCachedProfile(profile);
  return profile;
}

export async function recoverProfile(
  publicId: string,
  recoveryKey: string,
): Promise<Profile | null> {
  const { data, error } = await supabase.rpc("verify_recovery", {
    p_public_id: publicId.trim(),
    p_recovery_key: recoveryKey.trim(),
  });

  if (error) throw error;
  if (!data) return null;
  const profile = data as Profile;
  setCachedProfile(profile);
  return profile;
}

/** Persist recovered identity as this device's anon_id. */
export function adoptProfileIdentity(profileId: string) {
  try {
    localStorage.setItem("anon_id", profileId);
    if (!localStorage.getItem("anon_joined_at")) {
      localStorage.setItem("anon_joined_at", new Date().toISOString());
    }
  } catch {
    // ignore
  }
}
