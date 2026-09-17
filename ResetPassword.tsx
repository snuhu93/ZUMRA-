import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';

export default function ResetPassword() {
  const { updatePassword } = useAuth();
  const navigate = useNavigate();
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (password.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }
    setSubmitting(true);
    const { error: updateError } = await updatePassword(password);
    setSubmitting(false);
    if (updateError) setError(updateError);
    else setDone(true);
  };

  if (done) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-3 px-6 text-center">
        <p className="text-sm font-semibold">Password updated.</p>
        <button onClick={() => navigate('/')} className="text-sm text-zumra-600">Continue to ZUMRA</button>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-6">
      <h1 className="mb-6 text-xl font-bold text-zumra-600">Set a new password</h1>
      <div className="w-full max-w-sm space-y-3">
        {error && <p className="rounded-md bg-red-50 p-2 text-sm text-red-600">{error}</p>}
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="New password"
          className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm dark:border-gray-700 dark:bg-gray-900"
        />
        <button onClick={handleSubmit} disabled={submitting} className="w-full rounded-lg bg-zumra-500 py-2.5 text-sm font-semibold text-white disabled:opacity-60">
          {submitting ? 'Updating...' : 'Update Password'}
        </button>
      </div>
    </div>
  );
}
