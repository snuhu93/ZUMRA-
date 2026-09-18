import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useSettings } from '@/contexts/SettingsContext';
import { supabase } from '@/lib/supabaseClient';

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mb-4 bg-white dark:bg-gray-900">
      <h2 className="border-b border-gray-100 px-4 py-2 text-xs font-semibold uppercase text-gray-500 dark:border-gray-800">{title}</h2>
      <div className="divide-y divide-gray-100 dark:divide-gray-800">{children}</div>
    </div>
  );
}

function Row({ label, onClick, right }: { label: string; onClick?: () => void; right?: React.ReactNode }) {
  return (
    <button onClick={onClick} className="flex w-full items-center justify-between px-4 py-3 text-left text-sm" disabled={!onClick}>
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
      <span className={`block h-5 w-5 translate-x-0.5 rounded-full bg-white transition-transform ${checked ? 'translate-x-5' : ''}`} />
    </button>
  );
}

export default function Settings() {
  const { user, signOut, updatePassword } = useAuth();
  const { dataSaver, setDataSaver, theme, setTheme } = useSettings();
  const navigate = useNavigate();
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const [deleting, setDeleting] = useState(false);

  const handleChangePassword = async () => {
    if (newPassword.length < 8) {
      setMessage('Password must be at least 8 characters.');
      return;
    }
    const { error } = await updatePassword(newPassword);
    setMessage(error ?? 'Password updated.');
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
    const { error } = await supabase.functions.invoke('delete-account');
    setDeleting(false);
    if (error) {
      setMessage('Something went wrong deleting your account. Please try again.');
      setConfirmDelete(false);
      return;
    }
    await signOut();
    navigate('/login');
  };

  return (
    <div className="pb-6">
      {message && <p className="m-4 rounded-md bg-zumra-50 p-2 text-sm text-zumra-700 dark:bg-zumra-900/30 dark:text-zumra-300">{message}</p>}

      <Section title="Account">
        <Row label="Edit Profile" onClick={() => navigate('/profile/edit')} right={<span>›</span>} />
        <Row label="Change Password" onClick={() => setShowPasswordForm((v) => !v)} right={<span>›</span>} />
        {showPasswordForm && (
          <div className="flex gap-2 px-4 py-3">
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="New password"
              className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800"
            />
            <button onClick={handleChangePassword} className="rounded-lg bg-zumra-500 px-3 py-2 text-xs font-semibold text-white">Update</button>
          </div>
        )}
        <Row label="Delete Account" onClick={() => setConfirmDelete(true)} right={<span className="text-red-600">›</span>} />
      </Section>

      <Section title="Privacy">
        <Row label="Who can see my posts" right={<span className="text-xs text-gray-400">Set per post</span>} />
        <Row label="Who can send friend requests" right={<span className="text-xs text-gray-400">Everyone</span>} />
        <Row label="Who can message me" right={<span className="text-xs text-gray-400">Everyone</span>} />
        <Row label="Blocked Users" onClick={() => navigate('/settings/blocked')} right={<span>›</span>} />
      </Section>

      <Section title="Notifications">
        <Row label="Likes, Comments, Friend requests, Messages, Followers" right={<span className="text-xs text-gray-400">On</span>} />
      </Section>

      <Section title="Data">
        <Row label="Data Saver" right={<Toggle checked={dataSaver} onChange={setDataSaver} />} />
        <Row label="Media Quality" right={<span className="text-xs text-gray-400">{dataSaver ? 'Reduced' : 'High'}</span>} />
        <Row label="Autoplay Videos" right={<span className="text-xs text-gray-400">Off (tap to play)</span>} />
      </Section>

      <Section title="Appearance">
        <div className="flex gap-2 px-4 py-3">
          {(['light', 'dark', 'system'] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTheme(t)}
              className={`flex-1 rounded-lg border py-2 text-xs font-medium capitalize ${theme === t ? 'border-zumra-500 bg-zumra-50 text-zumra-700 dark:bg-zumra-900/30' : 'border-gray-300 dark:border-gray-700'}`}
            >
              {t}
            </button>
          ))}
        </div>
      </Section>

      <Section title="Security">
        <Row label="Active Sessions" right={<span className="text-xs text-gray-400">This device</span>} />
        <Row label="Logout" onClick={() => signOut().then(() => navigate('/login'))} right={<span>›</span>} />
      </Section>

      <Section title="About">
        <Row label="About ZUMRA" onClick={() => navigate('/about')} right={<span>›</span>} />
        <Row label="Terms" onClick={() => navigate('/about#terms')} right={<span>›</span>} />
        <Row label="Privacy Policy" onClick={() => navigate('/about#privacy')} right={<span>›</span>} />
        <Row label="Help" onClick={() => navigate('/about#help')} right={<span>›</span>} />
      </Section>

      {confirmDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-6">
          <div className="w-full max-w-sm rounded-xl bg-white p-5 dark:bg-gray-900">
            <h3 className="mb-2 text-sm font-bold">Delete your account?</h3>
            <p className="mb-4 text-xs text-gray-500">This permanently deletes your account, posts, messages, and media. This cannot be undone.</p>
            <div className="flex gap-2">
              <button onClick={() => setConfirmDelete(false)} disabled={deleting} className="flex-1 rounded-lg border border-gray-300 py-2 text-sm dark:border-gray-700">Cancel</button>
              <button onClick={handleDeleteAccount} disabled={deleting} className="flex-1 rounded-lg bg-red-600 py-2 text-sm font-semibold text-white disabled:opacity-60">
                {deleting ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
