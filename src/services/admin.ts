import { supabase } from '@/lib/supabaseClient';

export interface AdminUserRow {
  id: string;
  username: string;
  full_name: string;
  avatar_url: string | null;
  is_suspended: boolean;
  is_admin: boolean;
  created_at: string;
  post_count: number;
}

export async function adminSearchUsers(query: string): Promise<AdminUserRow[]> {
  const { data, error } = await supabase.rpc('admin_list_users_with_stats', {
    search: query || null,
  });
  if (error) throw error;
  return (data ?? []) as AdminUserRow[];
}

export async function adminSuspendUser(userId: string, suspended: boolean) {
  const { error } = await supabase.rpc('admin_suspend_user', { p_user_id: userId, p_suspended: suspended });
  if (error) throw error;
}

export async function adminDeleteUser(targetUserId: string) {
  const { data: sessionData } = await supabase.auth.getSession();
  const token = sessionData.session?.access_token;
  if (!token) throw new Error('No active session');

  const { data, error } = await supabase.functions.invoke('admin-delete-user', {
    body: { target_user_id: targetUserId },
    headers: { Authorization: `Bearer ${token}` },
  });
  if (error) throw error;
  return data;
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
}

export async function adminSendAnnouncement(message: string) {
  const { error } = await supabase.rpc('admin_send_announcement', { p_message: message });
  if (error) throw error;
}
