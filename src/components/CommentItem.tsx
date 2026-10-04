import { useRef, useState } from 'react';
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
  const [menuOpen, setMenuOpen] = useState(false);
  const pressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const isAuthor = user?.id === comment.author_id;
  const isTopLevel = !comment.parent_comment_id;

  // Long press on the comment opens the menu
  const startPress = () => {
    if (editing) return;
    clearPress();
    pressTimer.current = setTimeout(() => setMenuOpen(true), 450);
  };
  const clearPress = () => {
    if (pressTimer.current) {
      clearTimeout(pressTimer.current);
      pressTimer.current = null;
    }
  };

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
    setMenuOpen(false);
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
    setMenuOpen(false);
    try {
      await pinComment(comment.id, !comment.is_pinned);
      onChanged?.();
    } catch {
      alert('Could not pin the comment. Please try again.');
    }
  };

  const handleCopy = async () => {
    setMenuOpen(false);
    try {
      await navigator.clipboard.writeText(comment.content);
    } catch {
      // clipboard not available, ignore
    }
  };

  const handleShare = async () => {
    setMenuOpen(false);
    const url = `${window.location.origin}/post/${comment.post_id}`;
    if (navigator.share) {
      try {
        await navigator.share({ title: comment.author?.full_name ?? 'Zumra', text: comment.content, url });
      } catch {
        // user cancelled the share sheet
      }
    } else {
      try {
        await navigator.clipboard.writeText(`${comment.content}\n${url}`);
        alert('Copied to clipboard');
      } catch {
        // ignore
      }
    }
  };

  const menuItemClass = 'block w-full px-5 py-3 text-left text-base hover:bg-gray-50 dark:hover:bg-gray-700';

  return (
    <div className="flex gap-2 py-2">
      <Avatar src={comment.author?.avatar_url} name={comment.author?.full_name ?? 'User'} size={32} />
      <div className="flex-1">
        {comment.is_pinned && (
          <p className="mb-1 pl-3 text-xs font-semibold text-zumra-600">📌 Pinned</p>
        )}
        <div
          className="rounded-2xl bg-gray-100 px-3 py-2 dark:bg-gray-800"
          onTouchStart={startPress}
          onTouchEnd={clearPress}
          onTouchMove={clearPress}
          onTouchCancel={clearPress}
          onContextMenu={(e) => {
            if (editing) return;
            e.preventDefault();
            clearPress();
            setMenuOpen(true);
          }}
        >
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
            <p className="whitespace-pre-wrap break-words text-sm">
              {comment.content}
              {comment.edited_at && <span className="ml-1 text-xs text-gray-400">(edited)</span>}
            </p>
          )}
        </div>
        {!editing && (
          <div className="mt-1 flex gap-3 pl-3 text-xs text-gray-500 dark:text-gray-400">
            <button onClick={handleLike} className={liked ? 'font-semibold text-zumra-600' : ''}>Like{likeCount > 0 ? ` (${likeCount})` : ''}</button>
            <button onClick={() => onReply(comment.id)}>Reply</button>
          </div>
        )}
      </div>

      {menuOpen && (
        <div
          className="fixed inset-0 z-[100] flex items-end justify-center bg-black/50"
          onClick={() => setMenuOpen(false)}
        >
          <div
            className="w-full max-w-md overflow-hidden rounded-t-2xl bg-white pb-4 dark:bg-gray-800"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mx-auto my-2 h-1 w-10 rounded-full bg-gray-300 dark:bg-gray-600" />
            <button
              className={menuItemClass}
              onClick={() => { setMenuOpen(false); onReply(comment.id); }}
            >
              Reply
            </button>
            <button className={menuItemClass} onClick={handleCopy}>Copy</button>
            <button className={menuItemClass} onClick={handleShare}>Share</button>
            {isAuthor && (
              <button
                className={menuItemClass}
                onClick={() => { setMenuOpen(false); setDraft(comment.content); setEditing(true); }}
              >
                Edit
              </button>
            )}
            {isPostOwner && isTopLevel && (
              <button className={menuItemClass} onClick={handlePin}>
                {comment.is_pinned ? 'Unpin' : 'Pin'}
              </button>
            )}
            {isAuthor && (
              <button className={`${menuItemClass} text-red-600`} onClick={handleDelete}>Delete</button>
            )}
          </div>
        </div>
      )}
    </div>
  );
         }
