import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { fetchPostById, updatePost } from '@/services/posts';
import type { PrivacyLevel } from '@/types/database';

export default function EditPost() {
  const { postId } = useParams<{ postId: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [content, setContent] = useState('');
  const [privacy, setPrivacy] = useState<PrivacyLevel>('public');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!postId) return;
    fetchPostById(postId, user?.id ?? null).then((post) => {
      if (!post) {
        setError('Post not found.');
      } else if (post.author_id !== user?.id) {
        setError('You can only edit your own posts.');
      } else {
        setContent(post.content ?? '');
        setPrivacy(post.privacy);
      }
      setLoading(false);
    });
  }, [postId, user?.id]);

  const handleSave = async () => {
    if (!postId) return;
    setSaving(true);
    try {
      await updatePost(postId, content.trim(), privacy);
      navigate(`/post/${postId}`);
    } catch {
      setError('Something went wrong. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <p className="p-6 text-center text-sm text-gray-500">Loading...</p>;
  if (error) return <p className="p-6 text-center text-sm text-red-600">{error}</p>;

  return (
    <div className="p-4">
      <h1 className="mb-4 text-lg font-bold">Edit Post</h1>
      <textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        rows={5}
        maxLength={5000}
        className="w-full resize-none rounded-lg border border-gray-300 bg-white p-3 text-sm dark:border-gray-700 dark:bg-gray-900"
      />
      <select
        value={privacy}
        onChange={(e) => setPrivacy(e.target.value as PrivacyLevel)}
        className="mt-3 w-full rounded-lg border border-gray-300 bg-white p-2.5 text-sm dark:border-gray-700 dark:bg-gray-900"
      >
        <option value="public">Public</option>
        <option value="friends">Friends</option>
        <option value="only_me">Only Me</option>
      </select>
      <button onClick={handleSave} disabled={saving} className="mt-5 w-full rounded-lg bg-zumra-500 py-3 text-sm font-semibold text-white disabled:opacity-60">
        {saving ? 'Saving...' : 'Save Changes'}
      </button>
    </div>
  );
}
