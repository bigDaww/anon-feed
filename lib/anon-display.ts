function hashAnonId(anonId: string): number {
  let hash = 0;
  for (let i = 0; i < anonId.length; i++) {
    hash = anonId.charCodeAt(i) + ((hash << 5) - hash);
  }
  return Math.abs(hash);
}

/** Stable avatar fill from anon_id. */
export function avatarColorFromAnonId(anonId: string): string {
  const hue = hashAnonId(anonId) % 360;
  return `hsl(${hue} 52% 46%)`;
}

/** Short handle like Anon-A1B2 from the end of the UUID. */
export function formatAnonHandle(anonId: string): string {
  const short = anonId.replace(/-/g, "").slice(-4).toUpperCase();
  return `Anon-${short}`;
}
