import { supabase } from '@/lib/supabaseClient';

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
  const name = n.actor?.full_name ?? 'Someone';
  switch (n.type) {
    case 'friend_request': return `${name} sent you a friend request.`;
    case 'friend_request_accepted': return `${name} accepted your friend request.`;
    case 'new_follower': return `${name} started following you.`;
    case 'post_like': return `${name} liked your post.`;
    case 'comment': return `${name} commented on your post.`;
    case 'comment_reply': return `${name} replied to a comment.`;
    case 'post_share': return `${name} shared your post.`;
    case 'new_message': return `${name} sent you a message.`;
    case 'announcement': return n.content ?? 'New announcement from Zumra.';
    default: return 'You have a new notification.';
  }
}
