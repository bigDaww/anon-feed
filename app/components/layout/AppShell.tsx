"use client";

import { useCallback, useState } from "react";
import Link from "next/link";
import BottomNav from "@/app/components/layout/BottomNav";
import LeftSidebar from "@/app/components/layout/LeftSidebar";
import RightSidebar from "@/app/components/layout/RightSidebar";
import SlideOver from "@/app/components/layout/SlideOver";
import TopNav from "@/app/components/layout/TopNav";

type AppShellProps = {
  children: React.ReactNode;
};

export default function AppShell({ children }: AppShellProps) {
  const [leftOpen, setLeftOpen] = useState(false);
  const closeLeft = useCallback(() => setLeftOpen(false), []);

  function focusCompose() {
    const el = document.getElementById("compose");
    if (el instanceof HTMLTextAreaElement) {
      el.scrollIntoView({ behavior: "smooth", block: "center" });
      el.focus();
    }
  }

  return (
    <div className="min-h-screen bg-ol-canvas text-ol-ink">
      <TopNav
        onOpenMenu={() => setLeftOpen(true)}
        onOpenProfile={() => setLeftOpen(true)}
      />

      <div className="mx-auto flex max-w-shell gap-6 px-3 pb-bottom-nav pt-6 sm:px-4 lg:pb-8">
        <div className="hidden w-sidebar-left shrink-0 lg:block">
          <div className="sticky top-[calc(var(--ol-nav-height)+1.5rem)] max-h-[calc(100vh-var(--ol-nav-height)-2rem)] overflow-y-auto">
            <LeftSidebar onCreatePost={focusCompose} />
          </div>
        </div>

        <main className="min-w-0 flex-1">{children}</main>

        <div className="hidden w-sidebar-right shrink-0 xl:block">
          <div className="sticky top-[calc(var(--ol-nav-height)+1.5rem)] max-h-[calc(100vh-var(--ol-nav-height)-2rem)] overflow-y-auto">
            <RightSidebar />
          </div>
        </div>
      </div>

      <footer className="mx-auto hidden max-w-shell px-4 pb-6 text-center text-[11px] text-ol-faint lg:block">
        <Link href="/terms" className="hover:text-ol-muted hover:underline">
          Terms
        </Link>
        <span className="mx-2">·</span>
        <Link href="/privacy" className="hover:text-ol-muted hover:underline">
          Privacy
        </Link>
        <span className="mx-2">·</span>
        <span>Report abuse via the Report button on posts</span>
      </footer>

      <BottomNav onOpenProfile={() => setLeftOpen(true)} />

      <SlideOver open={leftOpen} title="Menu" onClose={closeLeft} side="left">
        <LeftSidebar onCreatePost={focusCompose} onClosePanel={closeLeft} />
      </SlideOver>
    </div>
  );
}
