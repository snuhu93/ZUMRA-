import { useState, type ChangeEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useSettings } from '@/contexts/SettingsContext';
import { createTextStatus, createImageStatus } from '@/services/status';
import { uploadImage } from '@/services/storage';

const COLORS = ['#0F9D58', '#1565C0', '#C2185B', '#6A1B9A', '#EF6C00'];

export default function CreateStatus() {
  const { user } = useAuth();
  const { dataSaver } = useSettings();
  const navigate = useNavigate();
  const [text, setText] = useState('');
  const [color, setColor] = useState(COLORS[0]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handlePostText = async () => {
    if (!user || !text.trim()) return;
    setSubmitting(true);
    try {
      await createTextStatus(user.id, text.trim(), color);
      navigate('/');
    } catch {
      setError('Something went wrong. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleImage = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    setSubmitting(true);
    try {
      const { path } = await uploadImage({ file, userId: user.id, bucket: 'post-images', kind: 'status', dataSaver });
      await createImageStatus(user.id, path);
      navigate('/');
    } catch {
      setError('Image upload failed. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="p-4">
      <h1 className="mb-4 text-lg font-bold">Add to Your Status</h1>
      {error && <p className="mb-3 rounded-md bg-red-50 p-2 text-sm text-red-600">{error}</p>}

      <div
        className="mb-4 flex h-56 items-center justify-center rounded-xl p-4 text-center text-lg font-semibold text-white"
        style={{ backgroundColor: color }}
      >
        {text || 'Type your status...'}
      </div>

      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="What's happening?"
        maxLength={200}
        rows={2}
        className="w-full resize-none rounded-lg border border-gray-300 bg-white p-3 text-sm dark:border-gray-700 dark:bg-gray-900"
      />

      <div className="mt-3 flex gap-2">
        {COLORS.map((c) => (
          <button
            key={c}
            onClick={() => setColor(c)}
            className={`h-8 w-8 rounded-full ${color === c ? 'ring-2 ring-offset-2 ring-gray-500' : ''}`}
            style={{ backgroundColor: c }}
            aria-label={`Color ${c}`}
          />
        ))}
      </div>

      <button onClick={handlePostText} disabled={submitting || !text.trim()} className="mt-4 w-full rounded-lg bg-zumra-500 py-3 text-sm font-semibold text-white disabled:opacity-60">
        {submitting ? 'Posting...' : 'Post Text Status'}
      </button>

      <label className="mt-2 block cursor-pointer rounded-lg border border-gray-300 py-3 text-center text-sm font-semibold dark:border-gray-700">
        Post Image Status
        <input type="file" accept="image/*" className="hidden" onChange={handleImage} />
      </label>
    </div>
  );
}
