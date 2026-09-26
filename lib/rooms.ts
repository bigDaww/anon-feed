import { getAnonId } from "@/lib/anon";
import { friendlyWriteError, validateContent } from "@/lib/moderation";
import { supabase } from "@/lib/supabase";

export type ConversationRoom = {
  id: string;
  post_id: string;
  active: boolean;
  created_at: string;
};

export type RoomMessage = {
  id: string;
  room_id: string;
  user_id: string;
  message: string;
  created_at: string;
};

export type RoomMember = {
  room_id: string;
  user_id: string;
  joined_at: string;
};

export async function fetchRoomByPostId(
  postId: string,
): Promise<ConversationRoom | null> {
  const { data, error } = await supabase
    .from("conversation_rooms")
    .select("id, post_id, active, created_at")
    .eq("post_id", postId)
    .maybeSingle();

  if (error) throw error;
  return (data as ConversationRoom | null) ?? null;
}

export async function fetchRoomsForPosts(
  postIds: string[],
): Promise<Record<string, ConversationRoom>> {
  if (postIds.length === 0) return {};
  const { data, error } = await supabase
    .from("conversation_rooms")
    .select("id, post_id, active, created_at")
    .in("post_id", postIds);

  if (error) throw error;
  const map: Record<string, ConversationRoom> = {};
  for (const row of (data ?? []) as ConversationRoom[]) {
    map[row.post_id] = row;
  }
  return map;
}

export async function joinRoom(roomId: string): Promise<void> {
  const userId = getAnonId();
  const { error } = await supabase.from("room_members").upsert(
    { room_id: roomId, user_id: userId },
    { onConflict: "room_id,user_id" },
  );
  if (error) throw error;
}

export async function leaveRoom(roomId: string): Promise<void> {
  const userId = getAnonId();
  const { error } = await supabase
    .from("room_members")
    .delete()
    .eq("room_id", roomId)
    .eq("user_id", userId);
  if (error) throw error;
}

export async function fetchRoom(roomId: string): Promise<ConversationRoom | null> {
  const { data, error } = await supabase
    .from("conversation_rooms")
    .select("id, post_id, active, created_at")
    .eq("id", roomId)
    .maybeSingle();
  if (error) throw error;
  return (data as ConversationRoom | null) ?? null;
}

export async function fetchMemberCount(roomId: string): Promise<number> {
  const { count, error } = await supabase
    .from("room_members")
    .select("*", { count: "exact", head: true })
    .eq("room_id", roomId);
  if (error) throw error;
  return count ?? 0;
}

export async function fetchMembers(roomId: string): Promise<RoomMember[]> {
  const { data, error } = await supabase
    .from("room_members")
    .select("room_id, user_id, joined_at")
    .eq("room_id", roomId)
    .order("joined_at", { ascending: true });
  if (error) throw error;
  return (data ?? []) as RoomMember[];
}

export async function fetchMessages(roomId: string): Promise<RoomMessage[]> {
  const { data, error } = await supabase
    .from("room_messages")
    .select("id, room_id, user_id, message, created_at")
    .eq("room_id", roomId)
    .order("created_at", { ascending: true })
    .limit(200);
  if (error) throw error;
  return (data ?? []) as RoomMessage[];
}

export async function sendMessage(roomId: string, message: string): Promise<void> {
  const invalid = validateContent(message);
  if (invalid) throw new Error(invalid);
  const { error } = await supabase.from("room_messages").insert({
    room_id: roomId,
    user_id: getAnonId(),
    message: message.trim(),
  });
  if (error) throw new Error(friendlyWriteError(error.message));
}

export async function isMember(roomId: string, userId?: string): Promise<boolean> {
  const uid = userId ?? getAnonId();
  const { data, error } = await supabase
    .from("room_members")
    .select("user_id")
    .eq("room_id", roomId)
    .eq("user_id", uid)
    .maybeSingle();
  if (error) throw error;
  return !!data;
}
