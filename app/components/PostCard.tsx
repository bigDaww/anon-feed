"use client";

import { useEffect, useState } from "react";
import AvatarBadge from "@/app/components/AvatarBadge";
import CommentSection from "@/app/components/CommentSection";
import RoomBanner from "@/app/components/RoomBanner";
import { animalNameFromAnonId } from "@/lib/avatar";
import { friendlyWriteError, submitReport } from "@/lib/moderation";

export type PostCardProps = {
  id: string;
  anonId: string;
  content: string;
  createdAt: string;
  voteScore: number;
  commentCount: number;
  now?: number;
  userVote?: 1 | -1 | null;
  voting?: boolean;
  highlighted?: boolean;
  defaultCommentsOpen?: boolean;
  roomId?: string | null;
  authorName?: string;
  authorAvatar?: string;
  onUpvote?: () => void;
  onDownvote?: () => void;
  onCommentAdded?: () => void;
};

const EXPIRY_MS = 24 * 60 * 60 * 1000;

function getExpiryRemaining(createdAt: string, now: number): number {
  const expiresAt = new Date(createdAt).getTime() + EXPIRY_MS;
  return Math.max(0, expiresAt - now);
}

function formatTimeLeft(ms: number): string {
  if (ms <= 0) return "Expired";
  const totalSec = Math.floor(ms / 1000);
  const hours = Math.floor(totalSec / 3600);
  const minutes = Math.floor((totalSec % 3600) / 60);
  if (hours > 0) return `${hours}h left`;
  if (minutes > 0) return `${minutes}m left`;
  return "<1m left";
}

function ChevronUpIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M12 8l6 6H6l6-6z" />
    </svg>
  );
}

function ChevronDownIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M12 16l-6-6h12l-6 6z" />
    </svg>
  );
}

function CommentIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      aria-hidden
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M8 10h8M8 14h5m7-3a8.5 8.5 0 11-3.2-6.6L21 3v5h-5"
      />
    </svg>
  );
}

export default function PostCard({
  id,
  anonId,
  content,
  createdAt,
  voteScore,
  commentCount,
  now = Date.now(),
  userVote = null,
  voting = false,
  highlighted = false,
  defaultCommentsOpen = false,
  roomId = null,
  authorName,
  authorAvatar,
  onUpvote,
  onDownvote,
  onCommentAdded,
}: PostCardProps) {
  const [commentsOpen, setCommentsOpen] = useState(defaultCommentsOpen);
  const [reporting, setReporting] = useState(false);
  const [reportMsg, setReportMsg] = useState<string | null>(null);

  useEffect(() => {
    if (defaultCommentsOpen) setCommentsOpen(true);
  }, [defaultCommentsOpen]);

  // Prefer fields frozen at create time; fall back for legacy rows.
  const handle = authorName?.trim() || animalNameFromAnonId(anonId);
  const remaining = getExpiryRemaining(createdAt, now);
  const timeLeft = formatTimeLeft(remaining);
  const remainingRatio = Math.min(1, Math.max(0, remaining / EXPIRY_MS));

  async function handleReport() {
    if (reporting) return;
    setReporting(true);
    setReportMsg(null);
    try {
      await submitReport({ targetType: "post", targetId: id });
      setReportMsg("Reported");
    } catch (err) {
      setReportMsg(
        err instanceof Error
          ? friendlyWriteError(err.message)
          : "Could not report",
      );
    } finally {
      setReporting(false);
    }
  }

  return (
    <article
      id={`post-${id}`}
      className={`overflow-hidden rounded-lg border bg-white shadow-[0_0_0_1px_rgba(0,0,0,0.04)] transition ring-offset-2 ${
        highlighted
          ? "border-ol-ink ring-2 ring-ol-ink/20"
          : "border-ol-border"
      }`}
    >
      <div
        className="h-[3px] bg-ol-coral transition-[width] duration-700 ease-linear"
        style={{ width: `${remainingRatio * 100}%` }}
        aria-hidden
      />

      <div className="flex items-start gap-2.5 px-4 pb-1 pt-3">
        <AvatarBadge
          anonId={anonId}
          size={36}
          className="mt-0.5"
          color={authorAvatar}
          label={handle}
        />
        <div className="min-w-0 flex-1 pt-0.5">
          <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
            <p className="truncate font-mono text-sm font-semibold leading-5 text-ol-ink">
              {handle}
            </p>
            <p
              className="font-mono text-xs leading-4 text-ol-faint"
              title="Time until this post expires"
            >
              {timeLeft}
            </p>
          </div>
          <p className="font-mono text-xs leading-4 text-ol-muted">Anonymous</p>
        </div>
      </div>

      <div className="px-4 pb-3 pt-2">
        <p className="whitespace-pre-wrap break-words font-voice text-[15px] leading-[1.5] text-ol-ink">
          {content}
        </p>
      </div>

      {roomId ? <RoomBanner roomId={roomId} /> : null}

      <div className="flex items-center gap-1 border-t border-ol-border px-2 py-1">
        <div className="flex items-center">
          <button
            type="button"
            onClick={onUpvote}
            disabled={voting}
            aria-label="Upvote"
            aria-pressed={userVote === 1}
            className={`inline-flex h-8 w-8 items-center justify-center rounded-md transition-colors hover:bg-black/[0.06] disabled:opacity-50 ${
              userVote === 1 ? "bg-neutral-100 text-ol-ink" : "text-ol-muted"
            }`}
          >
            <ChevronUpIcon className="h-5 w-5" />
          </button>
          <span
            className={`min-w-[1.25rem] text-center font-mono text-xs font-semibold tabular-nums ${
              voteScore > 0
                ? "text-ol-ink"
                : voteScore < 0
                  ? "text-ol-danger"
                  : "text-ol-muted"
            }`}
          >
            {voteScore}
          </span>
          <button
            type="button"
            onClick={onDownvote}
            disabled={voting}
            aria-label="Downvote"
            aria-pressed={userVote === -1}
            className={`inline-flex h-8 w-8 items-center justify-center rounded-md transition-colors hover:bg-black/[0.06] disabled:opacity-50 ${
              userVote === -1
                ? "bg-neutral-100 text-ol-danger"
                : "text-ol-muted"
            }`}
          >
            <ChevronDownIcon className="h-5 w-5" />
          </button>
        </div>

        <button
          type="button"
          onClick={() => setCommentsOpen((open) => !open)}
          aria-expanded={commentsOpen}
          aria-controls={`comments-${id}`}
          className={`inline-flex h-8 items-center gap-1.5 rounded-md px-2 transition-colors hover:bg-black/[0.06] ${
            commentsOpen ? "bg-black/[0.04] text-ol-ink" : "text-ol-muted"
          }`}
        >
          <CommentIcon className="h-4 w-4" />
          <span className="font-mono text-xs font-semibold tabular-nums">
            {commentCount}
          </span>
          <span className="text-xs">
            {commentCount === 1 ? "comment" : "comments"}
          </span>
        </button>

        <button
          type="button"
          onClick={() => void handleReport()}
          disabled={reporting || reportMsg === "Reported"}
          className="ml-auto inline-flex h-8 items-center rounded-md px-2 text-xs text-ol-faint transition hover:bg-black/[0.06] hover:text-ol-muted disabled:opacity-60"
        >
          {reportMsg ?? (reporting ? "…" : "Report")}
        </button>
      </div>

      {commentsOpen ? (
        <div id={`comments-${id}`}>
          <CommentSection postId={id} onCommentAdded={onCommentAdded} />
        </div>
      ) : null}
    </article>
  );
}
