"use client";

import { FormEvent, useState } from "react";
import { refreshTopStories } from "@/app/components/layout/TopStories";
import {
  friendlyWriteError,
  MAX_CONTENT_LENGTH,
  validateContent,
} from "@/lib/moderation";
import { supabase } from "@/lib/supabase";
import { authorFieldsForCurrentUser } from "@/lib/votes";

type ComposeBoxProps = {
  onPosted: () => void;
};

export default function ComposeBox({ onPosted }: ComposeBoxProps) {
  const [content, setContent] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (submitting) return;

    const invalid = validateContent(content);
    if (invalid) {
      setError(invalid);
      return;
    }

    setSubmitting(true);
    setError(null);

    const author = authorFieldsForCurrentUser();
    const author_name =
      (author.author_name && author.author_name.trim()) || "the stranger";
    const author_avatar =
      (author.author_avatar && author.author_avatar.trim()) || "#6A6A7A";

    const { error: insertError } = await supabase.from("posts").insert({
      anon_id: author.anon_id,
      author_name,
      author_avatar,
      content: content.trim(),
      image_url: null,
      upvotes: 0,
      downvotes: 0,
    });

    setSubmitting(false);

    if (insertError) {
      setError(friendlyWriteError(insertError.message));
      return;
    }

    setContent("");
    onPosted();
    refreshTopStories();
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-lg border border-[#e0e0e0] bg-white p-4 shadow-[0_0_0_1px_rgba(0,0,0,0.04)]"
    >
      <label htmlFor="compose" className="sr-only">
        Write a post
      </label>
      <textarea
        id="compose"
        rows={3}
        value={content}
        onChange={(e) => setContent(e.target.value.slice(0, MAX_CONTENT_LENGTH))}
        maxLength={MAX_CONTENT_LENGTH}
        placeholder="Share something anonymously…"
        disabled={submitting}
        className="w-full resize-none rounded-md border border-ol-border bg-neutral-50 px-3 py-2.5 font-voice text-[15px] leading-[1.5] text-ol-ink placeholder:font-sans placeholder:text-ol-faint outline-none transition focus:border-ol-ink focus:bg-white focus:ring-1 focus:ring-ol-ink/20 disabled:opacity-60"
      />

      {error ? (
        <p className="mt-2 text-xs text-ol-danger" role="alert">
          {error}
        </p>
      ) : null}

      <div className="mt-3 flex items-center justify-between gap-2">
        <span className="font-mono text-[11px] text-ol-faint">
          {content.length}/{MAX_CONTENT_LENGTH}
        </span>
        <button
          type="submit"
          disabled={submitting || !content.trim()}
          className="rounded-full bg-ol-coral px-4 py-1.5 text-sm font-semibold text-white transition hover:bg-ol-coral-hover disabled:cursor-not-allowed disabled:bg-ol-coral/50"
        >
          {submitting ? "Posting…" : "Post"}
        </button>
      </div>
    </form>
  );
}
