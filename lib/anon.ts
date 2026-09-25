const ANON_ID_KEY = "anon_id";

function createAnonId(): string {
  return crypto.randomUUID();
}

/**
 * Returns the anonymous identity for this browser, creating and persisting
 * one on first load. Client-only — do not call during SSR.
 */
export function getAnonId(): string {
  const existing = localStorage.getItem(ANON_ID_KEY);
  if (existing) return existing;

  const anonId = createAnonId();
  localStorage.setItem(ANON_ID_KEY, anonId);
  return anonId;
}
