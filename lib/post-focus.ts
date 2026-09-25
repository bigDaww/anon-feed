export function openPost(postId: string) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(
    new CustomEvent("ol:open-post", { detail: { postId } }),
  );
  const hash = `#post-${postId}`;
  if (window.location.hash !== hash) {
    window.history.replaceState(null, "", hash);
  }
}

export function onOpenPost(handler: (postId: string) => void): () => void {
  const listener = (event: Event) => {
    const detail = (event as CustomEvent<{ postId: string }>).detail;
    if (detail?.postId) handler(detail.postId);
  };
  window.addEventListener("ol:open-post", listener);
  return () => window.removeEventListener("ol:open-post", listener);
}

export function formatCompactCount(n: number): string {
  return new Intl.NumberFormat("en-US").format(n);
}

export function formatRelativeShort(iso: string, now = Date.now()): string {
  const diffMs = Math.max(0, now - new Date(iso).getTime());
  const seconds = Math.floor(diffMs / 1000);
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(iso).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
}

export function excerpt(text: string, max = 80): string {
  const trimmed = text.replace(/\s+/g, " ").trim();
  if (trimmed.length <= max) return trimmed;
  return `${trimmed.slice(0, max).trimEnd()}…`;
}
