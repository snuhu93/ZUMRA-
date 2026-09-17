import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabaseClient';
import Avatar from '@/components/Avatar';

interface BlockedUser {
  blocked_id: string;
  profile: { id: string; username: string; full_name: string; avatar_url: string | null } | null;
}

export default function BlockedUsers() {
  const { user } = useAuth();
  const [blocked, setBlocked] = useState<BlockedUser[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    if (!user) return;
    const { data } = await supabase
      .from('blocked_users')
      .select('blocked_id, profile:profiles!blocked_users_blocked_id_fkey(id, username, full_name, avatar_url)')
      .eq('blocker_id', user.id);
    setBlocked((data as unknown as BlockedUser[]) ?? []);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, [user]);

  const handleUnblock = async (id: string) => {
    if (!user) return;
    await supabase.from('blocked_users').delete().eq('blocker_id', user.id).eq('blocked_id', id);
    load();
  };

  return (
    <div className="p-4">
      <h1 className="mb-4 text-lg font-bold">Blocked Users</h1>
      {loading && <p className="text-sm text-gray-500">Loading...</p>}
      {!loading && blocked.length === 0 && <p className="text-sm text-gray-500">No blocked users.</p>}
      <div className="divide-y divide-gray-100 dark:divide-gray-800">
        {blocked.map((b) => (
          <div key={b.blocked_id} className="flex items-center justify-between py-3">
            <div className="flex items-center gap-3">
              <Avatar src={b.profile?.avatar_url} name={b.profile?.full_name ?? 'User'} />
              <span className="text-sm">{b.profile?.full_name}</span>
            </div>
            <button onClick={() => handleUnblock(b.blocked_id)} className="text-sm font-semibold text-zumra-600">Unblock</button>
          </div>
        ))}
      </div>
    </div>
  );
}
