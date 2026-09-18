import { supabase } from '@/lib/supabaseClient';

export type PublicProfileLite = { id: string; username: string; full_name: string; avatar_url: string | null };

export async function sendFriendRequest(senderId: string, receiverId: string) {
  const { error } = await supabase.from('friend_requests').insert({ sender_id: senderId, receiver_id: receiverId });
  if (error) throw error;
  await supabase.from('notifications').insert({ recipient_id: receiverId, actor_id: senderId, type: 'friend_request' });
}

export async function cancelFriendRequest(requestId: string) {
  const { error } = await supabase.from('friend_requests').delete().eq('id', requestId);
  if (error) throw error;
}

export async function rejectFriendRequest(requestId: string) {
  const { error } = await supabase.from('friend_requests').update({ status: 'rejected' }).eq('id', requestId);
  if (error) throw error;
}

export async function acceptFriendRequest(requestId: string) {
  const { error } = await supabase.rpc('accept_friend_request', { p_request_id: requestId });
  if (error) throw error;
}

export async function removeFriend(userIdA: string, userIdB: string) {
  const a = userIdA < userIdB ? userIdA : userIdB;
  const b = userIdA < userIdB ? userIdB : userIdA;
  const { error } = await supabase.from('friends').delete().eq('user_id_a', a).eq('user_id_b', b);
  if (error) throw error;
}

export async function fetchIncomingRequests(userId: string) {
  const { data, error } = await supabase
    .from('friend_requests')
    .select('id, created_at, sender:profiles!friend_requests_sender_id_fkey(id, username, full_name, avatar_url)')
    .eq('receiver_id', userId)
    .eq('status', 'pending')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function fetchFriends(userId: string) {
  const { data, error } = await supabase
    .from('friends')
    .select('user_id_a, user_id_b')
    .or(`user_id_a.eq.${userId},user_id_b.eq.${userId}`);
  if (error) throw error;
  const otherIds = (data ?? []).map((row) => (row.user_id_a === userId ? row.user_id_b : row.user_id_a));
  if (!otherIds.length) return [];
  const { data: profiles, error: profileError } = await supabase
    .from('profiles')
    .select('id, username, full_name, avatar_url')
    .in('id', otherIds);
  if (profileError) throw profileError;
  return (profiles ?? []) as PublicProfileLite[];
}

export async function fetchSuggestedFriends(userId: string, excludeIds: string[]) {
  const { data, error } = await supabase
    .from('profiles')
    .select('id, username, full_name, avatar_url')
    .neq('id', userId)
    .not('id', 'in', `(${[userId, ...excludeIds].join(',') || userId})`)
    .limit(10);
  if (error) throw error;
  return (data ?? []) as PublicProfileLite[];
}

export async function toggleFollow(followerId: string, followingId: string, currentlyFollowing: boolean) {
  if (currentlyFollowing) {
    const { error } = await supabase.from('followers').delete().eq('follower_id', followerId).eq('following_id', followingId);
    if (error) throw error;
  } else {
    const { error } = await supabase.from('followers').insert({ follower_id: followerId, following_id: followingId });
    if (error) throw error;
    await supabase.from('notifications').insert({ recipient_id: followingId, actor_id: followerId, type: 'new_follower' });
  }
}

export async function getRelationshipStatus(viewerId: string, targetId: string) {
  const [{ data: friendRow }, { data: sentReq }, { data: receivedReq }, { data: followRow }] = await Promise.all([
    supabase
      .from('friends')
      .select('*')
      .eq('user_id_a', viewerId < targetId ? viewerId : targetId)
      .eq('user_id_b', viewerId < targetId ? targetId : viewerId)
      .maybeSingle(),
    supabase.from('friend_requests').select('id').eq('sender_id', viewerId).eq('receiver_id', targetId).eq('status', 'pending').maybeSingle(),
    supabase.from('friend_requests').select('id').eq('sender_id', targetId).eq('receiver_id', viewerId).eq('status', 'pending').maybeSingle(),
    supabase.from('followers').select('follower_id').eq('follower_id', viewerId).eq('following_id', targetId).maybeSingle()
  ]);
  return {
    isFriend: !!friendRow,
    requestSentId: sentReq?.id ?? null,
    requestReceivedId: receivedReq?.id ?? null,
    isFollowing: !!followRow
  };
}

export async function fetchCounts(userId: string) {
  const [{ count: friendsA }, { count: friendsB }, { count: followers }, { count: following }, { count: posts }] = await Promise.all([
    supabase.from('friends').select('*', { count: 'exact', head: true }).eq('user_id_a', userId),
    supabase.from('friends').select('*', { count: 'exact', head: true }).eq('user_id_b', userId),
    supabase.from('followers').select('*', { count: 'exact', head: true }).eq('following_id', userId),
    supabase.from('followers').select('*', { count: 'exact', head: true }).eq('follower_id', userId),
    supabase.from('posts').select('*', { count: 'exact', head: true }).eq('author_id', userId).eq('is_deleted', false)
  ]);
  return {
    friends: (friendsA ?? 0) + (friendsB ?? 0),
    followers: followers ?? 0,
    following: following ?? 0,
    posts: posts ?? 0
  };
}
