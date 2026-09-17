import { supabase } from '@/lib/supabaseClient';

export interface StatusRow {
  id: string;
  author_id: string;
  content_type: 'image' | 'text';
  storage_path: string | null;
  text_content: string | null;
  background_color: string | null;
  created_at: string;
  expires_at: string;
  author: { id: string; username: string; full_name: string; avatar_url: string | null } | null;
}

/** Only friends' + own active (non-expired) statuses, grouped by author on the client. */
export async function fetchActiveStatuses(): Promise<StatusRow[]> {
  const { data, error } = await supabase
    .from('statuses')
    .select(`id, author_id, content_type, storage_path, text_content, background_color, created_at, expires_at,
      author:profiles!statuses_author_id_fkey(id, username, full_name, avatar_url)`)
    .gt('expires_at', new Date().toISOString())
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []) as unknown as StatusRow[];
}

export async function createTextStatus(authorId: string, text: string, backgroundColor: string) {
  const { error } = await supabase.from('statuses').insert({
    author_id: authorId,
    content_type: 'text',
    text_content: text,
    background_color: backgroundColor
  });
  if (error) throw error;
}

export async function createImageStatus(authorId: string, storagePath: string) {
  const { error } = await supabase.from('statuses').insert({ author_id: authorId, content_type: 'image', storage_path: storagePath });
  if (error) throw error;
}

export async function deleteStatus(statusId: string) {
  const { error } = await supabase.from('statuses').delete().eq('id', statusId);
  if (error) throw error;
}
