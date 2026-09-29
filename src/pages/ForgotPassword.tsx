import { useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useI18n } from '@/i18n';

export default function ForgotPassword() {
  const { t } = useI18n();
  const { sendPasswordReset } = useAuth();
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    const { error: resetError } = await sendPasswordReset(email);
    setSubmitting(false);
    if (resetError) setError(resetError);
    else setSent(true);
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-6">
      <h1 className="mb-6 text-xl font-bold text-zumra-600">{t('forgot.title')}</h1>
      {sent ? (
        <p className="text-center text-sm text-gray-500 dark:text-gray-400">
          {t('forgot.sentA')} {email}, {t('forgot.sentB')}
        </p>
      ) : (
        <form onSubmit={handleSubmit} className="w-full max-w-sm space-y-3">
          {error && <p className="rounded-md bg-red-50 p-2 text-sm text-red-600">{error}</p>}
          <input
            type="email"
            required
            placeholder={t('forgot.email')}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm dark:border-gray-700 dark:bg-gray-900"
          />
          <button
            type="submit"
            disabled={submitting}
            className="w-full rounded-lg bg-zumra-500 py-2.5 text-sm font-semibold text-white disabled:opacity-60"
          >
            {submitting ? t('forgot.sending') : t('forgot.send')}
          </button>
        </form>
      )}
      <Link to="/login" className="mt-4 text-sm text-zumra-600">{t('forgot.back')}</Link>
    </div>
  );
    }
