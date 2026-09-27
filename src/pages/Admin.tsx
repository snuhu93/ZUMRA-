import { useEffect, useState } from 'react';
import {
  adminSearchUsers,
  adminSuspendUser,
  adminDeleteUser,
  adminFetchPosts,
  adminDeletePost,
  adminFetchReports,
  adminResolveReport,
  adminStats,
  type AdminUserRow,
} from '@/services/admin';
import AdminAnnouncements from '@/components/AdminAnnouncements';
import Avatar from '@/components/Avatar';
import { useDebounce } from '@/hooks/useDebounce';

type Tab = 'stats' | 'users' | 'posts' | 'reports' | 'announcements';

export default function Admin() {
  const [tab, setTab] = useState<Tab>('stats');
  const [stats, setStats] = useState({ total_users: 0, total_posts: 0, total_reports_open: 0 });
  const [userQuery, setUserQuery] = useState('');
  const debouncedQuery = useDebounce(userQuery, 400);
  const [users, setUsers] = useState<AdminUserRow[]>([]);
  const [usersLoading, setUsersLoading] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [posts, setPosts] = useState<any[]>([]);
  const [reports, setReports] = useState<any[]>([]);

  useEffect(() => {
    adminStats().then(setStats);
  }, []);

  useEffect(() => {
    if (tab === 'posts') adminFetchPosts().then(setPosts);
    if (tab === 'reports') adminFetchReports().then(setReports);
  }, [tab]);

  useEffect(() => {
    if (tab !== 'users') return;
    setUsersLoading(true);
    adminSearchUsers(debouncedQuery)
      .then(setUsers)
      .finally(() => setUsersLoading(false));
  }, [tab, debouncedQuery]);

  const handleSuspend = async (id: string, suspended: boolean) => {
    await adminSuspendUser(id, !suspended);
    setUsers((prev) => prev.map((u) => (u.id === id ? { ...u, is_suspended: !suspended } : u)));
  };

  const handleDeleteUser = async (u: AdminUserRow) => {
    const confirmed = window.confirm(
      `Are you sure you want to permanently delete @${u.username}? This cannot be undone.`
    );
    if (!confirmed) return;

    setDeletingId(u.id);
    try {
      await adminDeleteUser(u.id);
      setUsers((prev) => prev.filter((x) => x.id !== u.id));
    } catch (e: any) {
      alert(e.message ?? 'Failed to delete user');
    } finally {
      setDeletingId(null);
    }
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
        {(['stats', 'users', 'posts', 'reports', 'announcements'] as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`flex-1 py-3 text-xs font-medium capitalize ${tab === t ? 'border-b-2 border-zumra-500 text-zumra-500' : 'text-gray-500'}`}
          >
            {t}
          </button>
        ))}
      </div>

      {tab === 'stats' && (
        <div className="grid grid-cols-3 gap-2 p-4 text-center">
          <div className="rounded-lg bg-gray-100 p-4 dark:bg-gray-900">
            <p className="text-xl font-bold">{stats.total_users}</p>
            <p className="text-xs text-gray-500">Users</p>
          </div>
          <div className="rounded-lg bg-gray-100 p-4 dark:bg-gray-900">
            <p className="text-xl font-bold">{stats.total_posts}</p>
            <p className="text-xs text-gray-500">Posts</p>
          </div>
          <div className="rounded-lg bg-gray-100 p-4 dark:bg-gray-900">
            <p className="text-xl font-bold">{stats.total_reports_open}</p>
            <p className="text-xs text-gray-500">Open Reports</p>
          </div>
        </div>
      )}

      {tab === 'users' && (
        <div className="p-4">
          <input
            value={userQuery}
            onChange={(e) => setUserQuery(e.target.value)}
            placeholder="Search by username or name..."
            className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm dark:border-gray-800 dark:bg-gray-900"
          />

          {usersLoading && <p className="mt-3 text-center text-xs text-gray-500">Loading...</p>}

          <div className="mt-3 divide-y divide-gray-100 dark:divide-gray-800">
            {!usersLoading && users.length === 0 && (
              <p className="py-6 text-center text-xs text-gray-500">No users found.</p>
            )}
            {users.map((u) => (
              <div key={u.id} className="flex items-center justify-between gap-2 py-3">
                <div className="flex min-w-0 items-center gap-3">
                  <Avatar src={u.avatar_url} name={u.full_name} />
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">
                      {u.full_name}
                      {u.is_admin && <span className="ml-1 text-xs text-zumra-500">(admin)</span>}
                      {u.is_suspended && <span className="ml-1 text-xs text-red-500">(suspended)</span>}
                    </p>
                    <p className="truncate text-xs text-gray-500">
                      @{u.username} · {u.post_count} posts
                    </p>
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-3">
                  <button
                    onClick={() => handleSuspend(u.id, u.is_suspended)}
                    className="text-xs font-semibold text-amber-500"
                  >
                    {u.is_suspended ? 'Unsuspend' : 'Suspend'}
                  </button>
                  {!u.is_admin && (
                    <button
                      onClick={() => handleDeleteUser(u)}
                      disabled={deletingId === u.id}
                      className="text-xs font-semibold text-red-500 disabled:opacity-50"
                    >
                      {deletingId === u.id ? 'Deleting...' : 'Delete'}
                    </button>
                  )}
                </div>
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
                <p className="text-xs text-gray-500">
                  @{p.author?.username} {p.is_deleted && '(deleted)'}
                </p>
              </div>
              {!p.is_deleted && (
                <button onClick={() => handleDeletePost(p.id)} className="text-xs font-semibold text-red-500">
                  Delete
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {tab === 'reports' && (
        <div className="divide-y divide-gray-100 p-4 dark:divide-gray-800">
          {reports.map((r) => (
            <div key={r.id} className="flex items-center justify-between py-2">
              <div>
                <p className="text-sm">
                  {r.target_type} - {r.reason}
                </p>
                <p className="text-xs text-gray-500">
                  by @{r.reporter?.username} {r.resolved && '(resolved)'}
                </p>
              </div>
              {!r.resolved && (
                <button onClick={() => handleResolve(r.id)} className="text-xs font-semibold text-zumra-500">
                  Resolve
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {tab === 'announcements' && <AdminAnnouncements />}
    </div>
  );
         }
