"use client";

import TopStories from "@/app/components/layout/TopStories";

export default function RightSidebar() {
  return (
    <aside className="space-y-2" aria-label="Right sidebar">
      <TopStories />
    </aside>
  );
}
