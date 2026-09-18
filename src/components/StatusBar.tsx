import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Avatar from '@/components/Avatar';
import { useAuth } from '@/contexts/AuthContext';
import { fetchActiveStatuses, type StatusRow } from '@/services/status';

export default function StatusBar() {
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const [statuses, setStatuses] = useState<StatusRow[]>([]);

  useEffect(() => {
    fetchActiveStatuses().then(setStatuses).catch(() => setStatuses([]));
  }, []);

  // Group by author so each person shows once with their most recent status.
  const byAuthor = new Map<string, StatusRow[]>();
  statuses.forEach((s) => {
    const list = byAuthor.get(s.author_id) ?? [];
    list.push(s);
    byAuthor.set(s.author_id, list);
  });
  const others = [...byAuthor.entries()].filter(([id]) => id !== user?.id);

  return (
    <div className="scrollbar-none flex gap-3 overflow-x-auto border-b border-gray-200 bg-white p-3 dark:border-gray-800 dark:bg-gray-900">
      <button onClick={() => navigate('/status/create')} className="flex flex-col items-center gap-1">
        <div className="relative">
          <Avatar src={profile?.avatar_url} name={profile?.full_name ?? 'You'} size={56} />
          <span className="absolute -bottom-0.5 -right-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-zumra-500 text-xs text-white">+</span>
        </div>
        <span className="text-xs text-gray-600 dark:text-gray-300">Your status</span>
      </button>
      {others.map(([authorId, list]) => (
        <button key={authorId} onClick={() => navigate(`/status/${authorId}`)} className="flex flex-col items-center gap-1">
          <div className="rounded-full ring-2 ring-zumra-500 ring-offset-2 dark:ring-offset-gray-900">
            <Avatar src={list[0].author?.avatar_url} name={list[0].author?.full_name ?? 'User'} size={56} />
          </div>
          <span className="max-w-[64px] truncate text-xs text-gray-600 dark:text-gray-300">{list[0].author?.full_name}</span>
        </button>
      ))}
    </div>
  );
}
