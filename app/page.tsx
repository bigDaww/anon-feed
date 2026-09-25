"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import ComposeBox from "@/app/components/ComposeBox";
import AppShell from "@/app/components/layout/AppShell";
import TopStories, {
  refreshTopStories,
} from "@/app/components/layout/TopStories";
import PostCard from "@/app/components/PostCard";
import { getAnonId } from "@/lib/anon";
import { onOpenPost } from "@/lib/post-focus";
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
  value?: number;
  vote_type?: string;
  anon_id?: string;
  user_id?: string;
};

type PostRow = {
  id: string;
  anon_id: string;
  content: string;
  created_at: string;
  upvotes?: number | null;
  downvotes?: number | null;
  comments: { count: number }[] | null;
  votes: VoteRow[] | null;
};

const DAY_MS = 24 * 60 * 60 * 1000;
const COUNTDOWN_TICK_MS = 60_000;
const FEED_REFETCH_MS = 3 * 60_000;

function voteRowValue(v: VoteRow): VoteValue | null {
  if (v.value === 1 || v.value === -1) return v.value;
  if (v.vote_type === "up") return 1;
  if (v.vote_type === "down") return -1;
  return null;
}

function toUserVote(
  votes: VoteRow[],
  viewerAnonId: string,
): VoteValue | null {
  const mine = votes.find(
    (v) => v.user_id === viewerAnonId || v.anon_id === viewerAnonId,
  );
  return mine ? voteRowValue(mine) : null;
}

function mapPostRow(row: PostRow, viewerAnonId: string): FeedPost {
  const votes = row.votes ?? [];
  const fromCounts =
    typeof row.upvotes === "number" && typeof row.downvotes === "number"
      ? row.upvotes - row.downvotes
      : null;

  return {
    id: row.id,
    anon_id: row.anon_id,
    content: row.content,
    created_at: row.created_at,
    commentCount: row.comments?.[0]?.count ?? 0,
    voteScore:
      fromCounts ?? votes.reduce((sum, v) => sum + (voteRowValue(v) ?? 0), 0),
    userVote: toUserVote(votes, viewerAnonId),
  };
}

async function fetchFeedPosts(viewerAnonId: string): Promise<FeedPost[]> {
  const cutoff = new Date(Date.now() - DAY_MS).toISOString();

  const { data, error } = await supabase
    .from("posts")
    .select(
      "id, anon_id, content, created_at, upvotes, downvotes, comments(count), votes(value, vote_type, anon_id, user_id)",
    )
    .gt("created_at", cutoff)
    .order("created_at", { ascending: false });

  if (error) throw error;

  return ((data ?? []) as PostRow[]).map((row) =>
    mapPostRow(row, viewerAnonId),
  );
}

async function fetchPostById(
  postId: string,
  viewerAnonId: string,
): Promise<FeedPost | null> {
  const { data, error } = await supabase
    .from("posts")
    .select(
      "id, anon_id, content, created_at, upvotes, downvotes, comments(count), votes(value, vote_type, anon_id, user_id)",
    )
    .eq("id", postId)
    .maybeSingle();

  if (error) throw error;
  if (!data) return null;
  return mapPostRow(data as PostRow, viewerAnonId);
}

export default function FeedPage() {
  const [posts, setPosts] = useState<FeedPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const [votingPostIds, setVotingPostIds] = useState<Set<string>>(
    () => new Set(),
  );
  const [focusedPostId, setFocusedPostId] = useState<string | null>(null);
  const [voteError, setVoteError] = useState<string | null>(null);
  const postsRef = useRef(posts);
  postsRef.current = posts;
  const votingRef = useRef<Set<string>>(new Set());

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

  useEffect(() => {
    return onOpenPost((postId) => {
      void (async () => {
        setFocusedPostId(postId);

        if (!postsRef.current.some((p) => p.id === postId)) {
          try {
            const fetched = await fetchPostById(postId, getAnonId());
            if (fetched) {
              setPosts((prev) =>
                prev.some((p) => p.id === postId) ? prev : [fetched, ...prev],
              );
            }
          } catch {
            // ignore fetch errors for focus
          }
        }

        window.setTimeout(() => {
          document
            .getElementById(`post-${postId}`)
            ?.scrollIntoView({ behavior: "smooth", block: "center" });
        }, 100);

        window.setTimeout(() => setFocusedPostId(null), 4000);
      })();
    });
  }, []);

  const handleVote = useCallback(async (postId: string, direction: VoteValue) => {
    if (votingRef.current.has(postId)) return;

    const post = postsRef.current.find((p) => p.id === postId);
    if (!post) return;

    const previousVote = post.userVote;
    const nextVote: VoteValue | null =
      previousVote === direction ? null : direction;

    votingRef.current.add(postId);
    setVotingPostIds(new Set(votingRef.current));
    setVoteError(null);

    setPosts((prev) =>
      prev.map((p) =>
        p.id === postId
          ? {
              ...p,
              userVote: nextVote,
              voteScore: p.voteScore + scoreDelta(previousVote, nextVote),
            }
          : p,
      ),
    );

    try {
      await castVote(postId, direction, previousVote);
      refreshTopStories();
    } catch (err) {
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
      setVoteError(err instanceof Error ? err.message : "Vote failed");
    } finally {
      votingRef.current.delete(postId);
      setVotingPostIds(new Set(votingRef.current));
    }
  }, []);


  return (
    <AppShell>
      <div className="mx-auto w-full max-w-feed space-y-2">
        {/* Always visible on smaller screens; desktop uses the right rail */}
        <div className="xl:hidden">
          <TopStories compact />
        </div>

        <ComposeBox onPosted={refreshFeed} />

        {voteError ? (
          <p className="ol-card px-4 py-2 text-center text-xs text-ol-danger" role="alert">
            {voteError}
          </p>
        ) : null}

        <section aria-label="Feed" className="space-y-2">
          {loading ? (
            <p className="ol-card px-4 py-6 text-center text-sm text-ol-muted">
              Loading feed…
            </p>
          ) : null}

          {error ? (
            <p
              className="ol-card px-4 py-6 text-center text-sm text-ol-danger"
              role="alert"
            >
              {error}
            </p>
          ) : null}

          {!loading && !error && posts.length === 0 ? (
            <p className="ol-card px-4 py-6 text-center text-sm text-ol-muted">
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
              highlighted={focusedPostId === post.id}
              defaultCommentsOpen={focusedPostId === post.id}
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
    </AppShell>
  );
}
