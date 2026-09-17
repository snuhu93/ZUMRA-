import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import Avatar from '@/components/Avatar';
import { useAuth } from '@/contexts/AuthContext';
import { fetchConversations, type ConversationSummary } from '@/services/messages';
import { useDebounce } from '@/hooks/useDebounce';

function timeAgo(iso: string): string {
  const seconds = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (seconds < 60) return 'now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h`;
  return `${Math.floor(hours / 24)}d`;
}

export default function Messages() {
  const { user } = useAuth();
  const [conversations, setConversations] = useState<ConversationSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const debouncedQuery = useDebounce(query, 300);

  useEffect(() => {
    if (!user) return;
    fetchConversations(user.id).then((data) => {
      setConversations(data);
      setLoading(false);
    });
  }, [user]);

  const filtered = conversations.filter((c) =>
    debouncedQuery ? c.other?.full_name.toLowerCase().includes(debouncedQuery.toLowerCase()) : true
  );

  return (
    <div>
      <div className="p-3">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search conversations..."
          className="w-full rounded-full border border-gray-300 bg-white px-4 py-2 text-sm dark:border-gray-700 dark:bg-gray-900"
        />
      </div>

      {loading && <p className="p-6 text-center text-sm text-gray-500">Loading...</p>}

      <div className="divide-y divide-gray-100 dark:divide-gray-800">
        {!loading && filtered.length === 0 && <p className="p-10 text-center text-sm text-gray-500">No messages yet.</p>}
        {filtered.map((c) => (
          <Link key={c.id} to={`/messages/${c.id}`} className="flex items-center gap-3 p-4">
            <Avatar src={c.other?.avatar_url} name={c.other?.full_name ?? 'User'} size={48} />
            <div className="flex-1 overflow-hidden">
              <p className={`text-sm ${c.unread ? 'font-semibold' : 'font-medium'}`}>{c.other?.full_name ?? 'Unknown'}</p>
              <p className="truncate text-xs text-gray-500">{c.lastMessage?.content ?? 'Say hello 👋'}</p>
            </div>
            {c.lastMessage && <span className="text-xs text-gray-400">{timeAgo(c.lastMessage.created_at)}</span>}
            {c.unread && <span className="h-2 w-2 flex-shrink-0 rounded-full bg-zumra-500" />}
          </Link>
        ))}
      </div>
    </div>
  );
}
