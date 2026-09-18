import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { submitReport } from '@/services/moderation';
import type { ReportReason, ReportTargetType } from '@/types/database';

const REASONS: { value: ReportReason; label: string }[] = [
  { value: 'spam', label: 'Spam' },
  { value: 'harassment', label: 'Harassment' },
  { value: 'fake_account', label: 'Fake account' },
  { value: 'violence', label: 'Violence' },
  { value: 'inappropriate', label: 'Inappropriate content' },
  { value: 'other', label: 'Other' }
];

export default function Report() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const targetType = (params.get('type') as ReportTargetType) ?? 'post';
  const targetId = params.get('id') ?? '';
  const [reason, setReason] = useState<ReportReason>('spam');
  const [details, setDetails] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  const handleSubmit = async () => {
    if (!user || !targetId) return;
    setSubmitting(true);
    try {
      await submitReport({ reporterId: user.id, targetType, targetId, reason, details: details.trim() || undefined });
      setDone(true);
    } finally {
      setSubmitting(false);
    }
  };

  if (done) {
    return (
      <div className="p-6 text-center">
        <p className="text-sm font-semibold">Thank you. Your report has been submitted.</p>
        <button onClick={() => navigate(-1)} className="mt-4 text-sm text-zumra-600">Go back</button>
      </div>
    );
  }

  return (
    <div className="p-4">
      <h1 className="mb-4 text-lg font-bold">Report {targetType}</h1>
      <div className="space-y-2">
        {REASONS.map((r) => (
          <label key={r.value} className="flex items-center gap-2 text-sm">
            <input type="radio" name="reason" checked={reason === r.value} onChange={() => setReason(r.value)} />
            {r.label}
          </label>
        ))}
      </div>
      <textarea
        value={details}
        onChange={(e) => setDetails(e.target.value)}
        placeholder="Additional details (optional)"
        rows={3}
        className="mt-3 w-full resize-none rounded-lg border border-gray-300 bg-white p-2.5 text-sm dark:border-gray-700 dark:bg-gray-900"
      />
      <button onClick={handleSubmit} disabled={submitting || !targetId} className="mt-4 w-full rounded-lg bg-red-600 py-3 text-sm font-semibold text-white disabled:opacity-60">
        {submitting ? 'Submitting...' : 'Submit Report'}
      </button>
    </div>
  );
}
