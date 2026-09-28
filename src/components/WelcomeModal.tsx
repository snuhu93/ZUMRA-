import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';

const WELCOME_KEY = 'zumra_welcome_seen_v1';

export default function WelcomeModal() {
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
    const text = 'Join me on Zumra! Connect, share, and stay close to the people who matter.';
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
        <h2 className="text-xl font-bold">Welcome to Zumra! 👋</h2>
        <p className="mt-2 text-sm">
          We're so glad to have you here. Zumra is your space to connect, share, and stay close to the people who matter to you.
        </p>

        <p className="mt-4 text-sm font-semibold">Here's what you can do:</p>
        <ul className="mt-1 list-disc space-y-1 pl-5 text-sm">
          <li>Build your profile with a photo, bio, and cover image</li>
          <li>Add friends and follow people you like</li>
          <li>Share posts, photos, and videos</li>
          <li>Send private messages to your friends</li>
        </ul>

        <p className="mt-4 text-sm">
          <b>🤝 Invite your people!</b> Zumra is better together. Invite your family and friends to join you.
        </p>

        <p className="mt-4 text-sm">
          To keep Zumra a friendly place for everyone, please be respectful, and use the Report or Block option if anyone makes you uncomfortable.
        </p>

        <p className="mt-4 text-sm">Thank you for joining us. We can't wait to see what you share!</p>
        <p className="mt-1 text-sm">With love, The Zumra Team 💚</p>

        <div className="mt-5 flex flex-col gap-2">
          <button onClick={handleInvite} className="rounded-lg bg-zumra-500 px-4 py-2.5 text-sm font-semibold text-white">
            Invite Friends & Family
          </button>
          <button onClick={close} className="rounded-lg border border-gray-300 px-4 py-2.5 text-sm font-semibold dark:border-gray-700">
            Get Started
          </button>
        </div>
      </div>
    </div>
  );
}
