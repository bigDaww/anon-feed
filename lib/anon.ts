const ANON_ID_KEY = "anon_id";
const ANON_JOINED_KEY = "anon_joined_at";

function createAnonId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `anon-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

function readStorage(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function writeStorage(key: string, value: string): void {
  try {
    localStorage.setItem(key, value);
  } catch {
    // Private mode / blocked storage — identity still works for this session.
  }
}

/**
 * Returns the anonymous identity for this browser, creating and persisting
 * one on first load. Client-only — do not call during SSR.
 */
export function getAnonId(): string {
  const existing = readStorage(ANON_ID_KEY);
  if (existing) return existing;

  const anonId = createAnonId();
  writeStorage(ANON_ID_KEY, anonId);
  if (!readStorage(ANON_JOINED_KEY)) {
    writeStorage(ANON_JOINED_KEY, new Date().toISOString());
  }
  return anonId;
}

/** ISO timestamp when this browser first got an anon_id. */
export function getAnonJoinedAt(): string {
  getAnonId();
  const existing = readStorage(ANON_JOINED_KEY);
  if (existing) return existing;

  const joined = new Date().toISOString();
  writeStorage(ANON_JOINED_KEY, joined);
  return joined;
}
