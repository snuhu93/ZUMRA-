import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { sharePost } from '@/services/posts';

export default function SharePost() {
  const { postId } = useParams<{ postId: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleShare = async () => {
    if (!user || !postId) return;
    setSubmitting(true);
    try {
      await sharePost(postId, user.id, comment.trim());
      navigate('/');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCopyLink = async () => {
    if (!postId) return;
    await navigator.clipboard.writeText(`${window.location.origin}/post/${postId}`);
    navigate(-1);
  };

  return (
    <div className="p-4">
      <h1 className="mb-4 text-lg font-bold">Share Post</h1>
      <textarea
        value={comment}
        onChange={(e) => setComment(e.target.value)}
        placeholder="Say something about this (optional)"
        rows={4}
        className="w-full resize-none rounded-lg border border-gray-300 bg-white p-3 text-sm dark:border-gray-700 dark:bg-gray-900"
      />
      <button onClick={handleShare} disabled={submitting} className="mt-4 w-full rounded-lg bg-zumra-500 py-3 text-sm font-semibold text-white disabled:opacity-60">
        {submitting ? 'Sharing...' : 'Share to Feed'}
      </button>
      <button onClick={handleCopyLink} className="mt-2 w-full rounded-lg border border-gray-300 py-3 text-sm font-semibold dark:border-gray-700">
        Copy Link
      </button>
    </div>
  );
}
