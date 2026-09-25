"use client";

import { useState } from "react";
import CommentSection from "@/app/components/CommentSection";
import {
  avatarColorFromAnonId,
  formatAnonHandle,
} from "@/lib/anon-display";

export type PostCardProps = {
  id: string;
  anonId: string;
  content: string;
  createdAt: string;
  voteScore: number;
  commentCount: number;
  /** Parent-driven clock tick (e.g. updated every 60s) for live countdown. */
  now?: number;
  userVote?: 1 | -1 | null;
  voting?: boolean;
  onUpvote?: () => void;
  onDownvote?: () => void;
  onCommentAdded?: () => void;
};

const EXPIRY_MS = 24 * 60 * 60 * 1000;

function getExpiryRemaining(createdAt: string, now: number): number {
  const expiresAt = new Date(createdAt).getTime() + EXPIRY_MS;
  return Math.max(0, expiresAt - now);
}

function formatCountdown(ms: number): string {
  if (ms <= 0) return "Expired";

  const totalSec = Math.floor(ms / 1000);
  const hours = Math.floor(totalSec / 3600);
  const minutes = Math.floor((totalSec % 3600) / 60);

  if (hours > 0) {
    return `${hours}h ${minutes.toString().padStart(2, "0")}m`;
  }
  if (minutes > 0) {
    return `${minutes}m`;
  }
  return "<1m";
}

function ChevronUpIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden
    >
      <path d="M12 8l6 6H6l6-6z" />
    </svg>
  );
}

function ChevronDownIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden
    >
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

function ClockIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      aria-hidden
    >
      <circle cx="12" cy="12" r="9" />
      <path strokeLinecap="round" d="M12 7v5l3 2" />
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
  onUpvote,
  onDownvote,
  onCommentAdded,
}: PostCardProps) {
  const [commentsOpen, setCommentsOpen] = useState(false);
  const handle = formatAnonHandle(anonId);
  const avatarColor = avatarColorFromAnonId(anonId);
  const countdown = formatCountdown(getExpiryRemaining(createdAt, now));
  const expired = countdown === "Expired";

  return (
    <article className="rounded-lg border border-[#e0e0e0] bg-white shadow-[0_0_0_1px_rgba(0,0,0,0.04)]">
      {/* Header — LinkedIn density */}
      <div className="flex items-start gap-2 px-4 pb-1 pt-3">
        <div
          className="h-12 w-12 shrink-0 rounded-full"
          style={{ backgroundColor: avatarColor }}
          aria-hidden
        />
        <div className="min-w-0 pt-0.5">
          <p className="truncate text-sm font-semibold leading-5 text-[rgba(0,0,0,0.9)]">
            {handle}
          </p>
          <p className="text-xs leading-4 text-[rgba(0,0,0,0.6)]">Anonymous</p>
        </div>
      </div>

      {/* Body */}
      <div className="px-4 pb-3 pt-2">
        <p className="whitespace-pre-wrap break-words text-sm leading-[1.4] text-[rgba(0,0,0,0.9)]">
          {content}
        </p>
      </div>

      {/* Footer */}
      <div className="flex items-center gap-1 border-t border-[#e0e0e0] px-2 py-1">
        <div className="flex items-center">
          <button
            type="button"
            onClick={onUpvote}
            disabled={voting}
            aria-label="Upvote"
            aria-pressed={userVote === 1}
            className={`inline-flex h-8 w-8 items-center justify-center rounded-md transition-colors hover:bg-black/[0.06] disabled:opacity-50 ${
              userVote === 1
                ? "bg-[#e8f3ff] text-[#0a66c2]"
                : "text-[rgba(0,0,0,0.6)]"
            }`}
          >
            <ChevronUpIcon className="h-5 w-5" />
          </button>
          <span
            className={`min-w-[1.25rem] text-center text-xs font-semibold tabular-nums ${
              voteScore > 0
                ? "text-[#0a66c2]"
                : voteScore < 0
                  ? "text-[#cc1016]"
                  : "text-[rgba(0,0,0,0.6)]"
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
                ? "bg-[#fce8e8] text-[#cc1016]"
                : "text-[rgba(0,0,0,0.6)]"
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
            commentsOpen
              ? "bg-black/[0.04] text-[#0a66c2]"
              : "text-[rgba(0,0,0,0.6)]"
          }`}
        >
          <CommentIcon className="h-4 w-4" />
          <span className="text-xs font-semibold tabular-nums">
            {commentCount}
          </span>
          <span className="text-xs">
            {commentCount === 1 ? "comment" : "comments"}
          </span>
        </button>

        <div
          className={`ml-auto inline-flex h-8 items-center gap-1.5 rounded-md px-2 ${
            expired ? "text-[#cc1016]" : "text-[rgba(0,0,0,0.6)]"
          }`}
          title="Time until this post expires"
        >
          <ClockIcon className="h-4 w-4" />
          <span className="text-xs font-semibold tabular-nums">
            {expired ? "Expired" : countdown}
          </span>
        </div>
      </div>

      {commentsOpen ? (
        <div id={`comments-${id}`}>
          <CommentSection postId={id} onCommentAdded={onCommentAdded} />
        </div>
      ) : null}
    </article>
  );
}
