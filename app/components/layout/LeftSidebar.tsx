"use client";

import { CalendarDays, PenLine, UserRound } from "lucide-react";
import { useEffect, useState } from "react";
import AvatarBadge from "@/app/components/AvatarBadge";
import { animalNameFromAnonId } from "@/lib/avatar";
import { getAnonId, getAnonJoinedAt } from "@/lib/anon";
import {
  fetchCurrentProfile,
  getCachedProfile,
  type Profile,
} from "@/lib/profile";
import { supabase } from "@/lib/supabase";

type LeftSidebarProps = {
  onCreatePost?: () => void;
  onClosePanel?: () => void;
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
}: LeftSidebarProps) {
  const [anonId, setAnonId] = useState<string | null>(null);
  const [joinedAt, setJoinedAt] = useState<string | null>(null);
  const [postCount, setPostCount] = useState(0);
  const [karma, setKarma] = useState(0);
  const [profile, setProfile] = useState<Profile | null>(null);

  useEffect(() => {
    const id = getAnonId();
    setAnonId(id);
    setJoinedAt(getAnonJoinedAt());
    setProfile(getCachedProfile());

    void (async () => {
      try {
        const p = await fetchCurrentProfile();
        if (p) {
          setProfile(p);
          setKarma(p.karma);
        }
      } catch {
        // profiles table may not exist yet
      }

      const { data: myPosts, count } = await supabase
        .from("posts")
        .select("id", { count: "exact" })
        .eq("anon_id", id);

      setPostCount(count ?? 0);

      if (!getCachedProfile()) {
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
      }
    })();
  }, []);

  const handle = anonId ? animalNameFromAnonId(anonId) : "the stranger";
  const publicId = profile?.public_id;
  const joinedLabel = profile?.created_at || joinedAt;

  return (
    <aside className="space-y-2">
      <section className="ol-card overflow-hidden">
        <div className="h-14 bg-neutral-900" />
        <div className="relative px-3 pb-3 pt-0">
          <div className="-mt-8 inline-block rounded-full border-2 border-white bg-white">
            <AvatarBadge anonId={anonId} size={44} />
          </div>
          <h2 className="mt-2 truncate font-mono text-base font-semibold text-ol-ink">
            {handle}
          </h2>
          {profile?.display_name &&
          profile.display_name.trim() !== handle ? (
            <p className="truncate text-xs text-ol-muted">
              {profile.display_name}
            </p>
          ) : null}
          <p className="font-mono text-xs text-ol-muted">
            {publicId ? `ID · ${publicId}` : "Anonymous member"}
          </p>

          <dl className="mt-3 grid grid-cols-3 gap-2 border-t border-ol-border pt-3 text-center">
            <div>
              <dt className="text-[11px] text-ol-faint">Karma</dt>
              <dd className="text-sm font-semibold tabular-nums text-ol-ink">
                {profile?.karma ?? karma}
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
                  {joinedLabel ? formatJoinDate(joinedLabel) : "—"}
                </span>
              </dd>
            </div>
          </dl>

          {profile ? (
            <ul className="mt-3 grid grid-cols-2 gap-1.5 border-t border-ol-border pt-3 text-[11px]">
              <li className="rounded-md bg-neutral-50 px-2 py-1.5 text-ol-ink">
                Insightful{" "}
                <span className="font-mono font-semibold tabular-nums">
                  {profile.rep_insightful}
                </span>
              </li>
              <li className="rounded-md bg-neutral-50 px-2 py-1.5 text-ol-ink">
                Helpful{" "}
                <span className="font-mono font-semibold tabular-nums">
                  {profile.rep_helpful}
                </span>
              </li>
              <li className="rounded-md bg-neutral-50 px-2 py-1.5 text-ol-ink">
                Funny{" "}
                <span className="font-mono font-semibold tabular-nums">
                  {profile.rep_funny}
                </span>
              </li>
              <li className="rounded-md bg-neutral-50 px-2 py-1.5 text-ol-ink">
                Supportive{" "}
                <span className="font-mono font-semibold tabular-nums">
                  {profile.rep_supportive}
                </span>
              </li>
            </ul>
          ) : null}

          <div className="mt-3 flex flex-col gap-2">
            <button
              type="button"
              onClick={() => {
                onCreatePost?.();
                onClosePanel?.();
              }}
              className="inline-flex h-9 items-center justify-center gap-1.5 rounded-full bg-ol-primary px-3 text-sm font-semibold text-white transition hover:bg-ol-primary-hover"
            >
              <PenLine className="h-4 w-4" strokeWidth={1.75} />
              Create Post
            </button>
            <button
              type="button"
              className="inline-flex h-9 items-center justify-center gap-1.5 rounded-full border border-ol-ink px-3 text-sm font-semibold text-ol-ink transition hover:bg-neutral-50"
            >
              <UserRound className="h-4 w-4" strokeWidth={1.75} />
              My Profile
            </button>
          </div>
        </div>
      </section>

      <section className="ol-card p-3">
        <h3 className="ol-section-title text-sm">Guidelines</h3>
        <ul className="mt-2 space-y-1.5 text-xs leading-relaxed text-ol-muted">
          <li>Be decent. No harassment, threats, or illegal content.</li>
          <li>Use Report on posts that break the rules.</li>
          <li>
            Posts expire after 24 hours. Rate limits apply to curb spam.
          </li>
        </ul>
        <p className="mt-3 text-[11px] text-ol-faint">
          <a href="/terms" className="underline-offset-2 hover:underline">
            Terms
          </a>
          {" · "}
          <a href="/privacy" className="underline-offset-2 hover:underline">
            Privacy
          </a>
        </p>
      </section>
    </aside>
  );
}
