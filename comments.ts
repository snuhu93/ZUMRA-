import { supabase } from '@/lib/supabaseClient';

const PAGE_SIZE = 15;

export interface CommentRow {
  id: string;
  post_id: string;
  author_id: string;
  parent_comment_id: string | null;
  content: string;
  like_count: number;
  created_at: string;
  author: { id: string; username: string; full_name: string; avatar_url: string | null } | null;
}

export async function fetchComments(postId: string, cursor: string | null) {
  let query = supabase
    .from('comments')
    .select(`id, post_id, author_id, parent_comment_id, content, like_count, created_at,
      author:profiles!comments_author_id_fkey(id, username, full_name, avatar_url)`)
    .eq('post_id', postId)
    .eq('is_deleted', false)
    .order('created_at', { ascending: true })
    .limit(PAGE_SIZE);
  if (cursor) query = query.gt('created_at', cursor);
  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []) as unknown as CommentRow[];
}

export async function addComment(params: { postId: string; authorId: string; content: string; parentCommentId?: string | null }) {
  const { data, error } = await supabase
    .from('comments')
    .insert({ post_id: params.postId, author_id: params.authorId, content: params.content, parent_comment_id: params.parentCommentId ?? null })
    .select('id')
    .single();
  if (error) throw error;

  const { data: post } = await supabase.from('posts').select('author_id').eq('id', params.postId).single();
  if (post && post.author_id !== params.authorId) {
    await supabase.from('notifications').insert({
      recipient_id: post.author_id,
      actor_id: params.authorId,
      type: params.parentCommentId ? 'comment_reply' : 'comment',
      entity_id: params.postId
    });
  }
  return data.id as string;
}

export async function deleteComment(commentId: string) {
  const { error } = await supabase.from('comments').update({ is_deleted: true }).eq('id', commentId);
  if (error) throw error;
}

export async function toggleCommentLike(commentId: string, userId: string, currentlyLiked: boolean) {
  if (currentlyLiked) {
    const { error } = await supabase.from('comment_likes').delete().eq('comment_id', commentId).eq('user_id', userId);
    if (error) throw error;
  } else {
    const { error } = await supabase.from('comment_likes').insert({ comment_id: commentId, user_id: userId });
    if (error) throw error;
  }
}
