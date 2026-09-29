import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useT } from '@/i18n';

const WELCOME_KEY = 'zumra_welcome_seen_v1';

export default function WelcomeModal() {
  const t = useT();
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const storageKey = user ? `${WELCOME_KEY}_${user.id}` : null;

  useEffect(() => {
    if (!storageKey) return;
    try {
      if (!localStorage.getItem(storageKey)) setOpen(true);
    } catch {
      setOpen(true);
    }
  }, [storageKey]);

  const close = () => {
    try {
      if (storageKey) localStorage.setItem(storageKey, '1');
    } catch {
      /* ignore */
    }
    setOpen(false);
  };

  const handleInvite = async () => {
    const url = window.location.origin;
    const text = t('invite_share_text');
    try {
      if (navigator.share) await navigator.share({ url, title: 'Zumra', text });
      else await navigator.clipboard.writeText(`${text} ${url}`);
    } catch (err: any) {
      if (err?.name !== 'AbortError') console.error('invite error:', err);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="max-h-[85vh] w-full max-w-md overflow-y-auto rounded-2xl bg-white p-6 text-gray-900 shadow-xl dark:bg-gray-900 dark:text-gray-100">
        <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-zumra-500 text-xl font-bold text-white">Z</div>
        <h2 className="text-xl font-bold">{t('welcome_title')}</h2>
        <p className="mt-2 text-sm">{t('welcome_intro')}</p>

        <p className="mt-4 text-sm font-semibold">{t('welcome_can_do')}</p>
        <ul className="mt-1 list-disc space-y-1 pl-5 text-sm">
          <li>{t('welcome_li_profile')}</li>
          <li>{t('welcome_li_friends')}</li>
          <li>{t('welcome_li_share')}</li>
          <li>{t('welcome_li_messages')}</li>
        </ul>

        <p className="mt-4 text-sm">
          <b>{t('welcome_invite_bold')}</b> {t('welcome_invite_text')}
        </p>

        <p className="mt-4 text-sm">{t('welcome_respect')}</p>

        <p className="mt-4 text-sm">{t('welcome_thanks')}</p>
        <p className="mt-1 text-sm">{t('welcome_signoff')}</p>

        <div className="mt-5 flex flex-col gap-2">
          <button onClick={handleInvite} className="rounded-lg bg-zumra-500 px-4 py-2.5 text-sm font-semibold text-white">
            {t('invite_friends')}
          </button>
          <button onClick={close} className="rounded-lg border border-gray-300 px-4 py-2.5 text-sm font-semibold dark:border-gray-700">
            {t('get_started')}
          </button>
        </div>
      </div>
    </div>
  );
    }
