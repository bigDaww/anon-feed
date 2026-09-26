"use client";

import Link from "next/link";
import { Flame } from "lucide-react";

type RoomBannerProps = {
  roomId: string;
};

export default function RoomBanner({ roomId }: RoomBannerProps) {
  return (
    <div className="mx-4 mb-3 rounded-lg border border-ol-border bg-neutral-50 px-3 py-2.5 animate-in fade-in slide-in-from-top-1 duration-300">
      <p className="flex items-start gap-2 text-sm font-semibold text-ol-ink">
        <Flame className="mt-0.5 h-4 w-4 shrink-0 text-ol-ink" />
        <span>This conversation is taking off.</span>
      </p>
      <p className="mt-1 pl-6 text-xs text-ol-muted">
        A discussion room has been created.
      </p>
      <div className="mt-2 pl-6">
        <Link
          href={`/rooms/${roomId}`}
          className="inline-flex h-8 items-center rounded-full bg-ol-primary px-3 text-xs font-semibold text-white transition hover:bg-ol-primary-hover"
        >
          Join Room
        </Link>
      </div>
    </div>
  );
}
