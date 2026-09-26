import { getAnonId } from "@/lib/anon";
import { resolveAvatar } from "@/lib/avatar";
import { friendlyWriteError } from "@/lib/moderation";
import { supabase } from "@/lib/supabase";

export type VoteValue = 1 | -1;

/**
 * Toggle or switch a vote via security-definer RPC (no open vote update/delete RLS).
 */
export async function castVote(
  postId: string,
  direction: VoteValue,
  currentVote: VoteValue | null,
): Promise<void> {
  void currentVote;
  const userId = getAnonId();
  const { error } = await supabase.rpc("cast_anon_vote", {
    p_post_id: postId,
    p_user_id: userId,
    p_direction: direction,
  });
  if (error) throw new Error(friendlyWriteError(error.message));
}

/** Net score change when moving from currentVote to nextVote. */
export function scoreDelta(
  currentVote: VoteValue | null,
  nextVote: VoteValue | null,
): number {
  return (nextVote ?? 0) - (currentVote ?? 0);
}

export function authorFieldsForCurrentUser(): {
  anon_id: string;
  author_name: string;
  author_avatar: string;
} {
  const userId = getAnonId() || createFallbackId();
  const identity = resolveAvatar(userId);

  return {
    anon_id: userId,
    author_name: identity.animalName,
    author_avatar: identity.color,
  };
}

function createFallbackId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `anon-${Date.now()}`;
}
