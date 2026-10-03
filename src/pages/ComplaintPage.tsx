import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { submitComplaint } from '@/services/complaints';

export default function ComplaintPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);

  const send = async () => {
    if (!user) return;
    if (text.trim().length < 10) {
      setError('Rubuta akalla haruffa 10.');
      return;
    }
    setBusy(true);
    setError('');
    try {
      await submitComplaint(user.id, text.trim());
      setDone(true);
    } catch (e: any) {
      setError(
        e?.message === 'RATE_LIMIT'
          ? 'Ka aika korafi da yawa. Sake gwadawa nan gaba.'
          : 'Kuskure ya faru. Sake gwadawa.'
      );
    } finally {
      setBusy(false);
    }
  };

  if (done) {
    return (
      <div className="p-6 text-center">
        <p className="text-lg font-bold">✅ An karɓi korafinka</p>
        <p className="mt-1 text-sm text-gray-500">Za mu duba shi.</p>
        <button onClick={() => navigate(-1)} className="mt-4 rounded-lg bg-zumra-500 px-4 py-2 text-sm font-semibold text-white">
          Koma baya
        </button>
      </div>
    );
  }

  return (
    <div className="p-4">
      <h1 className="text-lg font-bold">📩 Aika Koke / Send Complaint</h1>
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        maxLength={1000}
        rows={7}
        placeholder="Rubuta korafinka a nan..."
        className="mt-3 w-full rounded-lg border border-gray-300 bg-transparent p-3 text-sm dark:border-gray-700"
      />
      <p className="mt-1 text-right text-xs text-gray-500">{text.length}/1000</p>
      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
      <div className="mt-4 flex gap-2">
        <button onClick={() => navigate(-1)} className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-semibold dark:border-gray-700">
          Soke
        </button>
        <button onClick={send} disabled={busy} className="flex-1 rounded-lg bg-zumra-500 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60">
          {busy ? '...' : 'Aika'}
        </button>
      </div>
    </div>
  );
}
