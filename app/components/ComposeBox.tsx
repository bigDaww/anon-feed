"use client";

import { FormEvent, useState } from "react";
import { getAnonId } from "@/lib/anon";
import { supabase } from "@/lib/supabase";

type ComposeBoxProps = {
  onPosted: () => void;
};

export default function ComposeBox({ onPosted }: ComposeBoxProps) {
  const [content, setContent] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const trimmed = content.trim();
    if (!trimmed || submitting) return;

    setSubmitting(true);
    setError(null);

    const { error: insertError } = await supabase.from("posts").insert({
      anon_id: getAnonId(),
      content: trimmed,
    });

    setSubmitting(false);

    if (insertError) {
      setError(insertError.message);
      return;
    }

    setContent("");
    onPosted();
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
        onChange={(e) => setContent(e.target.value)}
        placeholder="Share something anonymously…"
        disabled={submitting}
        className="w-full resize-none rounded-md border border-[#e0e0e0] bg-[#f4f2ee] px-3 py-2.5 text-sm leading-[1.4] text-[rgba(0,0,0,0.9)] placeholder:text-[rgba(0,0,0,0.45)] outline-none transition focus:border-[#0a66c2] focus:bg-white focus:ring-1 focus:ring-[#0a66c2] disabled:opacity-60"
      />

      {error ? (
        <p className="mt-2 text-xs text-[#cc1016]" role="alert">
          {error}
        </p>
      ) : null}

      <div className="mt-3 flex justify-end">
        <button
          type="submit"
          disabled={submitting || !content.trim()}
          className="rounded-full bg-[#0a66c2] px-4 py-1.5 text-sm font-semibold text-white transition hover:bg-[#004182] disabled:cursor-not-allowed disabled:bg-[#0a66c2]/60"
        >
          {submitting ? "Posting…" : "Post"}
        </button>
      </div>
    </form>
  );
}
