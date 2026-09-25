export type TopicTag = {
  id: string;
  label: string;
  postCount: number;
};

export type CommunityGroup = {
  id: string;
  name: string;
  memberCount: number;
  joined?: boolean;
};

export const TALKING_ABOUT: TopicTag[] = [
  { id: "college", label: "#College", postCount: 1284 },
  { id: "relationships", label: "#Relationships", postCount: 972 },
  { id: "work", label: "#Work", postCount: 841 },
  { id: "startup", label: "#Startup", postCount: 623 },
  { id: "confession", label: "#Confession", postCount: 1190 },
  { id: "funny", label: "#Funny", postCount: 1502 },
];

export const COMMUNITY_GROUPS: CommunityGroup[] = [
  { id: "college-students", name: "College Students", memberCount: 48210 },
  { id: "startup-founders", name: "Startup Founders", memberCount: 19340 },
  { id: "remote-workers", name: "Remote Workers", memberCount: 27105 },
  { id: "gamers", name: "Gamers", memberCount: 35880 },
  { id: "designers", name: "Designers", memberCount: 12450 },
  { id: "engineers", name: "Engineers", memberCount: 30120 },
  { id: "chandigarh", name: "Chandigarh", memberCount: 8640 },
  { id: "india", name: "India", memberCount: 112300 },
];

export function formatMemberCount(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(n >= 10_000 ? 0 : 1)}k`;
  return String(n);
}
