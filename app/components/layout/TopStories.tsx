"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  excerpt,
  formatCompactCount,
  formatRelativeShort,
  openPost,
} from "@/lib/post-focus";
import {
  fetchTopStoriesInitial,
  fetchTopStoriesPage,
  type TopStory,
} from "@/lib/top-stories";

const REFRESH_EVENT = "ol:refresh-top-stories";

export function refreshTopStories() {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event(REFRESH_EVENT));
}

type TopStoriesProps = {
  /** Compact card for placing above the feed on smaller screens */
  compact?: boolean;
};

export default function TopStories({ compact = false }: TopStoriesProps) {
  const [stories, setStories] = useState<TopStory[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const sentinelRef = useRef<HTMLDivElement | null>(null);
  const scrollRootRef = useRef<HTMLDivElement | null>(null);
  const loadingMoreRef = useRef(false);

  const loadInitial = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const rows = await fetchTopStoriesInitial();
      setStories(rows);
      setHasMore(rows.length >= 40);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load stories");
    } finally {
      setLoading(false);
    }
  }, []);

  const loadMore = useCallback(async () => {
    if (loadingMoreRef.current || !hasMore) return;
    loadingMoreRef.current = true;
    setLoadingMore(true);
    try {
      const rows = await fetchTopStoriesPage(stories.length);
      setStories((prev) => [...prev, ...rows]);
      setHasMore(rows.length >= 20);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load more");
    } finally {
      loadingMoreRef.current = false;
      setLoadingMore(false);
    }
  }, [hasMore, stories.length]);

  useEffect(() => {
    void loadInitial();
  }, [loadInitial]);

  useEffect(() => {
    const onRefresh = () => {
      void loadInitial();
    };
    window.addEventListener(REFRESH_EVENT, onRefresh);
    const id = window.setInterval(onRefresh, 60_000);
    return () => {
      window.removeEventListener(REFRESH_EVENT, onRefresh);
      window.clearInterval(id);
    };
  }, [loadInitial]);

  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 60_000);
    return () => window.clearInterval(id);
  }, []);

  useEffect(() => {
    const root = scrollRootRef.current;
    const sentinel = sentinelRef.current;
    if (!root || !sentinel || !hasMore) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          void loadMore();
        }
      },
      { root, rootMargin: "120px", threshold: 0 },
    );

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [hasMore, loadMore, stories.length]);

  return (
    <section
      className={`ol-card flex flex-col overflow-hidden ${
        compact
          ? "max-h-[320px]"
          : "max-h-[calc(100vh-var(--ol-nav-height)-3rem)]"
      }`}
    >
      <div className="shrink-0 border-b border-ol-border px-3 py-2.5">
        <h3 className="ol-section-title text-sm">Top Stories</h3>
        <p className="mt-0.5 text-[11px] text-ol-muted">
          Ranked by upvotes · live leaderboard
        </p>
      </div>

      {/* Explicit height so the list never collapses to 0 in a flex layout */}
      <div
        ref={scrollRootRef}
        className={`overflow-y-auto ${
          compact ? "min-h-[200px] flex-1" : "min-h-[360px] flex-1"
        }`}
      >
        {loading ? (
          <p className="px-3 py-6 text-center text-xs text-ol-muted">
            Loading top stories…
          </p>
        ) : null}

        {error ? (
          <p className="px-3 py-4 text-center text-xs text-ol-danger" role="alert">
            {error}
          </p>
        ) : null}

        {!loading && !error && stories.length === 0 ? (
          <p className="px-3 py-6 text-center text-xs text-ol-muted">
            No stories yet. Upvote posts to rank them here.
          </p>
        ) : null}

        <ul className="divide-y divide-ol-border">
          {stories.map((story) => (
            <li key={story.id}>
              <button
                type="button"
                onClick={() => openPost(story.id)}
                className="flex w-full gap-2.5 px-3 py-2.5 text-left transition hover:bg-black/[0.03]"
              >
                <div className="flex w-12 shrink-0 flex-col items-center pt-0.5">
                  <span className="text-[10px] font-semibold leading-none text-ol-accent">
                    ▲
                  </span>
                  <span className="mt-0.5 text-xs font-semibold tabular-nums text-ol-ink">
                    {formatCompactCount(story.upvotes)}
                  </span>
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <span
                      className="h-4 w-4 shrink-0 rounded-full"
                      style={{
                        backgroundColor:
                          story.author_avatar?.startsWith("hsl") ||
                          story.author_avatar?.startsWith("#")
                            ? story.author_avatar
                            : "#94a3b8",
                      }}
                      aria-hidden
                    />
                    <span className="truncate text-xs font-semibold text-ol-ink">
                      {story.author_name || "Anonymous"}
                    </span>
                  </div>
                  <p className="mt-0.5 text-xs leading-snug text-ol-muted">
                    {excerpt(story.content, 80)}
                  </p>
                  <p className="mt-1 text-[11px] text-ol-faint">
                    {formatRelativeShort(story.created_at, now)}
                  </p>
                </div>
              </button>
            </li>
          ))}
        </ul>

        <div ref={sentinelRef} className="h-8" aria-hidden />

        {loadingMore ? (
          <p className="pb-3 text-center text-[11px] text-ol-muted">
            Loading more…
          </p>
        ) : null}

        {!hasMore && stories.length > 0 ? (
          <p className="pb-3 text-center text-[11px] text-ol-faint">
            You&apos;re caught up
          </p>
        ) : null}
      </div>
    </section>
  );
}
