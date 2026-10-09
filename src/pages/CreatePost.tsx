import { useState, type ChangeEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useSettings } from '@/contexts/SettingsContext';
import { useT } from '@/i18n';
import { createPost } from '@/services/posts';
import {
  uploadImage,
  uploadVideo,
  generateVideoThumbnail,
  toFriendlyError,
  type VideoStatus
} from '@/services/storage';
import type { PrivacyLevel } from '@/types/database';

interface PendingMedia {
  file: File;
  type: 'image' | 'video';
  previewUrl: string;
}

const BG_COLORS = ['#0F9D58', '#1565C0', '#C2185B', '#6A1B9A', '#EF6C00'];

export default function CreatePost() {
  const t = useT();
  // Falls back to English text if a translation key is missing
  const tr = (key: string, fallback: string) => {
    const value = t(key);
    return !value || value === key ? fallback : value;
  };
  const { user } = useAuth();
  const { dataSaver, isOffline } = useSettings();
  const navigate = useNavigate();
  const [content, setContent] = useState('');
  const [privacy, setPrivacy] = useState<PrivacyLevel>('public');
  const [media, setMedia] = useState<PendingMedia[]>([]);
  const [bgColor, setBgColor] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState('');
  const [error, setError] = useState<string | null>(null);

  // A colored background only applies to text-only posts.
  const activeColor = media.length === 0 ? bgColor : null;

  const handleFiles = (e: ChangeEvent<HTMLInputElement>, type: 'image' | 'video') => {
    const files = Array.from(e.target.files ?? []);
    if (type === 'image' && media.filter((m) => m.type === 'image').length + files.length > 6) {
      setError(t('max_images_error'));
      return;
    }
    const next = files.map((file) => ({ file, type, previewUrl: URL.createObjectURL(file) }));
    setMedia((prev) => [...prev, ...next]);
    e.target.value = '';
  };

  const removeMedia = (index: number) => {
    setMedia((prev) => prev.filter((_, i) => i !== index));
  };

  const statusText = (s: VideoStatus) => {
    if (s.step === 'compressing') return tr('compressing_video', 'Compressing video…');
    if (s.step === 'uploading') return tr('uploading_video', 'Uploading video…');
    return `${tr('retrying_upload', 'Retrying upload')} (${s.attempt}/${s.total})`;
  };

  const handleSubmit = async () => {
    if (!user) return;
    if (!content.trim() && media.length === 0) {
      setError(t('write_something'));
      return;
    }
    if (isOffline) {
      setError(`${t('you_are_offline')} ${t('waiting_for_connection')}`);
      return;
    }
    setError(null);
    setUploading(true);
    // Tracks which step is running so an error can say where it failed
    let step = '';
    try {
      const uploaded: { path: string; type: 'image' | 'video'; thumbnailPath?: string }[] = [];
      for (let i = 0; i < media.length; i++) {
        const m = media[i];
        const prefix =
          media.length > 1
            ? `${m.type === 'video' ? t('video') : t('photo')} ${i + 1} ${t('of')} ${media.length}: `
            : '';

        if (m.type === 'image') {
          step = 'Photo upload';
          setProgress(`${prefix}${t('uploading_photo')}`);
          const { path } = await uploadImage({ file: m.file, userId: user.id, bucket: 'post-images', kind: 'post', dataSaver });
          uploaded.push({ path, type: 'image' });
        } else {
          // Step 1: create the thumbnail first (from the original file, fast)
          let thumbnailPath: string | undefined;
          try {
            step = 'Thumbnail';
            setProgress(`${prefix}${tr('creating_thumbnail', 'Creating thumbnail…')}`);
            const [thumbFile] = await Promise.all([
              generateVideoThumbnail(m.file),
              new Promise((r) => setTimeout(r, 1200)),
            ]);
            const { path: thumbPath } = await uploadImage({
              file: thumbFile,
              userId: user.id,
              bucket: 'post-images',
              kind: 'post',
              dataSaver,
            });
            thumbnailPath = thumbPath;
          } catch (e) {
            // If thumbnail generation fails, continue without it
            console.error('Thumbnail failed', e);
          }

          // Step 2: compress, then upload the video
          step = 'Video upload';
          let currentStatus = tr('preparing_video', 'Preparing video…');
          setProgress(`${prefix}${currentStatus}`);

          const { path } = await uploadVideo({
            file: m.file,
            userId: user.id,
            dataSaver,
            onStatus: (s) => {
              currentStatus = statusText(s);
              setProgress(`${prefix}${currentStatus}`);
            },
            onProgress: (percent) => {
              setProgress(`${prefix}${currentStatus} ${Math.round(percent)}%`);
            },
          });

          uploaded.push({ path, type: 'video', thumbnailPath });
        }
      }
      step = 'Saving post';
      setProgress(t('saving'));
      const postId = await createPost({
        authorId: user.id,
        content: content.trim(),
        privacy,
        backgroundColor: activeColor,
        media: uploaded.map((u) => ({ path: u.path, type: u.type, thumbnailPath: u.thumbnailPath })),
      });
      navigate(`/post/${postId}`);
    } catch (err) {
      console.error(`CreatePost failed at step "${step}"`, err);
      const friendly = toFriendlyError(err);
      const message = friendly.message || t('something_went_wrong');
      setError(step ? `${step}: ${message}` : message);
    } finally {
      setUploading(false);
      setProgress('');
    }
  };

  return (
    <div className="p-4">
      <h1 className="mb-4 text-lg font-bold">{t('create_post')}</h1>
      {error && <p className="mb-3 rounded-md bg-red-50 p-2 text-sm text-red-600 dark:bg-red-900/30 dark:text-red-400">{error}</p>}

      {activeColor ? (
        <div
          className="flex min-h-[14rem] items-center justify-center rounded-xl p-4"
          style={{ backgroundColor: activeColor }}
        >
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder={t('whats_on_your_mind')}
            rows={4}
            maxLength={5000}
            className="w-full resize-none bg-transparent text-center text-xl font-bold text-white outline-none placeholder:text-white/70"
          />
        </div>
      ) : (
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder={t('whats_on_your_mind')}
          rows={5}
          maxLength={5000}
          className="w-full resize-none rounded-lg border border-gray-300 bg-white p-3 text-sm dark:border-gray-700 dark:bg-gray-900"
        />
      )}

      {media.length === 0 && (
        <div className="mt-3 flex gap-3">
          {BG_COLORS.map((color) => (
            <button
              key={color}
              type="button"
              onClick={() => setBgColor(bgColor === color ? null : color)}
              disabled={uploading}
              aria-label={color}
              className="h-9 w-9 rounded-full"
              style={{
                backgroundColor: color,
                outline: bgColor === color ? '3px solid #9ca3af' : 'none',
                outlineOffset: '2px'
              }}
            />
          ))}
        </div>
      )}

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
                disabled={uploading}
                className="absolute -right-1 -top-1 flex h-6 w-6 items-center justify-center rounded-full bg-black/70 text-xs text-white disabled:opacity-50"
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
          🖼️ {t('photo')}
          <input type="file" accept="image/*" multiple className="hidden" onChange={(e) => handleFiles(e, 'image')} disabled={uploading} />
        </label>
        <label className="flex cursor-pointer items-center gap-1 rounded-lg border border-gray-300 px-3 py-2 dark:border-gray-700">
          🎬 {t('video')}
          <input type="file" accept="video/*" className="hidden" onChange={(e) => handleFiles(e, 'video')} disabled={uploading} />
        </label>
      </div>

      <div className="mt-4">
        <label className="mb-1 block text-xs font-medium text-gray-500 dark:text-gray-400">{t('who_can_see')}</label>
        <select
          value={privacy}
          onChange={(e) => setPrivacy(e.target.value as PrivacyLevel)}
          className="w-full rounded-lg border border-gray-300 bg-white p-2.5 text-sm dark:border-gray-700 dark:bg-gray-900"
        >
          <option value="public">{t('public')}</option>
          <option value="friends">{t('friends')}</option>
          <option value="only_me">{t('only_me')}</option>
        </select>
      </div>

      <button
        onClick={handleSubmit}
        disabled={uploading}
        className="mt-5 w-full rounded-lg bg-zumra-500 py-3 text-sm font-semibold text-white disabled:opacity-60"
      >
        {uploading ? t('please_wait') : t('post')}
      </button>

      {/* Full-screen progress card so the status is always visible, even on small phones */}
      {uploading && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-6">
          <div className="w-full max-w-xs rounded-2xl bg-white p-6 text-center shadow-xl dark:bg-gray-900">
            <div className="mx-auto mb-4 h-10 w-10 animate-spin rounded-full border-4 border-gray-200 border-t-green-600" />
            <p className="text-sm font-medium text-gray-700 dark:text-gray-200">
              {progress || t('please_wait')}
            </p>
          </div>
        </div>
      )}
    </div>
  );
  }
