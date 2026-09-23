import { supabase } from '@/lib/supabaseClient';
import type { PrivacyLevel } from '@/types/database';

const PAGE_SIZE = 8; // small pages -- avoid loading hundreds of posts on slow connections

export interface FeedPost {
  id: string;
  author_id: string;
  content: string | null;
  privacy: PrivacyLevel;
  shared_post_id: string | null;
  like_count: number;
  comment_count: number;
  share_count: number;
  created_at: string;
  author: { id: string; username: string; full_name: string; avatar_url: string | null } | null;
  post_media: { id: string; media_type: 'image' | 'video'; storage_path: string; thumbnail_path: string | null; position: number }[];
  liked_by_me?: boolean;
  saved_by_me?: boolean;
}

/** Fetch one page of the home feed, newest first, cursor-based on created_at. */
export async function fetchFeed(cursor: string | null, userId: string | null): Promise<{ posts: FeedPost[]; nextCursor: string | null }> {
  let query = supabase
    .from('posts')
    .select(`
      id, author_id, content, privacy, shared_post_id, like_count, comment_count, share_count, created_at,
      author:profiles!posts_author_id_fkey(id, username, full_name, avatar_url),
      post_media(id, media_type, storage_path, thumbnail_path, position)
    `)
    .eq('is_deleted', false)
    .order('created_at', { ascending: false })
    .limit(PAGE_SIZE);

  if (cursor) query = query.lt('created_at', cursor);

  const { data, error } = await query;
  if (error) throw error;
  const posts = (data ?? []) as unknown as FeedPost[];

  if (userId && posts.length) {
    const ids = posts.map((p) => p.id);
    const [{ data: likes }, { data: saves }] = await Promise.all([
      supabase.from('post_likes').select('post_id').eq('user_id', userId).in('post_id', ids),
      supabase.from('saved_posts').select('post_id').eq('user_id', userId).in('post_id', ids)
    ]);
    const likedSet = new Set(likes?.map((l) => l.post_id));
    const savedSet = new Set(saves?.map((s) => s.post_id));
    posts.forEach((p) => {
      p.liked_by_me = likedSet.has(p.id);
      p.saved_by_me = savedSet.has(p.id);
    });
  }

  const nextCursor = posts.length === PAGE_SIZE ? posts[posts.length - 1].created_at : null;
  return { posts, nextCursor };
}

/** Fetch one page of video-only posts for Reels, newest first, cursor-based on created_at. */
export async function fetchVideoFeed(cursor: string | null, userId: string | null): Promise<{ posts: FeedPost[]; nextCursor: string | null }> {
  let query = supabase
    .from('posts')
    .select(`
      id, author_id, content, privacy, shared_post_id, like_count, comment_count, share_count, created_at,
      author:profiles!posts_author_id_fkey(id, username, full_name, avatar_url),
      post_media!inner(id, media_type, storage_path, thumbnail_path, position)
    `)
    .eq('is_deleted', false)
    .eq('post_media.media_type', 'video')
    .order('created_at', { ascending: false })
    .limit(PAGE_SIZE);

  if (cursor) query = query.lt('created_at', cursor);

  const { data, error } = await query;
  if (error) throw error;
  const posts = (data ?? []) as unknown as FeedPost[];

  if (userId && posts.length) {
    const ids = posts.map((p) => p.id);
    const [{ data: likes }, { data: saves }] = await Promise.all([
      supabase.from('post_likes').select('post_id').eq('user_id', userId).in('post_id', ids),
      supabase.from('saved_posts').select('post_id').eq('user_id', userId).in('post_id', ids)
    ]);
    const likedSet = new Set(likes?.map((l) => l.post_id));
    const savedSet = new Set(saves?.map((s) => s.post_id));
    posts.forEach((p) => {
      p.liked_by_me = likedSet.has(p.id);
      p.saved_by_me = savedSet.has(p.id);
    });
  }

  const nextCursor = posts.length === PAGE_SIZE ? posts[posts.length - 1].created_at : null;
  return { posts, nextCursor };
}

export async function fetchPostById(postId: string, userId: string | null): Promise<FeedPost | null> {
  const { data, error } = await supabase
    .from('posts')
    .select(`
      id, author_id, content, privacy, shared_post_id, like_count, comment_count, share_count, created_at,
      author:profiles!posts_author_id_fkey(id, username, full_name, avatar_url),
      post_media(id, media_type, storage_path, thumbnail_path, position)
    `)
    .eq('id', postId)
    .eq('is_deleted', false)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  const post = data as unknown as FeedPost;

  if (userId) {
    const [{ data: like }, { data: save }] = await Promise.all([
      supabase.from('post_likes').select('post_id').eq('user_id', userId).eq('post_id', postId).maybeSingle(),
      supabase.from('saved_posts').select('post_id').eq('user_id', userId).eq('post_id', postId).maybeSingle()
    ]);
    post.liked_by_me = !!like;
    post.saved_by_me = !!save;
  }
  return post;
}

export async function fetchProfilePosts(authorId: string, cursor: string | null) {
  let query = supabase
    .from('posts')
    .select(`
      id, author_id, content, privacy, shared_post_id, like_count, comment_count, share_count, created_at,
      author:profiles!posts_author_id_fkey(id, username, full_name, avatar_url),
      post_media(id, media_type, storage_path, thumbnail_path, position)
    `)
    .eq('author_id', authorId)
    .eq('is_deleted', false)
    .order('created_at', { ascending: false })
    .limit(PAGE_SIZE);
  if (cursor) query = query.lt('created_at', cursor);
  const { data, error } = await query;
  if (error) throw error;
  const posts = (data ?? []) as unknown as FeedPost[];
  const nextCursor = posts.length === PAGE_SIZE ? posts[posts.length - 1].created_at : null;
  return { posts, nextCursor };
}

export async function createPost(params: {
  authorId: string;
  content: string;
  privacy: PrivacyLevel;
  media: { path: string; type: 'image' | 'video'; thumbnailPath?: string | null }[];
}) {
  const { data: post, error } = await supabase
    .from('posts')
    .insert({ author_id: params.authorId, content: params.content, privacy: params.privacy })
    .select('id')
    .single();
  if (error) throw error;

  if (params.media.length) {
    const rows = params.media.map((m, i) => ({
      post_id: post.id,
      media_type: m.type,
      storage_path: m.path,
      thumbnail_path: m.thumbnailPath ?? null,
      position: i
    }));
    const { error: mediaError } = await supabase.from('post_media').insert(rows);
    if (mediaError) throw mediaError;
  }
  return post.id as string;
}

export async function updatePost(postId: string, content: string, privacy: PrivacyLevel) {
  const { error } = await supabase.from('posts').update({ content, privacy, updated_at: new Date().toISOString() }).eq('id', postId);
  if (error) throw error;
}

export async function deletePost(postId: string) {
  // Soft delete keeps referential integrity for shares/comments while hiding the post.
  const { error } = await supabase.from('posts').update({ is_deleted: true }).eq('id', postId);
  if (error) throw error;
}

export async function toggleLike(postId: string, userId: string, currentlyLiked: boolean) {
  if (currentlyLiked) {
    const { error } = await supabase.from('post_likes').delete().eq('post_id', postId).eq('user_id', userId);
    if (error) throw error;
  } else {
    const { error } = await supabase.from('post_likes').insert({ post_id: postId, user_id: userId });
    if (error) throw error;
    const { data: post } = await supabase.from('posts').select('author_id').eq('id', postId).single();
    if (post && post.author_id !== userId) {
      await supabase.from('notifications').insert({
        recipient_id: post.author_id,
        actor_id: userId,
        type: 'post_like',
        entity_id: postId
      });
    }
  }
}

export async function toggleSave(postId: string, userId: string, currentlySaved: boolean) {
  if (currentlySaved) {
    const { error } = await supabase.from('saved_posts').delete().eq('post_id', postId).eq('user_id', userId);
    if (error) throw error;
  } else {
    const { error } = await supabase.from('saved_posts').insert({ post_id: postId, user_id: userId });
    if (error) throw error;
  }
}

export async function sharePost(originalPostId: string, userId: string, comment: string) {
  const { data: original } = await supabase.from('posts').select('author_id').eq('id', originalPostId).single();

  const { data: post, error } = await supabase
    .from('posts')
    .insert({ author_id: userId, content: comment, privacy: 'public', shared_post_id: originalPostId })
    .select('id')
    .single();
  if (error) throw error;

  await supabase.rpc('increment_share_count', { p_post_id: originalPostId });

  if (original && original.author_id !== userId) {
    await supabase.from('notifications').insert({ recipient_id: original.author_id, actor_id: userId, type: 'post_share', entity_id: originalPostId });
  }
  return post.id as string;
    }
