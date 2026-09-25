import { getAnonId } from "@/lib/anon";
import { supabase } from "@/lib/supabase";

export type VoteValue = 1 | -1;

/**
 * Toggle or switch a vote for the current anon_id.
 * - Same direction again → delete (toggle off)
 * - Opposite / first vote → upsert (respects unique post_id+anon_id)
 */
export async function castVote(
  postId: string,
  direction: VoteValue,
  currentVote: VoteValue | null,
): Promise<void> {
  const anonId = getAnonId();

  if (currentVote === direction) {
    const { error } = await supabase
      .from("votes")
      .delete()
      .eq("post_id", postId)
      .eq("anon_id", anonId);

    if (error) throw error;
    return;
  }

  const { error } = await supabase.from("votes").upsert(
    {
      post_id: postId,
      anon_id: anonId,
      value: direction,
    },
    { onConflict: "post_id,anon_id" },
  );

  if (error) throw error;
}

/** Net score change when moving from currentVote to nextVote. */
export function scoreDelta(
  currentVote: VoteValue | null,
  nextVote: VoteValue | null,
): number {
  return (nextVote ?? 0) - (currentVote ?? 0);
}
