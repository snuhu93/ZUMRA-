import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Avatar from '@/components/Avatar';
import { useAuth } from '@/contexts/AuthContext';
import { fetchNotifications, markAllRead, notificationMessage, type NotificationRow } from '@/services/notifications';

function timeAgo(iso: string): string {
  const seconds = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (seconds < 60) return 'now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h`;
  return `${Math.floor(hours / 24)}d`;
}

function targetPath(n: NotificationRow): string {
  switch (n.type) {
    case 'post_like':
    case 'comment':
    case 'comment_reply':
    case 'post_share':
      return n.entity_id ? `/post/${n.entity_id}` : '/';
    case 'new_message':
      return n.entity_id ? `/messages/${n.entity_id}` : '/messages';
    case 'friend_request':
      return '/friends';
    case 'friend_request_accepted':
    case 'new_follower':
      return n.actor ? `/profile/${n.actor.username}` : '/';
    default:
      return '/';
  }
}

export default function Notifications() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [items, setItems] = useState<NotificationRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    fetchNotifications(user.id).then((data) => {
      setItems(data);
      setLoading(false);
      markAllRead(user.id);
    });
  }, [user]);

  if (loading) return <p className="p-6 text-center text-sm text-gray-500">Loading...</p>;

  return (
    <div className="divide-y divide-gray-100 dark:divide-gray-800">
      {items.length === 0 && <p className="p-10 text-center text-sm text-gray-500">You don't have any notifications yet.</p>}
      {items.map((n) => (
        <button key={n.id} onClick={() => navigate(targetPath(n))} className="flex w-full items-center gap-3 p-4 text-left hover:bg-gray-50 dark:hover:bg-gray-800">
          <Avatar src={n.actor?.avatar_url} name={n.actor?.full_name ?? 'ZUMRA'} />
          <div className="flex-1">
            <p className={`text-sm ${!n.is_read ? 'font-semibold' : ''}`}>{notificationMessage(n)}</p>
            <p className="text-xs text-gray-500">{timeAgo(n.created_at)}</p>
          </div>
          {!n.is_read && <span className="h-2 w-2 rounded-full bg-zumra-500" />}
        </button>
      ))}
    </div>
  );
}
