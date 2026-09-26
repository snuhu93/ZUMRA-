import { useCallback, useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabaseClient';
import Avatar from '@/components/Avatar';
import PostCard from '@/components/PostCard';
import SkeletonPost from '@/components/SkeletonPost';
import { fetchProfilePosts, type FeedPost } from '@/services/posts';
import {
  sendFriendRequest,
  cancelFriendRequest,
  acceptFriendRequest,
  rejectFriendRequest,
  removeFriend,
  toggleFollow,
  getRelationshipStatus,
  fetchCounts
} from '@/services/friends';
import { getOrCreateConversation } from '@/services/messages';
import { blockUser } from '@/services/moderation';
import type { Profile } from '@/types/database';

export default function ProfilePage() {
  const { username } = useParams<{ username?: string }>();
  const { user, profile: myProfile } = useAuth();
  const navigate = useNavigate();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [posts, setPosts] = useState<FeedPost[]>([]);
  const [counts, setCounts] = useState({ friends: 0, followers: 0, following: 0, posts: 0 });
  const [relationship, setRelationship] = useState({ isFriend: false, requestSentId: null as string | null, requestReceivedId: null as string | null, isFollowing: false });
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [messageBusy, setMessageBusy] = useState(false);

  const isOwnProfile = !username || username === myProfile?.username;

  const load = useCallback(async () => {
    setLoading(true);
    const targetUsername = username ?? myProfile?.username;
    if (!targetUsername) {
      setLoading(false);
      return;
    }
    const { data } = await supabase.from('profiles').select('*').ilike('username', targetUsername).maybeSingle();
    if (!data) {
      setLoading(false);
      return;
    }
    const p = data as unknown as Profile;
    setProfile(p);
    const [{ posts: pp }, c] = await Promise.all([fetchProfilePosts(p.id, null), fetchCounts(p.id)]);
    setPosts(pp);
    setCounts(c);
    if (user && user.id !== p.id) {
      const rel = await getRelationshipStatus(user.id, p.id);
      setRelationship(rel);
    }
    setLoading(false);
  }, [username, myProfile?.username, user]);

  useEffect(() => {
    load();
  }, [load]);

  const handleFriendAction = async () => {
    if (!user || !profile) return;
    setBusy(true);
    try {
      if (relationship.isFriend) {
        await removeFriend(user.id, profile.id);
      } else if (relationship.requestSentId) {
        await cancelFriendRequest(relationship.requestSentId);
      } else if (relationship.requestReceivedId) {
        await acceptFriendRequest(relationship.requestReceivedId);
      } else {
        await sendFriendRequest(user.id, profile.id);
      }
      const rel = await getRelationshipStatus(user.id, profile.id);
      setRelationship(rel);
      setCounts(await fetchCounts(profile.id));
    } finally {
      setBusy(false);
    }
  };

  const handleFollow = async () => {
    if (!user || !profile) return;
    await toggleFollow(user.id, profile.id, relationship.isFollowing);
    setRelationship((r) => ({ ...r, isFollowing: !r.isFollowing }));
    setCounts(await fetchCounts(profile.id));
  };

  const handleMessage = async () => {
    if (!user || !profile || messageBusy) return;
    setMessageBusy(true);
    try {
      const conversationId = await getOrCreateConversation(user.id, profile.id);
      navigate(`/messages/${conversationId}`);
    } catch (err: any) {
      console.error('handleMessage error:', err);
      alert(`Ba a iya buɗe message ba: ${err?.message ?? 'unknown error'}`);
    } finally {
      setMessageBusy(false);
    }
  };

  const handleBlock = async () => {
    if (!user || !profile) return;
    if (!confirm(`Block ${profile.full_name}? They won't be able to interact with you.`)) return;
    await blockUser(user.id, profile.id);
    navigate('/');
  };

  const handleShareProfile = async () => {
    if (!profile) return;
    const url = `${window.location.origin}/profile/${profile.username}`;
    if (navigator.share) await navigator.share({ url, title: profile.full_name });
    else await navigator.clipboard.writeText(url);
  };

  if (loading) return <SkeletonPost />;
  if (!profile) return <p className="p-6 text-center text-sm text-gray-500">Profile not found.</p>;

  const friendLabel = relationship.isFriend
    ? 'Friends ✓'
    : relationship.requestSentId
    ? 'Request Sent'
    : relationship.requestReceivedId
    ? 'Accept Request'
    : 'Add Friend';

  return (
    <div>
      <div className="relative h-40 w-full bg-gray-200 dark:bg-gray-800">
        {profile.cover_url && <img src={profile.cover_url} alt="" className="h-full w-full object-cover" loading="lazy" />}
        <div className="absolute -bottom-10 left-4">
          <div className="rounded-full border-4 border-white dark:border-gray-900">
            <Avatar src={profile.avatar_url} name={profile.full_name} size={80} />
          </div>
        </div>
      </div>

      <div className="px-4 pb-4 pt-12">
        <h1 className="text-lg font-bold">{profile.full_name}</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400">@{profile.username}</p>
        {profile.bio && <p className="mt-2 text-sm">{profile.bio}</p>}
        {profile.location && <p className="mt-1 text-xs text-gray-500">📍 {profile.location}</p>}
        {profile.website && (
          <a href={profile.website} target="_blank" rel="noreferrer" className="mt-1 block text-xs text-zumra-600">{profile.website}</a>
        )}

        <div className="mt-3 flex gap-4 text-sm">
          <span><b>{counts.posts}</b> Posts</span>
          <span><b>{counts.friends}</b> Friends</span>
          <span><b>{counts.followers}</b> Followers</span>
          <span><b>{counts.following}</b> Following</span>
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          {isOwnProfile ? (
            <button onClick={() => navigate('/profile/edit')} className="rounded-lg bg-zumra-500 px-4 py-2 text-sm font-semibold text-white">Edit Profile</button>
          ) : (
            <>
              <button onClick={handleFriendAction} disabled={busy} className="rounded-lg bg-zumra-500 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60">{friendLabel}</button>
              <button onClick={handleFollow} className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-semibold dark:border-gray-700">
                {relationship.isFollowing ? 'Following' : 'Follow'}
              </button>
              <button type="button" onClick={handleMessage} disabled={messageBusy} className="relative z-10 rounded-lg border border-gray-300 px-4 py-2 text-sm font-semibold dark:border-gray-700 disabled:opacity-60">
                {messageBusy ? '...' : 'Message'}
              </button>
            </>
          )}
          <button onClick={handleShareProfile} className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-semibold dark:border-gray-700">Share</button>
          {!isOwnProfile && (
            <>
              <button onClick={() => navigate(`/report?type=user&id=${profile.id}`)} className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-semibold text-red-600 dark:border-gray-700">Report</button>
              <button onClick={handleBlock} className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-semibold text-red-600 dark:border-gray-700">Block</button>
            </>
          )}
        </div>
      </div>

      <div className="border-t border-gray-200 dark:border-gray-800">
        {posts.length === 0 && <p className="p-10 text-center text-sm text-gray-500">No posts yet.</p>}
        {posts.map((post) => (
          <PostCard key={post.id} post={post} onChanged={load} />
        ))}
      </div>
    </div>
  );
    }
