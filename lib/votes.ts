import { getAnonId } from "@/lib/anon";
import {
  avatarColorFromAnonId,
  formatAnonHandle,
} from "@/lib/anon-display";
import { supabase } from "@/lib/supabase";

export type VoteValue = 1 | -1;

function toVoteType(direction: VoteValue): "up" | "down" {
  return direction === 1 ? "up" : "down";
}

/**
 * Toggle or switch a vote for the current user.
 * - Same direction again → delete (toggle off)
 * - Opposite / first vote → insert or update (unique post_id+user_id)
 */
export async function castVote(
  postId: string,
  direction: VoteValue,
  currentVote: VoteValue | null,
): Promise<void> {
  const userId = getAnonId();

  if (currentVote === direction) {
    const { error } = await supabase
      .from("votes")
      .delete()
      .eq("post_id", postId)
      .eq("user_id", userId);

    if (error) throw error;
    return;
  }

  const payload = {
    post_id: postId,
    user_id: userId,
    anon_id: userId,
    vote_type: toVoteType(direction),
    value: direction,
  };

  const { data: existing, error: lookupError } = await supabase
    .from("votes")
    .select("id")
    .eq("post_id", postId)
    .eq("user_id", userId)
    .maybeSingle();

  if (lookupError) throw lookupError;

  if (existing?.id) {
    const { error } = await supabase
      .from("votes")
      .update({
        vote_type: payload.vote_type,
        value: payload.value,
        anon_id: userId,
      })
      .eq("id", existing.id);
    if (error) throw error;
    return;
  }

  const { error } = await supabase.from("votes").insert(payload);
  if (error) throw error;
}

/** Net score change when moving from currentVote to nextVote. */
export function scoreDelta(
  currentVote: VoteValue | null,
  nextVote: VoteValue | null,
): number {
  return (nextVote ?? 0) - (currentVote ?? 0);
}

export function authorFieldsForCurrentUser() {
  const userId = getAnonId();
  return {
    anon_id: userId,
    author_name: formatAnonHandle(userId),
    author_avatar: avatarColorFromAnonId(userId),
  };
}
