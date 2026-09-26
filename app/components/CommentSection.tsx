"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import AvatarBadge from "@/app/components/AvatarBadge";
import { animalNameFromAnonId } from "@/lib/avatar";
import { getAnonId } from "@/lib/anon";
import {
  friendlyWriteError,
  MAX_CONTENT_LENGTH,
  validateContent,
} from "@/lib/moderation";
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
    if (submitting) return;

    const invalid = validateContent(draft);
    if (invalid) {
      setError(invalid);
      return;
    }

    setSubmitting(true);
    setError(null);

    const anonId = getAnonId();
    const { error: insertError } = await supabase.from("comments").insert({
      post_id: postId,
      anon_id: anonId,
      author_name: animalNameFromAnonId(anonId),
      content: draft.trim(),
    });

    setSubmitting(false);

    if (insertError) {
      setError(friendlyWriteError(insertError.message));
      return;
    }

    setDraft("");
    await refreshComments();
    onCommentAdded?.();
  }

  return (
    <div className="border-t border-ol-border bg-neutral-50 px-4 py-3">
      <div className="ml-12 space-y-3">
        {loading ? (
          <p className="text-xs text-ol-muted">Loading comments…</p>
        ) : null}

        {error ? (
          <p className="text-xs text-ol-danger" role="alert">
            {error}
          </p>
        ) : null}

        {!loading && !error && comments.length === 0 ? (
          <p className="text-xs text-ol-muted">No comments yet.</p>
        ) : null}

        <ul className="space-y-3">
          {comments.map((comment) => (
            <li key={comment.id} className="flex gap-2">
              <AvatarBadge anonId={comment.anon_id} size={28} className="mt-0.5" />
              <div className="min-w-0 flex-1 rounded-lg bg-white px-2.5 py-1.5">
                <div className="flex flex-wrap items-baseline gap-x-1.5">
                  <span className="font-mono text-xs font-semibold text-ol-ink">
                    {animalNameFromAnonId(comment.anon_id)}
                  </span>
                  <span className="font-mono text-[11px] text-ol-faint">
                    · {formatRelativeTime(comment.created_at)}
                  </span>
                </div>
                <p className="mt-0.5 whitespace-pre-wrap break-words font-voice text-xs leading-[1.5] text-ol-ink">
                  {comment.content}
                </p>
              </div>
            </li>
          ))}
        </ul>

        <form onSubmit={handleReply} className="flex items-start gap-2">
          <AvatarBadge anonId={viewerAnonId} size={28} className="mt-0.5" />
          <div className="flex min-w-0 flex-1 items-center gap-2">
            <label htmlFor={`reply-${postId}`} className="sr-only">
              Write a comment
            </label>
            <input
              id={`reply-${postId}`}
              type="text"
              value={draft}
              onChange={(e) =>
                setDraft(e.target.value.slice(0, MAX_CONTENT_LENGTH))
              }
              maxLength={MAX_CONTENT_LENGTH}
              placeholder="Add a comment…"
              disabled={submitting}
              className="h-8 min-w-0 flex-1 rounded-full border border-ol-border bg-white px-3 font-voice text-xs text-ol-ink outline-none placeholder:font-sans placeholder:text-ol-faint focus:border-ol-ink focus:ring-1 focus:ring-ol-ink/20 disabled:opacity-60"
            />
            <button
              type="submit"
              disabled={submitting || !draft.trim()}
              className="h-8 shrink-0 rounded-full bg-ol-primary px-3 text-xs font-semibold text-white transition hover:bg-ol-primary-hover disabled:cursor-not-allowed disabled:bg-ol-primary/50"
            >
              {submitting ? "…" : "Reply"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
