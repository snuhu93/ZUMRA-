import { useState } from 'react';
import { Link } from 'react-router-dom';
import Avatar from '@/components/Avatar';
import { useAuth } from '@/contexts/AuthContext';
import { deleteComment, editComment, pinComment, toggleCommentLike, type CommentRow } from '@/services/comments';

export default function CommentItem({
  comment,
  onReply,
  onDeleted,
  onChanged,
  isPostOwner = false,
}: {
  comment: CommentRow;
  onReply: (parentId: string) => void;
  onDeleted: () => void;
  onChanged?: () => void;
  isPostOwner?: boolean;
}) {
  const { user } = useAuth();
  const [liked, setLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(comment.like_count);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(comment.content);
  const [saving, setSaving] = useState(false);

  const isAuthor = user?.id === comment.author_id;
  const isTopLevel = !comment.parent_comment_id;

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

  const handleSaveEdit = async () => {
    const text = draft.trim();
    if (!text) return;
    if (text === comment.content) {
      setEditing(false);
      return;
    }
    setSaving(true);
    try {
      await editComment(comment.id, text);
      setEditing(false);
      onChanged?.();
    } catch {
      alert('Could not save the comment. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleCancelEdit = () => {
    setDraft(comment.content);
    setEditing(false);
  };

  const handlePin = async () => {
    try {
      await pinComment(comment.id, !comment.is_pinned);
      onChanged?.();
    } catch {
      alert('Could not pin the comment. Please try again.');
    }
  };

  return (
    <div className="flex gap-2 py-2">
      <Avatar src={comment.author?.avatar_url} name={comment.author?.full_name ?? 'User'} size={32} />
      <div className="flex-1">
        {comment.is_pinned && (
          <p className="mb-1 pl-3 text-xs font-semibold text-zumra-600">📌 Pinned</p>
        )}
        <div className="rounded-2xl bg-gray-100 px-3 py-2 dark:bg-gray-800">
          <Link to={`/profile/${comment.author?.username}`} className="text-xs font-semibold">{comment.author?.full_name}</Link>
          {editing ? (
            <div className="mt-1">
              <textarea
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                rows={3}
                autoFocus
                className="w-full rounded-lg border border-gray-300 bg-white px-2 py-1 text-sm dark:border-gray-700 dark:bg-gray-900"
              />
              <div className="mt-1 flex gap-3 text-xs">
                <button onClick={handleSaveEdit} disabled={saving || !draft.trim()} className="font-semibold text-zumra-600 disabled:opacity-50">
                  {saving ? 'Saving...' : 'Save'}
                </button>
                <button onClick={handleCancelEdit} className="text-gray-500 dark:text-gray-400">Cancel</button>
              </div>
            </div>
          ) : (
            <p className="selectable whitespace-pre-wrap break-words text-sm">
              {comment.content}
              {comment.edited_at && <span className="ml-1 text-xs text-gray-400">(edited)</span>}
            </p>
          )}
        </div>
        {!editing && (
          <div className="mt-1 flex flex-wrap gap-3 pl-3 text-xs text-gray-500 dark:text-gray-400">
            <button onClick={handleLike} className={liked ? 'font-semibold text-zumra-600' : ''}>Like{likeCount > 0 ? ` (${likeCount})` : ''}</button>
            <button onClick={() => onReply(comment.id)}>Reply</button>
            {isAuthor && <button onClick={() => { setDraft(comment.content); setEditing(true); }}>Edit</button>}
            {isPostOwner && isTopLevel && (
              <button onClick={handlePin}>{comment.is_pinned ? 'Unpin' : 'Pin'}</button>
            )}
            {isAuthor && <button onClick={handleDelete} className="text-red-600">Delete</button>}
          </div>
        )}
      </div>
    </div>
  );
    }
