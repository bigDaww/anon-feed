"use client";

import { useCallback, useEffect, useState } from "react";
import ComposeBox from "@/app/components/ComposeBox";
import PostCard from "@/app/components/PostCard";
import { getAnonId } from "@/lib/anon";
import { supabase } from "@/lib/supabase";
import { castVote, scoreDelta, type VoteValue } from "@/lib/votes";

type FeedPost = {
  id: string;
  anon_id: string;
  content: string;
  created_at: string;
  voteScore: number;
  commentCount: number;
  userVote: VoteValue | null;
};

type VoteRow = {
  value: number;
  anon_id: string;
};

type PostRow = {
  id: string;
  anon_id: string;
  content: string;
  created_at: string;
  comments: { count: number }[] | null;
  votes: VoteRow[] | null;
};

const DAY_MS = 24 * 60 * 60 * 1000;
const COUNTDOWN_TICK_MS = 60_000;
const FEED_REFETCH_MS = 3 * 60_000;

function toUserVote(value: number | undefined): VoteValue | null {
  return value === 1 || value === -1 ? value : null;
}

async function fetchFeedPosts(viewerAnonId: string): Promise<FeedPost[]> {
  const cutoff = new Date(Date.now() - DAY_MS).toISOString();

  const { data, error } = await supabase
    .from("posts")
    .select(
      "id, anon_id, content, created_at, comments(count), votes(value, anon_id)",
    )
    .gt("created_at", cutoff)
    .order("created_at", { ascending: false });

  if (error) throw error;

  return ((data ?? []) as PostRow[]).map((row) => {
    const votes = row.votes ?? [];
    return {
      id: row.id,
      anon_id: row.anon_id,
      content: row.content,
      created_at: row.created_at,
      commentCount: row.comments?.[0]?.count ?? 0,
      voteScore: votes.reduce((sum, v) => sum + v.value, 0),
      userVote: toUserVote(
        votes.find((v) => v.anon_id === viewerAnonId)?.value,
      ),
    };
  });
}

export default function FeedPage() {
  const [posts, setPosts] = useState<FeedPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const [votingPostIds, setVotingPostIds] = useState<Set<string>>(
    () => new Set(),
  );

  const refreshFeed = useCallback(async () => {
    try {
      setError(null);
      const next = await fetchFeedPosts(getAnonId());
      setPosts(next);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load feed");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refreshFeed();
  }, [refreshFeed]);

  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), COUNTDOWN_TICK_MS);
    return () => window.clearInterval(id);
  }, []);

  useEffect(() => {
    const id = window.setInterval(() => {
      void refreshFeed();
    }, FEED_REFETCH_MS);
    return () => window.clearInterval(id);
  }, [refreshFeed]);

  const handleVote = useCallback(async (postId: string, direction: VoteValue) => {
    let previousVote: VoteValue | null = null;
    let nextVote: VoteValue | null = null;
    let accepted = false;
    let found = false;

    setVotingPostIds((prev) => {
      if (prev.has(postId)) return prev;
      accepted = true;
      return new Set(prev).add(postId);
    });

    if (!accepted) return;

    setPosts((prev) => {
      const post = prev.find((p) => p.id === postId);
      if (!post) return prev;

      found = true;
      previousVote = post.userVote;
      nextVote = previousVote === direction ? null : direction;

      return prev.map((p) =>
        p.id === postId
          ? {
              ...p,
              userVote: nextVote,
              voteScore: p.voteScore + scoreDelta(previousVote, nextVote),
            }
          : p,
      );
    });

    if (!found) {
      setVotingPostIds((prev) => {
        const next = new Set(prev);
        next.delete(postId);
        return next;
      });
      return;
    }

    try {
      await castVote(postId, direction, previousVote);
    } catch {
      setPosts((prev) =>
        prev.map((p) =>
          p.id === postId
            ? {
                ...p,
                userVote: previousVote,
                voteScore: p.voteScore + scoreDelta(nextVote, previousVote),
              }
            : p,
        ),
      );
    } finally {
      setVotingPostIds((prev) => {
        const next = new Set(prev);
        next.delete(postId);
        return next;
      });
    }
  }, []);


  return (
    <main className="min-h-screen bg-[#f3f2ef] text-zinc-900">
      <div className="mx-auto max-w-[552px] px-4 py-8">
        <header className="mb-4">
          <h1 className="text-xl font-semibold tracking-tight text-[rgba(0,0,0,0.9)]">
            anon-feed
          </h1>
          <p className="mt-1 text-sm text-[rgba(0,0,0,0.6)]">
            Anonymous posts, no accounts.
          </p>
        </header>

        <div className="space-y-2">
          <ComposeBox onPosted={refreshFeed} />

          <section aria-label="Feed" className="space-y-2">
            {loading ? (
              <p className="rounded-lg border border-[#e0e0e0] bg-white px-4 py-6 text-center text-sm text-[rgba(0,0,0,0.6)]">
                Loading feed…
              </p>
            ) : null}

            {error ? (
              <p
                className="rounded-lg border border-[#e0e0e0] bg-white px-4 py-6 text-center text-sm text-[#cc1016]"
                role="alert"
              >
                {error}
              </p>
            ) : null}

            {!loading && !error && posts.length === 0 ? (
              <p className="rounded-lg border border-[#e0e0e0] bg-white px-4 py-6 text-center text-sm text-[rgba(0,0,0,0.6)]">
                No posts yet. Be the first.
              </p>
            ) : null}

            {posts.map((post) => (
              <PostCard
                key={post.id}
                id={post.id}
                anonId={post.anon_id}
                content={post.content}
                createdAt={post.created_at}
                voteScore={post.voteScore}
                commentCount={post.commentCount}
                userVote={post.userVote}
                now={now}
                voting={votingPostIds.has(post.id)}
                onUpvote={() => void handleVote(post.id, 1)}
                onDownvote={() => void handleVote(post.id, -1)}
                onCommentAdded={() =>
                  setPosts((prev) =>
                    prev.map((p) =>
                      p.id === post.id
                        ? { ...p, commentCount: p.commentCount + 1 }
                        : p,
                    ),
                  )
                }
              />
            ))}
          </section>
        </div>
      </div>
    </main>
  );
}
