import { useCallback, useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { addComment, fetchComments, type CommentRow } from '@/services/comments';
import { fetchPostById, type FeedPost } from '@/services/posts';
import PostCard from '@/components/PostCard';
import CommentItem from '@/components/CommentItem';
import SkeletonPost from '@/components/SkeletonPost';

export default function PostDetail() {
  const { postId } = useParams<{ postId: string }>();
  const { user } = useAuth();
  const [post, setPost] = useState<FeedPost | null>(null);
  const [comments, setComments] = useState<CommentRow[]>([]);
  const [text, setText] = useState('');
  const [replyTo, setReplyTo] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const load = useCallback(async () => {
    if (!postId) return;
    setLoading(true);
    try {
      const found = await fetchPostById(postId, user?.id ?? null);
      setPost(found);
      const c = await fetchComments(postId, null);
      setComments(c);
    } finally {
      setLoading(false);
    }
  }, [postId, user?.id]);

  useEffect(() => {
    load();
  }, [load]);

  const handleSubmitComment = async () => {
    if (!user || !postId || !text.trim()) return;
    setSubmitting(true);
    try {
      await addComment({ postId, authorId: user.id, content: text.trim(), parentCommentId: replyTo });
      setText('');
      setReplyTo(null);
      const c = await fetchComments(postId, null);
      setComments(c);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <SkeletonPost />;
  if (!post) return <p className="p-6 text-center text-sm text-gray-500">This post is no longer available.</p>;

  return (
    <div>
      <PostCard post={post} onChanged={load} />
      <div className="bg-white px-4 pb-4 dark:bg-gray-900">
        <h2 className="mb-2 text-sm font-semibold text-gray-500 dark:text-gray-400">Comments</h2>
        {comments.length === 0 && <p className="py-4 text-center text-sm text-gray-400">No comments yet. Be the first to reply.</p>}
        {comments
          .filter((c) => !c.parent_comment_id)
          .map((c) => (
            <div key={c.id}>
              <CommentItem comment={c} onReply={setReplyTo} onDeleted={load} />
              {comments
                .filter((r) => r.parent_comment_id === c.id)
                .map((r) => (
                  <div key={r.id} className="ml-8">
                    <CommentItem comment={r} onReply={setReplyTo} onDeleted={load} />
                  </div>
                ))}
            </div>
          ))}
      </div>

      <div className="sticky bottom-16 flex items-center gap-2 border-t border-gray-200 bg-white p-3 dark:border-gray-800 dark:bg-gray-900">
        {replyTo && (
          <button onClick={() => setReplyTo(null)} className="text-xs text-gray-400">Replying ✕</button>
        )}
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Write a comment..."
          className="flex-1 rounded-full border border-gray-300 px-4 py-2 text-sm dark:border-gray-700 dark:bg-gray-800"
        />
        <button onClick={handleSubmitComment} disabled={submitting} className="text-sm font-semibold text-zumra-600 disabled:opacity-50">
          {submitting ? 'Sending...' : 'Send'}
        </button>
      </div>
    </div>
  );
}
