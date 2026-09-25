import { supabase } from "@/lib/supabase";

export type TopStory = {
  id: string;
  content: string;
  author_name: string;
  author_avatar: string;
  created_at: string;
  upvotes: number;
};

const INITIAL_PAGE = 40;
const PAGE_SIZE = 20;

export async function fetchTopStories(
  offset: number,
  limit: number,
): Promise<TopStory[]> {
  const from = offset;
  const to = offset + limit - 1;

  const { data, error } = await supabase
    .from("posts")
    .select("id, content, author_name, author_avatar, created_at, upvotes")
    .order("upvotes", { ascending: false })
    .order("created_at", { ascending: false })
    .range(from, to);

  if (error) throw error;
  return (data ?? []) as TopStory[];
}

export async function fetchTopStoriesInitial(): Promise<TopStory[]> {
  return fetchTopStories(0, INITIAL_PAGE);
}

export async function fetchTopStoriesPage(offset: number): Promise<TopStory[]> {
  return fetchTopStories(offset, PAGE_SIZE);
}

export { INITIAL_PAGE, PAGE_SIZE };
