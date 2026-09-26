import type { ComponentType } from "react";
import {
  IconBat,
  IconBug,
  IconButterfly,
  IconCat,
  IconDeer,
  IconDog,
  IconFeather,
  IconFish,
  IconHorse,
  IconPaw,
  IconPig,
  IconSpider,
} from "@tabler/icons-react";
import {
  resolveAvatar,
  type AvatarIconName,
} from "@/lib/avatar";

type TablerIcon = ComponentType<{
  size?: number | string;
  stroke?: number | string;
  className?: string;
}>;

const ICON_MAP: Record<AvatarIconName, TablerIcon> = {
  cat: IconCat,
  fish: IconFish,
  spider: IconSpider,
  feather: IconFeather,
  bug: IconBug,
  paw: IconPaw,
  dog: IconDog,
  deer: IconDeer,
  horse: IconHorse,
  butterfly: IconButterfly,
  bat: IconBat,
  pig: IconPig,
};

type AvatarBadgeProps = {
  anonId: string | null | undefined;
  /** Pixel diameter. Feed: 36, profile: 44. */
  size?: number;
  className?: string;
};

export default function AvatarBadge({
  anonId,
  size = 36,
  className = "",
}: AvatarBadgeProps) {
  const { iconName, color, animalName } = resolveAvatar(anonId);
  const IconComp = ICON_MAP[iconName];
  const iconSize = Math.max(14, Math.round(size * 0.5));

  return (
    <span
      className={`inline-flex shrink-0 items-center justify-center rounded-full text-white ${className}`}
      style={{
        width: size,
        height: size,
        backgroundColor: color,
      }}
      title={animalName}
      aria-hidden
    >
      <IconComp size={iconSize} stroke={1.75} />
    </span>
  );
}
