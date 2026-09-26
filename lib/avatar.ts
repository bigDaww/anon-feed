/** Deterministic animal avatar identity from anon_id. */

export type AvatarIconName =
  | "cat"
  | "fish"
  | "spider"
  | "feather"
  | "bug"
  | "paw"
  | "dog"
  | "deer"
  | "horse"
  | "butterfly"
  | "bat"
  | "pig";

export type AvatarIdentity = {
  /** Friendly display label, e.g. "the fox". */
  animalName: string;
  /** Key used to pick the Tabler icon in AvatarBadge. */
  iconName: AvatarIconName;
  /** Hex fill for the badge background. */
  color: string;
};

type AnimalDef = {
  iconName: AvatarIconName;
  animalName: string;
};

const ANIMALS: AnimalDef[] = [
  { iconName: "cat", animalName: "the cat" },
  { iconName: "fish", animalName: "the fish" },
  { iconName: "spider", animalName: "the spider" },
  { iconName: "feather", animalName: "the sparrow" },
  { iconName: "bug", animalName: "the beetle" },
  { iconName: "paw", animalName: "the fox" },
  { iconName: "dog", animalName: "the hound" },
  { iconName: "deer", animalName: "the stag" },
  { iconName: "horse", animalName: "the mustang" },
  { iconName: "butterfly", animalName: "the moth" },
  { iconName: "bat", animalName: "the bat" },
  { iconName: "pig", animalName: "the boar" },
];

/** Muted, distinct hues for badge backgrounds. */
const PALETTE = [
  "#5B7C99", // slate blue
  "#6B8F71", // sage
  "#8B7355", // warm taupe
  "#7A6A8A", // dusty violet
  "#9A6B5A", // terracotta muted
  "#5A7A7A", // teal gray
  "#8A7A5A", // khaki
  "#6A6A7A", // cool charcoal
] as const;

function hashAnonId(anonId: string): number {
  let hash = 0;
  for (let i = 0; i < anonId.length; i++) {
    hash = anonId.charCodeAt(i) + ((hash << 5) - hash);
  }
  return Math.abs(hash);
}

/**
 * Same anonId always resolves to the same animal + color.
 */
export function resolveAvatar(
  anonId: string | null | undefined,
): AvatarIdentity {
  const id = anonId?.trim() || "anonymous";
  const hash = hashAnonId(id);
  const animal = ANIMALS[hash % ANIMALS.length];
  const color = PALETTE[Math.floor(hash / ANIMALS.length) % PALETTE.length];

  return {
    animalName: animal.animalName,
    iconName: animal.iconName,
    color,
  };
}

/** Friendly animal label for display (replaces Anon-XXXX handles). */
export function animalNameFromAnonId(
  anonId: string | null | undefined,
): string {
  return resolveAvatar(anonId).animalName;
}
