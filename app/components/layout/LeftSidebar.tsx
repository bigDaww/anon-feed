"use client";

import { CalendarDays, Hash, PenLine, UserRound } from "lucide-react";
import { useEffect, useState } from "react";
import {
  avatarColorFromAnonId,
  formatAnonHandle,
} from "@/lib/anon-display";
import { getAnonId, getAnonJoinedAt } from "@/lib/anon";
import {
  COMMUNITY_GROUPS,
  formatMemberCount,
  TALKING_ABOUT,
  type CommunityGroup,
} from "@/lib/social-data";
import { supabase } from "@/lib/supabase";

type LeftSidebarProps = {
  onCreatePost?: () => void;
  onClosePanel?: () => void;
  /** When "groups", only render the groups card (mobile panel). */
  section?: "all" | "groups";
};

function formatJoinDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, {
    month: "short",
    year: "numeric",
  });
}

export default function LeftSidebar({
  onCreatePost,
  onClosePanel,
  section = "all",
}: LeftSidebarProps) {
  const [anonId, setAnonId] = useState<string | null>(null);
  const [joinedAt, setJoinedAt] = useState<string | null>(null);
  const [postCount, setPostCount] = useState(0);
  const [karma, setKarma] = useState(0);
  const [groups, setGroups] = useState<CommunityGroup[]>(COMMUNITY_GROUPS);

  useEffect(() => {
    const id = getAnonId();
    setAnonId(id);
    setJoinedAt(getAnonJoinedAt());

    void (async () => {
      const { data: myPosts, count } = await supabase
        .from("posts")
        .select("id", { count: "exact" })
        .eq("anon_id", id);

      setPostCount(count ?? 0);

      const ids = (myPosts ?? []).map((p) => p.id);
      if (ids.length === 0) {
        setKarma(0);
        return;
      }

      const { data: votes } = await supabase
        .from("votes")
        .select("value")
        .in("post_id", ids);

      setKarma((votes ?? []).reduce((sum, row) => sum + row.value, 0));
    })();
  }, []);

  function toggleJoin(groupId: string) {
    setGroups((prev) =>
      prev.map((g) =>
        g.id === groupId
          ? {
              ...g,
              joined: !g.joined,
              memberCount: g.joined ? g.memberCount - 1 : g.memberCount + 1,
            }
          : g,
      ),
    );
  }

  const handle = anonId ? formatAnonHandle(anonId) : "Anon-····";
  const avatarColor = anonId ? avatarColorFromAnonId(anonId) : "#94a3b8";

  const groupsCard = (
    <section id="groups" className="ol-card p-3">
      <h3 className="ol-section-title text-sm">Groups</h3>
      <ul className="mt-2 space-y-2">
        {groups.map((group) => (
          <li
            key={group.id}
            className="flex items-center gap-2 rounded-lg border border-ol-border bg-ol-surface p-2.5"
          >
            <div
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-xs font-bold text-white"
              style={{
                background: `linear-gradient(135deg, ${avatarColorFromAnonId(group.id)}, #1a4d6d)`,
              }}
              aria-hidden
            >
              {group.name.slice(0, 1)}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-ol-ink">
                {group.name}
              </p>
              <p className="text-xs text-ol-muted">
                {formatMemberCount(group.memberCount)} members
              </p>
            </div>
            <button
              type="button"
              onClick={() => toggleJoin(group.id)}
              className={`h-8 shrink-0 rounded-full px-3 text-xs font-semibold transition ${
                group.joined
                  ? "border border-ol-border bg-white text-ol-muted hover:bg-black/[0.03]"
                  : "bg-ol-accent text-white hover:bg-ol-accent-hover"
              }`}
            >
              {group.joined ? "Joined" : "Join"}
            </button>
          </li>
        ))}
      </ul>
    </section>
  );

  if (section === "groups") {
    return <aside className="space-y-2">{groupsCard}</aside>;
  }

  return (
    <aside className="space-y-2">
      {/* Profile card */}
      <section className="ol-card overflow-hidden">
        <div className="h-14 bg-gradient-to-br from-ol-accent to-[#1a4d6d]" />
        <div className="relative px-3 pb-3 pt-0">
          <div
            className="-mt-8 h-16 w-16 rounded-full border-2 border-white"
            style={{ backgroundColor: avatarColor }}
            aria-hidden
          />
          <h2 className="mt-2 truncate text-base font-semibold text-ol-ink">
            {handle}
          </h2>
          <p className="text-xs text-ol-muted">Anonymous member</p>

          <dl className="mt-3 grid grid-cols-3 gap-2 border-t border-ol-border pt-3 text-center">
            <div>
              <dt className="text-[11px] text-ol-faint">Karma</dt>
              <dd className="text-sm font-semibold tabular-nums text-ol-ink">
                {karma}
              </dd>
            </div>
            <div>
              <dt className="text-[11px] text-ol-faint">Posts</dt>
              <dd className="text-sm font-semibold tabular-nums text-ol-ink">
                {postCount}
              </dd>
            </div>
            <div>
              <dt className="text-[11px] text-ol-faint">Joined</dt>
              <dd className="flex items-center justify-center gap-0.5 text-sm font-semibold text-ol-ink">
                <CalendarDays className="hidden h-3 w-3 text-ol-faint sm:inline" />
                <span className="tabular-nums">
                  {joinedAt ? formatJoinDate(joinedAt) : "—"}
                </span>
              </dd>
            </div>
          </dl>

          <div className="mt-3 flex flex-col gap-2">
            <button
              type="button"
              onClick={() => {
                onCreatePost?.();
                onClosePanel?.();
              }}
              className="inline-flex h-9 items-center justify-center gap-1.5 rounded-full bg-ol-accent px-3 text-sm font-semibold text-white transition hover:bg-ol-accent-hover"
            >
              <PenLine className="h-4 w-4" strokeWidth={1.75} />
              Create Post
            </button>
            <button
              type="button"
              className="inline-flex h-9 items-center justify-center gap-1.5 rounded-full border border-ol-accent px-3 text-sm font-semibold text-ol-accent transition hover:bg-ol-accent-soft"
            >
              <UserRound className="h-4 w-4" strokeWidth={1.75} />
              My Profile
            </button>
          </div>
        </div>
      </section>

      {/* Topics */}
      <section className="ol-card p-3">
        <h3 className="ol-section-title text-sm">What people are talking about</h3>
        <ul className="mt-2 divide-y divide-ol-border">
          {TALKING_ABOUT.map((topic) => (
            <li key={topic.id}>
              <button
                type="button"
                className="flex w-full items-center gap-2 py-2.5 text-left transition hover:bg-black/[0.02]"
              >
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-ol-accent-soft text-ol-accent">
                  <Hash className="h-4 w-4" strokeWidth={1.75} />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-semibold text-ol-ink">
                    {topic.label}
                  </span>
                  <span className="block text-xs text-ol-muted">
                    {formatMemberCount(topic.postCount)} posts
                  </span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      </section>

      {groupsCard}
    </aside>
  );
}
