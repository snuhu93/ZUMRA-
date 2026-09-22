import { useState, type ChangeEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useSettings } from '@/contexts/SettingsContext';
import { createPost } from '@/services/posts';
import { uploadImage, uploadVideo, generateVideoThumbnail } from '@/services/storage';
import type { PrivacyLevel } from '@/types/database';

interface PendingMedia {
  file: File;
  type: 'image' | 'video';
  previewUrl: string;
}

export default function CreatePost() {
  const { user } = useAuth();
  const { dataSaver, isOffline } = useSettings();
  const navigate = useNavigate();
  const [content, setContent] = useState('');
  const [privacy, setPrivacy] = useState<PrivacyLevel>('public');
  const [media, setMedia] = useState<PendingMedia[]>([]);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState('');
  const [error, setError] = useState<string | null>(null);

  const handleFiles = (e: ChangeEvent<HTMLInputElement>, type: 'image' | 'video') => {
    const files = Array.from(e.target.files ?? []);
    if (type === 'image' && media.filter((m) => m.type === 'image').length + files.length > 6) {
      setError('You can attach up to 6 images per post.');
      return;
    }
    const next = files.map((file) => ({ file, type, previewUrl: URL.createObjectURL(file) }));
    setMedia((prev) => [...prev, ...next]);
    e.target.value = '';
  };

  const removeMedia = (index: number) => {
    setMedia((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async () => {
    if (!user) return;
    if (!content.trim() && media.length === 0) {
      setError('Write something or add a photo/video.');
      return;
    }
    if (isOffline) {
      setError("You're offline. Waiting for connection...");
      return;
    }
    setError(null);
    setUploading(true);
    try {
      const uploaded: { path: string; type: 'image' | 'video'; thumbnailPath?: string }[] = [];
      for (let i = 0; i < media.length; i++) {
        const m = media[i];
        setProgress(`Uploading ${i + 1} of ${media.length}...`);
        if (m.type === 'image') {
          const { path } = await uploadImage({ file: m.file, userId: user.id, bucket: 'post-images', kind: 'post', dataSaver });
          uploaded.push({ path, type: 'image' });
        } else {
          const { path } = await uploadVideo({ file: m.file, userId: user.id, dataSaver });
          let thumbnailPath: string | undefined;
          try {
            const thumbFile = await generateVideoThumbnail(m.file);
            const { path: thumbPath } = await uploadImage({
              file: thumbFile,
              userId: user.id,
              bucket: 'post-images',
              kind: 'post',
              dataSaver,
            });
            thumbnailPath = thumbPath;
          } catch {
            // If thumbnail generation fails, continue without it
          }
          uploaded.push({ path, type: 'video', thumbnailPath });
        }
      }
      setProgress('Saving post...');
      const postId = await createPost({
        authorId: user.id,
        content: content.trim(),
        privacy,
        media: uploaded.map((u) => ({ path: u.path, type: u.type, thumbnailPath: u.thumbnailPath })),
      });
      navigate(`/post/${postId}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong. Please try again.');
    } finally {
      setUploading(false);
      setProgress('');
    }
  };

  return (
    <div className="p-4">
      <h1 className="mb-4 text-lg font-bold">Create Post</h1>
      {error && <p className="mb-3 rounded-md bg-red-50 p-2 text-sm text-red-600 dark:bg-red-900/30 dark:text-red-400">{error}</p>}

      <textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        placeholder="What's on your mind?"
        rows={5}
        maxLength={5000}
        className="w-full resize-none rounded-lg border border-gray-300 bg-white p-3 text-sm dark:border-gray-700 dark:bg-gray-900"
      />

      {media.length > 0 && (
        <div className="mt-3 grid grid-cols-3 gap-2">
          {media.map((m, i) => (
            <div key={i} className="relative">
              {m.type === 'image' ? (
                <img src={m.previewUrl} alt="" className="h-24 w-full rounded-lg object-cover" />
              ) : (
                <video src={m.previewUrl} className="h-24 w-full rounded-lg object-cover" muted />
              )}
              <button
                onClick={() => removeMedia(i)}
                className="absolute -right-1 -top-1 flex h-6 w-6 items-center justify-center rounded-full bg-black/70 text-xs text-white"
                aria-label="Remove"
              >
                ×
              </button>
            </div>
          ))}
        </div>
      )}

      <div className="mt-3 flex gap-3 text-sm">
        <label className="flex cursor-pointer items-center gap-1 rounded-lg border border-gray-300 px-3 py-2 dark:border-gray-700">
          🖼️ Photo
          <input type="file" accept="image/*" multiple className="hidden" onChange={(e) => handleFiles(e, 'image')} />
        </label>
        <label className="flex cursor-pointer items-center gap-1 rounded-lg border border-gray-300 px-3 py-2 dark:border-gray-700">
          🎬 Video
          <input type="file" accept="video/*" className="hidden" onChange={(e) => handleFiles(e, 'video')} />
        </label>
      </div>

      <div className="mt-4">
        <label className="mb-1 block text-xs font-medium text-gray-500 dark:text-gray-400">Who can see this?</label>
        <select
          value={privacy}
          onChange={(e) => setPrivacy(e.target.value as PrivacyLevel)}
          className="w-full rounded-lg border border-gray-300 bg-white p-2.5 text-sm dark:border-gray-700 dark:bg-gray-900"
        >
          <option value="public">Public</option>
          <option value="friends">Friends</option>
          <option value="only_me">Only Me</option>
        </select>
      </div>

      <button
        onClick={handleSubmit}
        disabled={uploading}
        className="mt-5 w-full rounded-lg bg-zumra-500 py-3 text-sm font-semibold text-white disabled:opacity-60"
      >
        {uploading ? progress || 'Uploading...' : 'Post'}
      </button>
    </div>
  );
    }
