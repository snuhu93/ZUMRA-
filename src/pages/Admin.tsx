import { useEffect, useState } from 'react';
import {
  adminSearchUsers,
  adminSuspendUser,
  adminFetchPosts,
  adminDeletePost,
  adminFetchReports,
  adminResolveReport,
  adminStats
} from '@/services/admin';

type Tab = 'stats' | 'users' | 'posts' | 'reports';

export default function Admin() {
  const [tab, setTab] = useState<Tab>('stats');
  const [stats, setStats] = useState({ total_users: 0, total_posts: 0, total_reports_open: 0 });
  const [userQuery, setUserQuery] = useState('');
  const [users, setUsers] = useState<any[]>([]);
  const [posts, setPosts] = useState<any[]>([]);
  const [reports, setReports] = useState<any[]>([]);

  useEffect(() => {
    adminStats().then(setStats);
  }, []);

  useEffect(() => {
    if (tab === 'posts') adminFetchPosts().then(setPosts);
    if (tab === 'reports') adminFetchReports().then(setReports);
  }, [tab]);

  const handleSearchUsers = async () => {
    setUsers(await adminSearchUsers(userQuery));
  };

  const handleSuspend = async (id: string, suspended: boolean) => {
    await adminSuspendUser(id, !suspended);
    setUsers((prev) => prev.map((u) => (u.id === id ? { ...u, is_suspended: !suspended } : u)));
  };

  const handleDeletePost = async (id: string) => {
    await adminDeletePost(id);
    setPosts((prev) => prev.map((p) => (p.id === id ? { ...p, is_deleted: true } : p)));
  };

  const handleResolve = async (id: string) => {
    await adminResolveReport(id);
    setReports((prev) => prev.map((r) => (r.id === id ? { ...r, resolved: true } : r)));
  };

  return (
    <div>
      <div className="flex border-b border-gray-200 dark:border-gray-800">
        {(['stats', 'users', 'posts', 'reports'] as Tab[]).map((t) => (
          <button key={t} onClick={() => setTab(t)} className={`flex-1 py-3 text-sm font-medium capitalize ${tab === t ? 'border-b-2 border-zumra-500 text-zumra-600' : 'text-gray-500'}`}>
            {t}
          </button>
        ))}
      </div>

      {tab === 'stats' && (
        <div className="grid grid-cols-3 gap-2 p-4 text-center">
          <div className="rounded-lg bg-gray-100 p-4 dark:bg-gray-800">
            <p className="text-xl font-bold">{stats.total_users}</p>
            <p className="text-xs text-gray-500">Users</p>
          </div>
          <div className="rounded-lg bg-gray-100 p-4 dark:bg-gray-800">
            <p className="text-xl font-bold">{stats.total_posts}</p>
            <p className="text-xs text-gray-500">Posts</p>
          </div>
          <div className="rounded-lg bg-gray-100 p-4 dark:bg-gray-800">
            <p className="text-xl font-bold">{stats.total_reports_open}</p>
            <p className="text-xs text-gray-500">Open Reports</p>
          </div>
        </div>
      )}

      {tab === 'users' && (
        <div className="p-4">
          <div className="flex gap-2">
            <input value={userQuery} onChange={(e) => setUserQuery(e.target.value)} placeholder="Search username or name" className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-900" />
            <button onClick={handleSearchUsers} className="rounded-lg bg-zumra-500 px-3 py-2 text-sm text-white">Search</button>
          </div>
          <div className="mt-3 divide-y divide-gray-100 dark:divide-gray-800">
            {users.map((u) => (
              <div key={u.id} className="flex items-center justify-between py-2">
                <div>
                  <p className="text-sm font-medium">{u.full_name} {u.is_suspended && <span className="text-red-500">(suspended)</span>}</p>
                  <p className="text-xs text-gray-500">@{u.username}</p>
                </div>
                <button onClick={() => handleSuspend(u.id, u.is_suspended)} className="text-xs font-semibold text-red-600">
                  {u.is_suspended ? 'Unsuspend' : 'Suspend'}
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {tab === 'posts' && (
        <div className="divide-y divide-gray-100 p-4 dark:divide-gray-800">
          {posts.map((p) => (
            <div key={p.id} className="flex items-center justify-between py-2">
              <div className="max-w-[70%]">
                <p className="truncate text-sm">{p.content}</p>
                <p className="text-xs text-gray-500">@{p.author?.username} {p.is_deleted && '(deleted)'}</p>
              </div>
              {!p.is_deleted && <button onClick={() => handleDeletePost(p.id)} className="text-xs font-semibold text-red-600">Delete</button>}
            </div>
          ))}
        </div>
      )}

      {tab === 'reports' && (
        <div className="divide-y divide-gray-100 p-4 dark:divide-gray-800">
          {reports.map((r) => (
            <div key={r.id} className="flex items-center justify-between py-2">
              <div>
                <p className="text-sm">{r.target_type} · {r.reason}</p>
                <p className="text-xs text-gray-500">by @{r.reporter?.username} {r.resolved && '(resolved)'}</p>
              </div>
              {!r.resolved && <button onClick={() => handleResolve(r.id)} className="text-xs font-semibold text-zumra-600">Resolve</button>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
