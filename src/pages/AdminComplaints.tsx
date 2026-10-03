import { useEffect, useState } from 'react';
import { fetchComplaints, setComplaintStatus } from '@/services/complaints';

export default function AdminComplaints() {
  const [items, setItems] = useState<any[]>([]);
  const [filter, setFilter] = useState('');
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      setItems(await fetchComplaints(filter || null));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [filter]);

  const update = async (id: string, status: 'seen' | 'resolved') => {
    await setComplaintStatus(id, status);
    load();
  };

  const color: Record<string, string> = {
    new: 'bg-red-600',
    seen: 'bg-amber-600',
    resolved: 'bg-green-600',
  };

  return (
    <div className="p-4">
      <h1 className="mb-3 text-lg font-bold">📩 Korafe-korafe</h1>
      <select
        value={filter}
        onChange={(e) => setFilter(e.target.value)}
        className="mb-3 rounded-lg border border-gray-300 bg-transparent p-2 text-sm dark:border-gray-700"
      >
        <option value="">Duka</option>
        <option value="new">Sabbi</option>
        <option value="seen">An gani</option>
        <option value="resolved">An warware</option>
      </select>

      {loading && <p className="text-sm text-gray-500">...</p>}
      {!loading && items.length === 0 && <p className="text-sm text-gray-500">Babu korafi.</p>}

      {items.map((c) => (
        <div key={c.id} className="mb-3 rounded-xl border border-gray-200 p-3 dark:border-gray-800">
          <div className="flex items-center gap-2 text-xs">
            <span className={`rounded px-2 py-0.5 text-white ${color[c.status]}`}>{c.status}</span>
            <span className="text-gray-500">{new Date(c.created_at).toLocaleString()}</span>
          </div>
          <p className="mt-2 whitespace-pre-wrap text-sm">{c.message}</p>
          <p className="mt-1 text-xs text-gray-500">
            {c.profiles?.full_name ?? 'User'} (@{c.profiles?.username ?? c.user_id})
          </p>
          <div className="mt-2 flex gap-2">
            <button onClick={() => update(c.id, 'seen')} className="rounded-lg border border-gray-300 px-3 py-1 text-xs dark:border-gray-700">An gani</button>
            <button onClick={() => update(c.id, 'resolved')} className="rounded-lg bg-zumra-500 px-3 py-1 text-xs text-white">An warware</button>
          </div>
        </div>
      ))}
    </div>
  );
    }
