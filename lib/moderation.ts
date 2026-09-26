import { getAnonId } from "@/lib/anon";
import { supabase } from "@/lib/supabase";

export const MAX_CONTENT_LENGTH = 2000;

export type ReportTargetType = "post" | "comment" | "room_message" | "profile";

export function validateContent(content: string): string | null {
  const trimmed = content.trim();
  if (!trimmed) return "Write something first.";
  if (content.length > MAX_CONTENT_LENGTH) {
    return `Keep it under ${MAX_CONTENT_LENGTH} characters.`;
  }
  if (/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/.test(content)) {
    return "Content contains invalid characters.";
  }
  return null;
}

export function friendlyWriteError(message: string): string {
  const m = message.toLowerCase();
  if (m.includes("rate limit")) {
    return "You're posting too fast. Wait a bit and try again.";
  }
  if (m.includes("account restricted") || m.includes("banned")) {
    return "This identity has been restricted for abuse.";
  }
  if (m.includes("content not allowed")) {
    return "That content isn't allowed.";
  }
  if (m.includes("join the room")) {
    return "Join the room before chatting.";
  }
  return message || "Something went wrong.";
}

export async function submitReport(input: {
  targetType: ReportTargetType;
  targetId: string;
  reason?: string;
  details?: string;
}): Promise<void> {
  const reporter = getAnonId();
  const { error } = await supabase.rpc("submit_moderation_report", {
    p_reporter: reporter,
    p_target_type: input.targetType,
    p_target_id: input.targetId,
    p_reason: input.reason ?? "abuse",
    p_details: input.details ?? "",
  });
  if (error) throw new Error(friendlyWriteError(error.message));
}
