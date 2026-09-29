import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useSettings } from '@/contexts/SettingsContext';
import { supabase } from '@/lib/supabaseClient';
import { useT } from '@/i18n';

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mb-4 bg-white dark:bg-gray-900">
      <h2 className="border-b border-gray-100 px-4 py-2 text-xs font-semibold uppercase text-gray-500 dark:border-gray-800">{title}</h2>
      <div className="divide-y divide-gray-100 dark:divide-gray-800">{children}</div>
    </div>
  );
}

function Row({ label, onClick, right }: { label: string; onClick?: () => void; right?: React.ReactNode }) {
  const cls = 'flex w-full items-center justify-between px-4 py-3 text-left text-sm';
  if (!onClick) {
    return (
      <div className={cls}>
        <span>{label}</span>
        {right}
      </div>
    );
  }
  return (
    <button onClick={onClick} className={cls}>
      <span>{label}</span>
      {right}
    </button>
  );
}

function Toggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      onClick={() => onChange(!checked)}
      className={`h-6 w-11 rounded-full transition-colors ${checked ? 'bg-zumra-500' : 'bg-gray-300 dark:bg-gray-700'}`}
      aria-pressed={checked}
    >
      <span className={`block h-5 w-5 rounded-full bg-white transition-transform ${checked ? 'translate-x-5' : 'translate-x-0.5'}`} />
    </button>
  );
}

export default function Settings() {
  const t = useT();
  const { user, signOut, updatePassword } = useAuth();
  const { dataSaver, setDataSaver, autoplayVideos, setAutoplayVideos, theme, setTheme } = useSettings();
  const navigate = useNavigate();
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const [deleting, setDeleting] = useState(false);

  const handleChangePassword = async () => {
    if (newPassword.length < 8) {
      setMessage(t('settings.passwordTooShort'));
      return;
    }
    const { error } = await updatePassword(newPassword);
    setMessage(error ?? t('settings.passwordUpdated'));
    if (!error) {
      setShowPasswordForm(false);
      setNewPassword('');
    }
  };

  const handleDeleteAccount = async () => {
    if (!user) return;
    setDeleting(true);
    setMessage(null);
    // Calls the delete-account Edge Function, which uses the service-role key
    // server-side (never exposed here) to permanently remove the account and
    // its storage files. See supabase/functions/delete-account/index.ts.
    const { error } = await supabase.functions.invoke('super-processor');
    setDeleting(false);
    if (error) {
      setMessage(t('settings.deleteError'));
      setConfirmDelete(false);
      return;
    }
    await signOut();
    navigate('/login');
  };

  return (
    <div className="pb-6">
      {message && <p className="m-4 rounded-md bg-zumra-50 p-2 text-sm text-zumra-700 dark:bg-zumra-900/30 dark:text-zumra-300">{message}</p>}

      <Section title={t('settings.account')}>
        <Row label={t('settings.editProfile')} onClick={() => navigate('/profile/edit')} right={<span>›</span>} />
        <Row label={t('settings.changePassword')} onClick={() => setShowPasswordForm((v) => !v)} right={<span>›</span>} />
        {showPasswordForm && (
          <div className="flex gap-2 px-4 py-3">
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder={t('settings.newPassword')}
              className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800"
            />
            <button onClick={handleChangePassword} className="rounded-lg bg-zumra-500 px-3 py-2 text-xs font-semibold text-white">{t('settings.update')}</button>
          </div>
        )}
        <Row label={t('settings.deleteAccount')} onClick={() => setConfirmDelete(true)} right={<span className="text-red-600">›</span>} />
      </Section>

      <Section title={t('settings.privacy')}>
        <div className="flex w-full items-center justify-between px-4 py-3 text-sm">
          <div>
            <span>{t('settings.whoSeesPosts')}</span>
            <p className="mt-0.5 text-xs text-gray-400">{t('settings.choosePerPost')}</p>
          </div>
          <span className="text-xs text-gray-400 dark:text-gray-500">{t('settings.setPerPost')}</span>
        </div>
        <Row label={t('settings.whoFriendRequests')} right={<span className="text-xs text-gray-400">{t('settings.everyone')}</span>} />
        <Row label={t('settings.whoMessages')} right={<span className="text-xs text-gray-400">{t('settings.everyone')}</span>} />
        <Row label={t('settings.blockedUsers')} onClick={() => navigate('/settings/blocked')} right={<span>›</span>} />
      </Section>

      <Section title={t('settings.notifications')}>
        <Row label={t('settings.notificationsAll')} right={<span className="text-xs text-gray-400">{t('settings.on')}</span>} />
      </Section>

      <Section title={t('settings.data')}>
        <Row label={t('settings.dataSaver')} right={<Toggle checked={dataSaver} onChange={setDataSaver} />} />
        <Row label={t('settings.mediaQuality')} right={<span className="text-xs text-gray-400">{dataSaver ? t('settings.reduced') : t('settings.high')}</span>} />
        <Row label={t('settings.autoplayVideos')} right={<Toggle checked={autoplayVideos} onChange={setAutoplayVideos} />} />
      </Section>

      <Section title={t('settings.appearance')}>
        <div className="flex gap-2 px-4 py-3">
          {(['light', 'dark', 'system'] as const).map((th) => (
            <button
              key={th}
              onClick={() => setTheme(th)}
              className={`flex-1 rounded-lg border py-2 text-xs font-medium capitalize ${theme === th ? 'border-zumra-500 bg-zumra-50 text-zumra-700 dark:bg-zumra-900/30' : 'border-gray-300 dark:border-gray-700'}`}
            >
              {t(`settings.theme.${th}`)}
            </button>
          ))}
        </div>
      </Section>

      <Section title={t('settings.security')}>
        <Row label={t('settings.activeSessions')} right={<span className="text-xs text-gray-400">{t('settings.thisDevice')}</span>} />
        <Row label={t('settings.logout')} onClick={() => signOut().then(() => navigate('/login'))} right={<span>›</span>} />
      </Section>

      <Section title={t('settings.about')}>
        <Row label={t('settings.aboutZumra')} onClick={() => navigate('/about')} right={<span>›</span>} />
        <Row label={t('settings.terms')} onClick={() => navigate('/about#terms')} right={<span>›</span>} />
        <Row label={t('settings.privacyPolicy')} onClick={() => navigate('/about#privacy')} right={<span>›</span>} />
        <Row label={t('settings.help')} onClick={() => navigate('/about#help')} right={<span>›</span>} />
      </Section>

      {confirmDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-6">
          <div className="w-full max-w-sm rounded-xl bg-white p-5 dark:bg-gray-900">
            <h3 className="mb-2 text-sm font-bold">{t('settings.deleteTitle')}</h3>
            <p className="mb-4 text-xs text-gray-500">{t('settings.deleteBody')}</p>
            <div className="flex gap-2">
              <button onClick={() => setConfirmDelete(false)} disabled={deleting} className="flex-1 rounded-lg border border-gray-300 py-2 text-sm dark:border-gray-700">{t('settings.cancel')}</button>
              <button onClick={handleDeleteAccount} disabled={deleting} className="flex-1 rounded-lg bg-red-600 py-2 text-sm font-semibold text-white disabled:opacity-60">
                {deleting ? t('settings.deleting') : t('settings.delete')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
  }
