const WORD_BANK = [
  "FROST", "LAMP", "RIVER", "STONE", "CLOUD", "MAPLE", "EMBER", "QUILL",
  "NORTH", "CIDER", "PULSE", "BLOOM", "HAVEN", "DRIFT", "SOLAR", "WILLOW",
  "ONYX", "CORAL", "MIRTH", "SPARK", "GLADE", "TIDAL", "NOVA", "FLINT",
];

export function generatePublicId(): string {
  return String(Math.floor(100000 + Math.random() * 900000));
}

export function generateRecoveryKey(): string {
  const picks: string[] = [];
  const used = new Set<number>();
  while (picks.length < 3) {
    const i = Math.floor(Math.random() * WORD_BANK.length);
    if (used.has(i)) continue;
    used.add(i);
    picks.push(WORD_BANK[i]);
  }
  const num = String(Math.floor(10 + Math.random() * 90));
  return `${picks[0]}-${picks[1]}-${picks[2]}-${num}`;
}

/** Matches DB hash_recovery_key() */
export async function hashRecoveryKey(
  recoveryKey: string,
  publicId: string,
): Promise<string> {
  const input = `${recoveryKey.trim().toLowerCase()}:${publicId}`;
  const data = new TextEncoder().encode(input);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

const AVATAR_HUES = [12, 32, 48, 160, 190, 210, 260, 300, 330];

export function randomAvatarColor(): string {
  const hue = AVATAR_HUES[Math.floor(Math.random() * AVATAR_HUES.length)];
  return `hsl(${hue} 55% 46%)`;
}
