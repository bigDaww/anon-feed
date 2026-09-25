"use client";

import { Bell, Home, UserRound, UsersRound } from "lucide-react";
import Link from "next/link";

type BottomNavProps = {
  onOpenGroups?: () => void;
  onOpenProfile?: () => void;
};

const itemClass =
  "flex flex-1 flex-col items-center justify-center gap-0.5 py-2 text-[10px] font-medium text-ol-muted transition hover:text-ol-ink";

export default function BottomNav({
  onOpenGroups,
  onOpenProfile,
}: BottomNavProps) {
  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-40 flex h-bottom-nav border-t border-ol-border bg-ol-surface lg:hidden"
      aria-label="Mobile"
    >
      <Link href="/" className={`${itemClass} text-ol-accent`}>
        <Home className="h-5 w-5" strokeWidth={1.75} />
        Home
      </Link>
      <button type="button" onClick={onOpenGroups} className={itemClass}>
        <UsersRound className="h-5 w-5" strokeWidth={1.75} />
        Groups
      </button>
      <Link href="/#notifications" className={itemClass}>
        <Bell className="h-5 w-5" strokeWidth={1.75} />
        Notifications
      </Link>
      <button type="button" onClick={onOpenProfile} className={itemClass}>
        <UserRound className="h-5 w-5" strokeWidth={1.75} />
        Profile
      </button>
    </nav>
  );
}
