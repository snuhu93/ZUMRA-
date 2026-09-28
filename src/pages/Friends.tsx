import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import Avatar from '@/components/Avatar';
import { useAuth } from '@/contexts/AuthContext';
import {
  fetchIncomingRequests,
  fetchFriends,
  fetchSuggestedFriends,
  acceptFriendRequest,
  rejectFriendRequest,
  sendFriendRequest,
  cancelFriendRequest,
  getRelationshipStatus,
  type PublicProfileLite
} from '@/services/friends';

type Tab = 'requests' | 'friends' | 'suggested';

export default function Friends() {
  const { user } = useAuth();
  const [tab, setTab] = useState<Tab>('requests');
  const [requests, setRequests] = useState<any[]>([]);
  const [friends, setFriends] = useState<PublicProfileLite[]>([]);
  const [suggested, setSuggested] = useState<PublicProfileLite[]>([]);
  // userId -> id na friend request da aka aika masa
  const [sentMap, setSentMap] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [pendingId, setPendingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const [reqs, fr] = await Promise.all([
        fetchIncomingRequests(user.id),
        fetchFriends(user.id)
      ]);
      setRequests(reqs);
      setFriends(fr);
      const excludeIds = [...fr.map((f) => f.id), ...reqs.map((r: any) => r.sender.id)];
      const sug = await fetchSuggestedFriends(user.id, excludeIds);
      setSuggested(sug);

      // Gano waɗanda aka riga aka aika musu request, don su nuna "Request Sent"
      const rels = await Promise.all(
        sug.map(async (s) => {
          try {
            const rel = await getRelationshipStatus(user.id, s.id);
            return [s.id, rel.requestSentId] as const;
          } catch {
            return [s.id, null] as const;
          }
        })
      );
      const map: Record<string, string> = {};
      for (const [id, reqId] of rels) {
        if (reqId) map[id] = reqId;
      }
      setSentMap(map);
    } catch (err) {
      console.error('Friends load error:', err);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    load();
  }, [load]);

  const handleAccept = async (id: string) => {
    try {
      setPendingId(id);
      await acceptFriendRequest(id);
      load();
    } catch (err) {
      console.error('Accept friend error:', err);
      alert('An kasa amincewa da buƙatar: ' + (err as Error).message);
    } finally {
      setPendingId(null);
    }
  };

  const handleReject = async (id: string) => {
    try {
      setPendingId(id);
      await rejectFriendRequest(id);
      load();
    } catch (err) {
      console.error('Reject friend error:', err);
      alert('An kasa ƙin buƙatar: ' + (err as Error).message);
    } finally {
      setPendingId(null);
    }
  };

  const handleAdd = async (id: string) => {
    if (!user) return;
    try {
      setPendingId(id);
      await sendFriendRequest(user.id, id);
      const rel = await getRelationshipStatus(user.id, id);
      if (rel.requestSentId) {
        setSentMap((m) => ({ ...m, [id]: rel.requestSentId as string }));
      }
    } catch (err) {
      console.error('Add friend error:', err);
      alert('An kasa aika friend request: ' + (err as Error).message);
    } finally {
      setPendingId(null);
    }
  };

  const handleCancel = async (id: string) => {
    const requestId = sentMap[id];
    if (!requestId) return;
    try {
      setPendingId(id);
      await cancelFriendRequest(requestId);
      setSentMap((m) => {
        const next = { ...m };
        delete next[id];
        return next;
      });
    } catch (err) {
      console.error('Cancel friend request error:', err);
      alert('An kasa soke request: ' + (err as Error).message);
    } finally {
      setPendingId(null);
    }
  };

  return (
    <div>
      <div className="flex border-b border-gray-200 dark:border-gray-800">
        {(['requests', 'friends', 'suggested'] as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`flex-1 py-3 text-sm font-medium capitalize ${
              tab === t
                ? 'border-b-2 border-zumra-500 text-zumra-600'
                : 'text-gray-500'
            }`}
          >
            {t === 'requests'
              ? `Requests${requests.length ? ` (${requests.length})` : ''}`
              : t}
          </button>
        ))}
      </div>

      {loading && (
        <p className="p-6 text-center text-sm text-gray-500">Loading...</p>
      )}

      {!loading && tab === 'requests' && (
        <div className="divide-y divide-gray-100 dark:divide-gray-800">
          {requests.length === 0 && (
            <p className="p-10 text-center text-sm text-gray-500">
              You don't have any friend requests.
            </p>
          )}
          {requests.map((r) => (
            <div key={r.id} className="flex items-center justify-between p-4">
              <Link to={`/profile/${r.sender.username}`} className="flex items-center gap-3">
                <Avatar src={r.sender.avatar_url} name={r.sender.full_name} />
                <span className="text-sm font-medium">{r.sender.full_name}</span>
              </Link>
              <div className="flex gap-2">
                <button
                  disabled={pendingId === r.id}
                  onClick={() => handleAccept(r.id)}
                  className="rounded-lg bg-zumra-500 px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-50"
                >
                  {pendingId === r.id ? '...' : 'Accept'}
                </button>
                <button
                  disabled={pendingId === r.id}
                  onClick={() => handleReject(r.id)}
                  className="rounded-lg border border-gray-300 px-3 py-1.5 text-xs dark:border-gray-700 disabled:opacity-50"
                >
                  Reject
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {!loading && tab === 'friends' && (
        <div className="divide-y divide-gray-100 dark:divide-gray-800">
          {friends.length === 0 && (
            <p className="p-10 text-center text-sm text-gray-500">No friends yet.</p>
          )}
          {friends.map((f) => (
            <Link key={f.id} to={`/profile/${f.username}`} className="flex items-center gap-3 p-4">
              <Avatar src={f.avatar_url} name={f.full_name} />
              <span className="text-sm font-medium">{f.full_name}</span>
            </Link>
          ))}
        </div>
      )}

      {!loading && tab === 'suggested' && (
        <div className="divide-y divide-gray-100 dark:divide-gray-800">
          {suggested.length === 0 && (
            <p className="p-10 text-center text-sm text-gray-500">No suggestions right now.</p>
          )}
          {suggested.map((s) => {
            const sent = !!sentMap[s.id];
            return (
              <div key={s.id} className="flex items-center justify-between p-4">
                <Link to={`/profile/${s.username}`} className="flex items-center gap-3">
                  <Avatar src={s.avatar_url} name={s.full_name} />
                  <span className="text-sm font-medium">{s.full_name}</span>
                </Link>
                <button
                  disabled={pendingId === s.id}
                  onClick={() => (sent ? handleCancel(s.id) : handleAdd(s.id))}
                  className={
                    sent
                      ? 'rounded-lg border border-gray-300 px-3 py-1.5 text-xs font-semibold dark:border-gray-700 disabled:opacity-50'
                      : 'rounded-lg bg-zumra-500 px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-50'
                  }
                >
                  {pendingId === s.id ? '...' : sent ? 'Request Sent' : 'Add Friend'}
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
        }
