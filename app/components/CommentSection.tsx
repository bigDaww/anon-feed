"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import {
  avatarColorFromAnonId,
  formatAnonHandle,
} from "@/lib/anon-display";
import { getAnonId } from "@/lib/anon";
import { supabase } from "@/lib/supabase";

type Comment = {
  id: string;
  anon_id: string;
  content: string;
  created_at: string;
};

type CommentSectionProps = {
  postId: string;
  onCommentAdded?: () => void;
};

function formatRelativeTime(iso: string, now = Date.now()): string {
  const diffMs = Math.max(0, now - new Date(iso).getTime());
  const seconds = Math.floor(diffMs / 1000);
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  return `${days}d`;
}

async function fetchComments(postId: string): Promise<Comment[]> {
  const { data, error } = await supabase
    .from("comments")
    .select("id, anon_id, content, created_at")
    .eq("post_id", postId)
    .order("created_at", { ascending: true });

  if (error) throw error;
  return (data ?? []) as Comment[];
}

export default function CommentSection({
  postId,
  onCommentAdded,
}: CommentSectionProps) {
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [viewerAnonId, setViewerAnonId] = useState<string | null>(null);

  const refreshComments = useCallback(async () => {
    try {
      setError(null);
      const next = await fetchComments(postId);
      setComments(next);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load comments");
    } finally {
      setLoading(false);
    }
  }, [postId]);

  useEffect(() => {
    setViewerAnonId(getAnonId());
    setLoading(true);
    void refreshComments();
  }, [refreshComments]);

  async function handleReply(e: FormEvent) {
    e.preventDefault();
    const trimmed = draft.trim();
    if (!trimmed || submitting) return;

    setSubmitting(true);
    setError(null);

    const { error: insertError } = await supabase.from("comments").insert({
      post_id: postId,
      anon_id: getAnonId(),
      author_name: formatAnonHandle(getAnonId()),
      content: trimmed,
    });

    setSubmitting(false);

    if (insertError) {
      setError(insertError.message);
      return;
    }

    setDraft("");
    await refreshComments();
    onCommentAdded?.();
  }

  const replyAvatarColor = viewerAnonId
    ? avatarColorFromAnonId(viewerAnonId)
    : "#cfcfcf";

  return (
    <div className="border-t border-[#e0e0e0] bg-[#f9fafb] px-4 py-3">
      <div className="ml-12 space-y-3">
        {loading ? (
          <p className="text-xs text-[rgba(0,0,0,0.6)]">Loading comments…</p>
        ) : null}

        {error ? (
          <p className="text-xs text-[#cc1016]" role="alert">
            {error}
          </p>
        ) : null}

        {!loading && !error && comments.length === 0 ? (
          <p className="text-xs text-[rgba(0,0,0,0.6)]">No comments yet.</p>
        ) : null}

        <ul className="space-y-3">
          {comments.map((comment) => (
            <li key={comment.id} className="flex gap-2">
              <div
                className="mt-0.5 h-8 w-8 shrink-0 rounded-full"
                style={{
                  backgroundColor: avatarColorFromAnonId(comment.anon_id),
                }}
                aria-hidden
              />
              <div className="min-w-0 flex-1 rounded-lg bg-white px-2.5 py-1.5">
                <div className="flex flex-wrap items-baseline gap-x-1.5">
                  <span className="text-xs font-semibold text-[rgba(0,0,0,0.9)]">
                    {formatAnonHandle(comment.anon_id)}
                  </span>
                  <span className="text-[11px] text-[rgba(0,0,0,0.55)]">
                    · {formatRelativeTime(comment.created_at)}
                  </span>
                </div>
                <p className="mt-0.5 whitespace-pre-wrap break-words text-xs leading-[1.4] text-[rgba(0,0,0,0.9)]">
                  {comment.content}
                </p>
              </div>
            </li>
          ))}
        </ul>

        <form onSubmit={handleReply} className="flex items-start gap-2">
          <div
            className="mt-0.5 h-8 w-8 shrink-0 rounded-full"
            style={{ backgroundColor: replyAvatarColor }}
            aria-hidden
          />
          <div className="flex min-w-0 flex-1 items-center gap-2">
            <label htmlFor={`reply-${postId}`} className="sr-only">
              Write a comment
            </label>
            <input
              id={`reply-${postId}`}
              type="text"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder="Add a comment…"
              disabled={submitting}
              className="h-8 min-w-0 flex-1 rounded-full border border-[#e0e0e0] bg-white px-3 text-xs text-[rgba(0,0,0,0.9)] outline-none placeholder:text-[rgba(0,0,0,0.45)] focus:border-[#0a66c2] focus:ring-1 focus:ring-[#0a66c2] disabled:opacity-60"
            />
            <button
              type="submit"
              disabled={submitting || !draft.trim()}
              className="h-8 shrink-0 rounded-full bg-[#0a66c2] px-3 text-xs font-semibold text-white transition hover:bg-[#004182] disabled:cursor-not-allowed disabled:bg-[#0a66c2]/60"
            >
              {submitting ? "…" : "Reply"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
