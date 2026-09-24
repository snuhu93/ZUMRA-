import { supabase } from '@/lib/supabaseClient';

export async function adminSearchUsers(query: string) {
  const { data, error } = await supabase
    .from('profiles')
    .select('id, username, full_name, avatar_url, is_suspended, is_admin, created_at')
    .or(`username.ilike.%${query}%,full_name.ilike.%${query}%`)
    .limit(20);
  if (error) throw error;
  return data ?? [];
}

export async function adminSuspendUser(userId: string, suspended: boolean) {
  const { error } = await supabase.rpc('admin_suspend_user', { p_user_id: userId, p_suspended: suspended });
  if (error) throw error;
}

export async function adminFetchPosts() {
  const { data, error } = await supabase
    .from('posts')
    .select('id, content, created_at, is_deleted, author:profiles!posts_author_id_fkey(username, full_name)')
    .order('created_at', { ascending: false })
    .limit(30);
  if (error) throw error;
  return data ?? [];
}

export async function adminDeletePost(postId: string) {
  const { error } = await supabase.rpc('admin_delete_post', { p_post_id: postId });
  if (error) throw error;
}

export async function adminFetchReports() {
  const { data, error } = await supabase
    .from('reports')
    .select('id, target_type, target_id, reason, details, resolved, created_at, reporter:profiles!reports_reporter_id_fkey(username)')
    .order('created_at', { ascending: false })
    .limit(50);
  if (error) throw error;
  return data ?? [];
}

export async function adminResolveReport(reportId: string) {
  const { error } = await supabase.rpc('admin_resolve_report', { p_report_id: reportId });
  if (error) throw error;
}

export async function adminStats() {
  const { data, error } = await supabase.rpc('admin_platform_stats');
  if (error) throw error;
  return data?.[0] ?? { total_users: 0, total_posts: 0, total_reports_open: 0 };
}export async function adminSendAnnouncement(message: string) {
  const { error } = await supabase.rpc('admin_send_announcement', { p_message: message });
  if (error) throw error;
    }
