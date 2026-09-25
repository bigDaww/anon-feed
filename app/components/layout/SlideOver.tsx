"use client";

import { X } from "lucide-react";
import { useEffect } from "react";

type SlideOverProps = {
  open: boolean;
  title: string;
  onClose: () => void;
  children: React.ReactNode;
  side?: "left" | "right";
};

export default function SlideOver({
  open,
  title,
  onClose,
  children,
  side = "left",
}: SlideOverProps) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal>
      <button
        type="button"
        className="absolute inset-0 bg-black/40"
        aria-label="Close panel"
        onClick={onClose}
      />
      <div
        className={`absolute top-0 flex h-full w-[min(100%,320px)] flex-col bg-ol-canvas shadow-xl ${
          side === "left" ? "left-0" : "right-0"
        }`}
      >
        <div className="flex h-nav items-center justify-between border-b border-ol-border bg-ol-surface px-4">
          <h2 className="text-sm font-semibold text-ol-ink">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-8 w-8 items-center justify-center rounded-md text-ol-muted hover:bg-black/[0.04] hover:text-ol-ink"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-3">{children}</div>
      </div>
    </div>
  );
}
