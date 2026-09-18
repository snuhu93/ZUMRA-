import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import Avatar from '@/components/Avatar';
import { useDebounce } from '@/hooks/useDebounce';
import { searchPeople, searchPosts } from '@/services/search';

export default function Search() {
  const [query, setQuery] = useState('');
  const debounced = useDebounce(query, 350);
  const [people, setPeople] = useState<any[]>([]);
  const [posts, setPosts] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!debounced.trim()) {
      setPeople([]);
      setPosts([]);
      return;
    }
    setLoading(true);
    Promise.all([searchPeople(debounced), searchPosts(debounced)])
      .then(([p, po]) => {
        setPeople(p);
        setPosts(po);
      })
      .finally(() => setLoading(false));
  }, [debounced]);

  return (
    <div className="p-4">
      <input
        autoFocus
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search people and posts..."
        className="w-full rounded-full border border-gray-300 bg-white px-4 py-2.5 text-sm dark:border-gray-700 dark:bg-gray-900"
      />

      {loading && <p className="mt-4 text-center text-sm text-gray-500">Searching...</p>}

      {!loading && people.length > 0 && (
        <div className="mt-4">
          <h2 className="mb-2 text-xs font-semibold uppercase text-gray-500">People</h2>
          {people.map((p) => (
            <Link key={p.id} to={`/profile/${p.username}`} className="flex items-center gap-3 py-2">
              <Avatar src={p.avatar_url} name={p.full_name} />
              <div>
                <p className="text-sm font-medium">{p.full_name}</p>
                <p className="text-xs text-gray-500">@{p.username}</p>
              </div>
            </Link>
          ))}
        </div>
      )}

      {!loading && posts.length > 0 && (
        <div className="mt-4">
          <h2 className="mb-2 text-xs font-semibold uppercase text-gray-500">Posts</h2>
          {posts.map((p) => (
            <Link key={p.id} to={`/post/${p.id}`} className="block border-b border-gray-100 py-3 dark:border-gray-800">
              <p className="text-xs font-medium text-gray-500">{p.author?.full_name}</p>
              <p className="line-clamp-2 text-sm">{p.content}</p>
            </Link>
          ))}
        </div>
      )}

      {!loading && debounced && people.length === 0 && posts.length === 0 && (
        <p className="mt-6 text-center text-sm text-gray-500">No results for "{debounced}".</p>
      )}
    </div>
  );
}
