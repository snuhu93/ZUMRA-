import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Avatar from '@/components/Avatar';
import { useAuth } from '@/contexts/AuthContext';
import { useT, t as translate } from '@/i18n';
import { fetchNotifications, markAllRead, notificationMessage, type NotificationRow } from '@/services/notifications';

function timeAgo(iso: string): string {
  const seconds = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (seconds < 60) return translate('time_now');
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
  const t = useT();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [items, setItems] = useState<NotificationRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<NotificationRow | null>(null);

  useEffect(() => {
    if (!user) return;
    fetchNotifications(user.id).then((data) => {
      setItems(data);
      setLoading(false);
      markAllRead(user.id);
    });
  }, [user]);

  const handleClick = (n: NotificationRow) => {
    if (n.type === 'announcement') {
      setSelected(n);
      return;
    }
    navigate(targetPath(n));
  };

  if (loading) return <p className="p-6 text-center text-sm text-gray-500">{t('loading')}</p>;

  return (
    <div className="divide-y divide-gray-100 dark:divide-gray-800">
      {items.length === 0 && <p className="p-10 text-center text-sm text-gray-500">{t('no_notifications_yet')}</p>}
      {items.map((n) => (
        <button key={n.id} onClick={() => handleClick(n)} className="flex w-full items-center gap-3 p-4 text-left hover:bg-gray-50 dark:hover:bg-gray-800">
          <Avatar src={n.actor?.avatar_url} name={n.actor?.full_name ?? 'ZUMRA'} />
          <div className="flex-1">
            <p className={`text-sm ${!n.is_read ? 'font-semibold' : ''}`}>{notificationMessage(n)}</p>
            <p className="text-xs text-gray-500">{timeAgo(n.created_at)}</p>
          </div>
          {!n.is_read && <span className="h-2 w-2 rounded-full bg-zumra-500" />}
        </button>
      ))}

      {selected && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
          onClick={() => setSelected(null)}
        >
          <div
            className="w-full max-w-md rounded-2xl bg-white p-5 text-gray-900 dark:bg-gray-900 dark:text-gray-100"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-3 flex items-center gap-3">
              <Avatar src={selected.actor?.avatar_url} name={selected.actor?.full_name ?? 'ZUMRA'} />
              <div>
                <p className="text-sm font-semibold">ZUMRA</p>
                <p className="text-xs text-gray-500">{timeAgo(selected.created_at)}</p>
              </div>
            </div>
            <p className="whitespace-pre-wrap break-words text-sm">{notificationMessage(selected)}</p>
            <button
              onClick={() => setSelected(null)}
              className="mt-4 w-full rounded-lg bg-zumra-500 px-4 py-2 text-sm font-semibold text-white"
            >
              OK
            </button>
          </div>
        </div>
      )}
    </div>
  );
  }
