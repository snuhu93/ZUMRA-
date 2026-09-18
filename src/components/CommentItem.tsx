import { useState } from 'react';
import { Link } from 'react-router-dom';
import Avatar from '@/components/Avatar';
import { useAuth } from '@/contexts/AuthContext';
import { deleteComment, toggleCommentLike, type CommentRow } from '@/services/comments';

export default function CommentItem({ comment, onReply, onDeleted }: { comment: CommentRow; onReply: (parentId: string) => void; onDeleted: () => void }) {
  const { user } = useAuth();
  const [liked, setLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(comment.like_count);

  const handleLike = async () => {
    if (!user) return;
    const next = !liked;
    setLiked(next);
    setLikeCount((c) => c + (next ? 1 : -1));
    try {
      await toggleCommentLike(comment.id, user.id, liked);
    } catch {
      setLiked(!next);
      setLikeCount((c) => c + (next ? -1 : 1));
    }
  };

  const handleDelete = async () => {
    await deleteComment(comment.id);
    onDeleted();
  };

  return (
    <div className="flex gap-2 py-2">
      <Avatar src={comment.author?.avatar_url} name={comment.author?.full_name ?? 'User'} size={32} />
      <div className="flex-1">
        <div className="rounded-2xl bg-gray-100 px-3 py-2 dark:bg-gray-800">
          <Link to={`/profile/${comment.author?.username}`} className="text-xs font-semibold">{comment.author?.full_name}</Link>
          <p className="text-sm">{comment.content}</p>
        </div>
        <div className="mt-1 flex gap-3 pl-3 text-xs text-gray-500 dark:text-gray-400">
          <button onClick={handleLike} className={liked ? 'font-semibold text-zumra-600' : ''}>Like{likeCount > 0 ? ` (${likeCount})` : ''}</button>
          <button onClick={() => onReply(comment.id)}>Reply</button>
          {user?.id === comment.author_id && <button onClick={handleDelete} className="text-red-600">Delete</button>}
        </div>
      </div>
    </div>
  );
}
