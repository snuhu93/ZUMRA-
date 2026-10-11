import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { fetchScheduledPosts, cancelScheduledPost, type FeedPost } from '@/services/posts';
import { getPublicUrl, deleteFile } from '@/services/storage';
import { useLang, useT, type Lang } from '@/i18n';

// Texts for this page live here, so the big i18n file does not need to change
const TEXT: Record<
  Lang,
  {
    title: string;
    empty: string;
    create: string;
    cancel: string;
    confirm: string;
    cancelling: string;
    publishesOn: string;
    mediaOnly: string;
    loadError: string;
  }
> = {
  en: {
    title: 'Scheduled posts',
    empty: 'You have no scheduled posts.',
    create: 'Schedule a post',
    cancel: 'Cancel post',
    confirm: 'Cancel this scheduled post? It will not be published.',
    cancelling: 'Cancelling...',
    publishesOn: 'Publishes on',
    mediaOnly: 'Photo/video only',
    loadError: 'Could not load your scheduled posts.'
  },
  ha: {
    title: 'Wallafoyin da aka tsara',
    empty: 'Ba ka da wallafar da aka tsara.',
    create: 'Tsara wallafa',
    cancel: 'Soke wallafa',
    confirm: 'A soke wannan wallafar da aka tsara? Ba za a wallafa ta ba.',
    cancelling: 'Ana sokewa...',
    publishesOn: 'Za a wallafa a',
    mediaOnly: 'Hoto/bidiyo kawai',
    loadError: 'An kasa loda wallafoyinka da aka tsara.'
  },
  fr: {
    title: 'Publications programmées',
    empty: "Vous n'avez aucune publication programmée.",
    create: 'Programmer une publication',
    cancel: 'Annuler la publication',
    confirm: 'Annuler cette publication programmée ? Elle ne sera pas publiée.',
    cancelling: 'Annulation...',
    publishesOn: 'Publication le',
    mediaOnly: 'Photo/vidéo uniquement',
    loadError: 'Impossible de charger vos publications programmées.'
  },
  ar: {
    title: 'المنشورات المجدولة',
    empty: 'ليس لديك منشورات مجدولة.',
    create: 'جدولة منشور',
    cancel: 'إلغاء المنشور',
    confirm: 'إلغاء هذا المنشور المجدول؟ لن يتم نشره.',
    cancelling: 'جارٍ الإلغاء...',
    publishesOn: 'سيُنشر في',
    mediaOnly: 'صورة/فيديو فقط',
    loadError: 'تعذّر تحميل منشوراتك المجدولة.'
  },
  yo: {
    title: 'Àwọn ìfìwéránṣẹ́ tí a ṣètò',
    empty: 'O kò ní ìfìwéránṣẹ́ tí a ṣètò.',
    create: 'Ṣètò ìfìwéránṣẹ́',
    cancel: 'Fagilé ìfìwéránṣẹ́',
    confirm: 'Fagilé ìfìwéránṣẹ́ tí a ṣètò yìí? A kò ní tẹ̀ ẹ́ jáde.',
    cancelling: 'Ń fagilé...',
    publishesOn: 'A ó tẹ̀ ẹ́ jáde ní',
    mediaOnly: 'Fọ́tò/fídíò nìkan',
    loadError: 'A kò lè gbé àwọn ìfìwéránṣẹ́ tí o ṣètò wá.'
  },
  ig: {
    title: 'Ederede ndị e hazịrị',
    empty: 'Ọ nweghị ederede e hazịrị.',
    create: 'Hazie ederede',
    cancel: 'Kagbuo ederede',
    confirm: 'Kagbuo ederede e hazịrị a? A gaghị ebipụta ya.',
    cancelling: 'Na-akagbu...',
    publishesOn: 'A ga-ebipụta ya na',
    mediaOnly: 'Foto/vidiyo naanị',
    loadError: 'Enweghị ike ibu ederede gị e hazịrị.'
  }
};

export default function ScheduledPosts() {
  const t = useT();
  const lang = useLang();
  const text = TEXT[lang] ?? TEXT.en;
  const { user } = useAuth();
  const navigate = useNavigate();

  const [posts, setPosts] = useState<FeedPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadFailed, setLoadFailed] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [cancellingId, setCancellingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    setLoadFailed(false);
    try {
      const data = await fetchScheduledPosts(user.id);
      setPosts(data);
    } catch (e) {
      console.error('Load scheduled posts failed', e);
      setLoadFailed(true);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    load();
  }, [load]);

  const handleCancel = async (post: FeedPost) => {
    if (!window.confirm(text.confirm)) return;
    setActionError(null);
    setCancellingId(post.id);
    try {
      await cancelScheduledPost(post.id);
      setPosts((prev) => prev.filter((p) => p.id !== post.id));

      // Best-effort cleanup: remove the uploaded files so they do not waste storage
      for (const m of post.post_media ?? []) {
        try {
          await deleteFile(m.media_type === 'video' ? 'post-videos' : 'post-images', m.storage_path);
          if (m.thumbnail_path) await deleteFile('post-images', m.thumbnail_path);
        } catch (e) {
          console.error('Could not delete file', e);
        }
      }
    } catch (e) {
      console.error('Cancel scheduled post failed', e);
      setActionError(t('something_went_wrong'));
    } finally {
      setCancellingId(null);
    }
  };

  return (
    <div className="p-4">
      <h1 className="mb-4 text-lg font-bold">{text.title}</h1>

      {actionError && (
        <p className="mb-3 rounded-md bg-red-50 p-2 text-sm text-red-600 dark:bg-red-900/30 dark:text-red-400">
          {actionError}
        </p>
      )}

      {loading && (
        <div className="p-8 text-center text-sm text-gray-500 dark:text-gray-400">{t('loading')}</div>
      )}

      {!loading && loadFailed && (
        <div className="p-6 text-center text-sm text-gray-500 dark:text-gray-400">
          {text.loadError}
          <button onClick={load} className="mt-2 block w-full font-semibold text-zumra-600">
            {t('try_again')}
          </button>
        </div>
      )}

      {!loading && !loadFailed && posts.length === 0 && (
        <div className="p-10 text-center text-sm text-gray-500 dark:text-gray-400">
          <div className="mb-2 text-4xl">🗓️</div>
          <p>{text.empty}</p>
          <button onClick={() => navigate('/create')} className="mt-3 block w-full font-semibold text-zumra-600">
            {text.create}
          </button>
        </div>
      )}

      {!loading &&
        !loadFailed &&
        posts.map((post) => {
          const media = (post.post_media ?? []).slice().sort((a, b) => a.position - b.position);
          return (
            <div
              key={post.id}
              className="mb-3 rounded-xl border border-gray-200 bg-white p-3 dark:border-gray-800 dark:bg-gray-900"
            >
              <p className="mb-2 text-xs font-semibold text-zumra-600">
                🗓️ {text.publishesOn}{' '}
                {post.scheduled_at ? new Date(post.scheduled_at).toLocaleString() : ''}
              </p>

              {post.content ? (
                <p className="selectable whitespace-pre-wrap break-words text-sm">{post.content}</p>
              ) : (
                media.length > 0 && <p className="text-sm italic text-gray-500">{text.mediaOnly}</p>
              )}

              {media.length > 0 && (
                <div className="mt-2 flex gap-2 overflow-x-auto">
                  {media.map((m) => {
                    const src =
                      m.media_type === 'image'
                        ? getPublicUrl('post-images', m.storage_path)
                        : m.thumbnail_path
                        ? getPublicUrl('post-images', m.thumbnail_path)
                        : null;
                    return (
                      <div
                        key={m.id}
                        className="relative flex h-20 w-20 flex-shrink-0 items-center justify-center overflow-hidden rounded-lg bg-gray-800"
                      >
                        {src && <img src={src} alt="" loading="lazy" className="h-full w-full object-cover" />}
                        {m.media_type === 'video' && (
                          <span className="absolute text-xl">🎬</span>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}

              <button
                onClick={() => handleCancel(post)}
                disabled={cancellingId === post.id}
                className="mt-3 w-full rounded-lg border border-red-300 py-2 text-sm font-semibold text-red-600 disabled:opacity-60 dark:border-red-800"
              >
                {cancellingId === post.id ? text.cancelling : text.cancel}
              </button>
            </div>
          );
        })}
    </div>
  );
      }
