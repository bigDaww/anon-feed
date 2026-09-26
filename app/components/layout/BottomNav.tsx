"use client";

import { FileText, Home, UserRound } from "lucide-react";
import Link from "next/link";

type BottomNavProps = {
  onOpenProfile?: () => void;
};

const itemClass =
  "flex flex-1 flex-col items-center justify-center gap-0.5 py-2 text-[10px] font-medium text-ol-muted transition hover:text-ol-ink";

export default function BottomNav({ onOpenProfile }: BottomNavProps) {
  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-40 flex h-bottom-nav border-t border-ol-border bg-ol-surface lg:hidden"
      aria-label="Mobile"
    >
      <Link href="/" className={`${itemClass} text-ol-ink`}>
        <Home className="h-5 w-5" strokeWidth={1.75} />
        Home
      </Link>
      <Link href="/terms" className={itemClass}>
        <FileText className="h-5 w-5" strokeWidth={1.75} />
        Rules
      </Link>
      <button type="button" onClick={onOpenProfile} className={itemClass}>
        <UserRound className="h-5 w-5" strokeWidth={1.75} />
        Profile
      </button>
    </nav>
  );
}
