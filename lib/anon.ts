const ANON_ID_KEY = "anon_id";
const ANON_JOINED_KEY = "anon_joined_at";

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
  if (!localStorage.getItem(ANON_JOINED_KEY)) {
    localStorage.setItem(ANON_JOINED_KEY, new Date().toISOString());
  }
  return anonId;
}

/** ISO timestamp when this browser first got an anon_id. */
export function getAnonJoinedAt(): string {
  getAnonId();
  const existing = localStorage.getItem(ANON_JOINED_KEY);
  if (existing) return existing;

  const joined = new Date().toISOString();
  localStorage.setItem(ANON_JOINED_KEY, joined);
  return joined;
}
