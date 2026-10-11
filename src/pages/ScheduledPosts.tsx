import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabaseClient';
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
    edit: string;
    save: string;
    saving: string;
    close: string;
    dateTime: string;
    errPast: string;
    errEmpty: string;
    saved: string;
    gone: string;
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
    loadError: 'Could not load your scheduled posts.',
    edit: 'Edit',
    save: 'Save changes',
    saving: 'Saving...',
    close: 'Close',
    dateTime: 'Date and time',
    errPast: 'Choose a time at least 1 minute from now.',
    errEmpty: 'Write something. A post without a photo/video cannot be empty.',
    saved: 'Changes saved.',
    gone: 'This post has already been published or removed.'
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
    loadError: 'An kasa loda wallafoyinka da aka tsara.',
    edit: 'Gyara',
    save: 'Ajiye canje-canje',
    saving: 'Ana adanawa...',
    close: 'Rufe',
    dateTime: 'Kwanan wata da lokaci',
    errPast: 'Zaɓi lokaci aƙalla minti 1 daga yanzu.',
    errEmpty: 'Rubuta wani abu. Wallafa mara hoto/bidiyo ba za ta zama fanko ba.',
    saved: 'An ajiye canje-canjen.',
    gone: 'An riga an wallafa ko an cire wannan wallafar.'
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
    loadError: 'Impossible de charger vos publications programmées.',
    edit: 'Modifier',
    save: 'Enregistrer',
    saving: 'Enregistrement...',
    close: 'Fermer',
    dateTime: 'Date et heure',
    errPast: 'Choisissez une heure au moins 1 minute dans le futur.',
    errEmpty: 'Écrivez quelque chose. Une publication sans photo/vidéo ne peut pas être vide.',
    saved: 'Modifications enregistrées.',
    gone: 'Cette publication a déjà été publiée ou supprimée.'
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
    loadError: 'تعذّر تحميل منشوراتك المجدولة.',
    edit: 'تعديل',
    save: 'حفظ التغييرات',
    saving: 'جارٍ الحفظ...',
    close: 'إغلاق',
    dateTime: 'التاريخ والوقت',
    errPast: 'اختر وقتًا بعد دقيقة واحدة على الأقل من الآن.',
    errEmpty: 'اكتب شيئًا. لا يمكن أن يكون المنشور بدون صورة/فيديو فارغًا.',
    saved: 'تم حفظ التغييرات.',
    gone: 'تم نشر هذا المنشور أو إزالته بالفعل.'
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
    loadError: 'A kò lè gbé àwọn ìfìwéránṣẹ́ tí o ṣètò wá.',
    edit: 'Ṣàtúnṣe',
    save: 'Fi àwọn àyípadà pamọ́',
    saving: 'Ń fipamọ́...',
    close: 'Pa á',
    dateTime: 'Ọjọ́ àti àkókò',
    errPast: 'Yan àkókò tó kéré tán ìṣẹ́jú kan láti báyìí.',
    errEmpty: 'Kọ nǹkan kan. Ìfìwéránṣẹ́ tí kò ní fọ́tò/fídíò kò lè ṣófo.',
    saved: 'A ti fi àwọn àyípadà pamọ́.',
    gone: 'A ti tẹ ìfìwéránṣẹ́ yìí jáde tàbí a ti yọ ọ́ kúrò.'
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
    loadError: 'Enweghị ike ibu ederede gị e hazịrị.',
    edit: 'Dezie',
    save: 'Chekwaa mgbanwe',
    saving: 'Na-echekwa...',
    close: 'Mechie',
    dateTime: 'Ụbọchị na oge',
    errPast: 'Họrọ oge dị opekata mpe otu nkeji site ugbu a.',
    errEmpty: 'Dee ihe. Ederede na-enweghị foto/vidiyo enweghị ike ịbụ ihe efu.',
    saved: 'E chekwala mgbanwe.',
    gone: 'E bipụtala ma ọ bụ wepụ ederede a.'
  }
};

// Value for <input type="datetime-local"> in the user's local time
function toLocalInputValue(d: Date) {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

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
  const [notice, setNotice] = useState<string | null>(null);
  const [cancellingId, setCancellingId] = useState<string | null>(null);

  // Editing
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState('');
  const [editAt, setEditAt] = useState('');
  const [editError, setEditError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

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

  const startEdit = (post: FeedPost) => {
    setActionError(null);
    setNotice(null);
    setEditError(null);
    setEditingId(post.id);
    setEditContent(post.content ?? '');
    setEditAt(post.scheduled_at ? toLocalInputValue(new Date(post.scheduled_at)) : '');
  };

  const closeEdit = () => {
    setEditingId(null);
    setEditError(null);
  };

  const handleSave = async (post: FeedPost) => {
    const hasMedia = (post.post_media ?? []).length > 0;
    if (!editContent.trim() && !hasMedia) {
      setEditError(text.errEmpty);
      return;
    }
    const when = new Date(editAt);
    if (!editAt || isNaN(when.getTime()) || when.getTime() < Date.now() + 60_000) {
      setEditError(text.errPast);
      return;
    }

    setEditError(null);
    setSaving(true);
    try {
      const newContent = editContent.trim();
      const newIso = when.toISOString();

      // Only a post that is still scheduled can be changed
      const { data, error } = await supabase
        .from('posts')
        .update({ content: newContent, scheduled_at: newIso, updated_at: new Date().toISOString() })
        .eq('id', post.id)
        .eq('status', 'scheduled')
        .select('id');
      if (error) throw error;

      if (!data || data.length === 0) {
        // It was published (or removed) while this page was open
        setEditingId(null);
        setActionError(text.gone);
        await load();
        return;
      }

      setPosts((prev) =>
        prev
          .map((p) => (p.id === post.id ? { ...p, content: newContent, scheduled_at: newIso } : p))
          .sort((a, b) => String(a.scheduled_at).localeCompare(String(b.scheduled_at)))
      );
      setEditingId(null);
      setActionError(null);
      setNotice(text.saved);
    } catch (e) {
      console.error('Update scheduled post failed', e);
      setEditError(t('something_went_wrong'));
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = async (post: FeedPost) => {
    if (!window.confirm(text.confirm)) return;
    setActionError(null);
    setNotice(null);
    setCancellingId(post.id);
    try {
      await cancelScheduledPost(post.id);
      setPosts((prev) => prev.filter((p) => p.id !== post.id));
      if (editingId === post.id) setEditingId(null);

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

      {notice && (
        <p className="mb-3 rounded-md bg-green-50 p-2 text-sm text-green-700 dark:bg-green-900/30 dark:text-green-400">
          {notice}
        </p>
      )}

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
          const isEditing = editingId === post.id;
          return (
            <div
              key={post.id}
              className="mb-3 rounded-xl border border-gray-200 bg-white p-3 dark:border-gray-800 dark:bg-gray-900"
            >
              {!isEditing && (
                <p className="mb-2 text-xs font-semibold text-zumra-600">
                  🗓️ {text.publishesOn}{' '}
                  {post.scheduled_at ? new Date(post.scheduled_at).toLocaleString() : ''}
                </p>
              )}

              {isEditing ? (
                <div className="mb-2">
                  <textarea
                    value={editContent}
                    onChange={(e) => setEditContent(e.target.value)}
                    rows={4}
                    maxLength={5000}
                    disabled={saving}
                    className="w-full resize-none rounded-lg border border-gray-300 bg-white p-3 text-sm dark:border-gray-700 dark:bg-gray-900"
                  />
                  <label className="mb-1 mt-3 block text-xs font-medium text-gray-500 dark:text-gray-400">
                    {text.dateTime}
                  </label>
                  <input
                    type="datetime-local"
                    value={editAt}
                    min={toLocalInputValue(new Date())}
                    onChange={(e) => setEditAt(e.target.value)}
                    disabled={saving}
                    className="w-full rounded-lg border border-gray-300 bg-white p-2.5 text-sm dark:border-gray-700 dark:bg-gray-900"
                  />
                  {editError && (
                    <p className="mt-2 rounded-md bg-red-50 p-2 text-sm text-red-600 dark:bg-red-900/30 dark:text-red-400">
                      {editError}
                    </p>
                  )}
                </div>
              ) : post.content ? (
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
                        {m.media_type === 'video' && <span className="absolute text-xl">🎬</span>}
                      </div>
                    );
                  })}
                </div>
              )}

              {isEditing ? (
                <div className="mt-3 flex gap-2">
                  <button
                    onClick={() => handleSave(post)}
                    disabled={saving}
                    className="flex-1 rounded-lg bg-zumra-500 py-2 text-sm font-semibold text-white disabled:opacity-60"
                  >
                    {saving ? text.saving : text.save}
                  </button>
                  <button
                    onClick={closeEdit}
                    disabled={saving}
                    className="flex-1 rounded-lg border border-gray-300 py-2 text-sm font-semibold disabled:opacity-60 dark:border-gray-700"
                  >
                    {text.close}
                  </button>
                </div>
              ) : (
                <div className="mt-3 flex gap-2">
                  <button
                    onClick={() => startEdit(post)}
                    disabled={cancellingId === post.id}
                    className="flex-1 rounded-lg border border-gray-300 py-2 text-sm font-semibold disabled:opacity-60 dark:border-gray-700"
                  >
                    ✏️ {text.edit}
                  </button>
                  <button
                    onClick={() => handleCancel(post)}
                    disabled={cancellingId === post.id}
                    className="flex-1 rounded-lg border border-red-300 py-2 text-sm font-semibold text-red-600 disabled:opacity-60 dark:border-red-800"
                  >
                    {cancellingId === post.id ? text.cancelling : text.cancel}
                  </button>
                </div>
              )}
            </div>
          );
        })}
    </div>
  );
    }
