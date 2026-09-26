import {
  animalNameFromAnonId,
  resolveAvatar,
} from "@/lib/avatar";

/** Stable avatar fill from anon_id (badge color). */
export function avatarColorFromAnonId(anonId: string | null | undefined): string {
  if (!anonId) return "#6A6A7A";
  return resolveAvatar(anonId).color;
}

/** Friendly animal label like "the fox". Never returns null/empty. */
export function formatAnonHandle(anonId: string | null | undefined): string {
  if (!anonId) return "the stranger";
  return animalNameFromAnonId(anonId);
}
