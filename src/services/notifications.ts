import { supabase } from '@/lib/supabaseClient';
import { t } from '@/i18n';

export interface NotificationRow {
  id: string;
  recipient_id: string;
  actor_id: string | null;
  type: string;
  entity_id: string | null;
  is_read: boolean;
  created_at: string;
  content?: string | null;
  actor: { id: string; username: string; full_name: string; avatar_url: string | null } | null;
}

export async function fetchNotifications(userId: string) {
  const { data, error } = await supabase
    .from('notifications')
    .select('id, recipient_id, actor_id, type, entity_id, is_read, created_at, content, actor:profiles!notifications_actor_id_fkey(id, username, full_name, avatar_url)')
    .eq('recipient_id', userId)
    .order('created_at', { ascending: false })
    .limit(30);
  if (error) throw error;
  return (data ?? []) as unknown as NotificationRow[];
}

export async function unreadCount(userId: string) {
  const { count, error } = await supabase
    .from('notifications')
    .select('*', { count: 'exact', head: true })
    .eq('recipient_id', userId)
    .eq('is_read', false);
  if (error) throw error;
  return count ?? 0;
}

export async function markAllRead(userId: string) {
  const { error } = await supabase.from('notifications').update({ is_read: true }).eq('recipient_id', userId).eq('is_read', false);
  if (error) throw error;
}

export function notificationMessage(n: NotificationRow): string {
  const name = n.actor?.full_name ?? t('someone');
  const fill = (key: string) => t(key).replace('{name}', name);
  switch (n.type) {
    case 'friend_request': return fill('notif_friend_request');
    case 'friend_request_accepted': return fill('notif_friend_request_accepted');
    case 'new_follower': return fill('notif_new_follower');
    case 'post_like': return fill('notif_post_like');
    case 'comment': return fill('notif_comment');
    case 'comment_reply': return fill('notif_comment_reply');
    case 'post_share': return fill('notif_post_share');
    case 'new_message': return fill('notif_new_message');
    case 'announcement': return n.content ?? t('notif_announcement');
    default: return t('notif_default');
  }
                                                                 }
