import { supabase } from '@/lib/supabaseClient';

export async function searchPeople(query: string) {
  if (!query.trim()) return [];
  const { data, error } = await supabase
    .from('profiles')
    .select('id, username, full_name, avatar_url')
    .or(`username.ilike.%${query}%,full_name.ilike.%${query}%`)
    .limit(15);
  if (error) throw error;
  return data ?? [];
}

export async function searchPosts(query: string) {
  if (!query.trim()) return [];
  const { data, error } = await supabase
    .from('posts')
    .select(`id, content, created_at, author:profiles!posts_author_id_fkey(id, username, full_name, avatar_url)`)
    .eq('is_deleted', false)
    .eq('privacy', 'public')
    .ilike('content', `%${query}%`)
    .order('created_at', { ascending: false })
    .limit(15);
  if (error) throw error;
  return data ?? [];
}
