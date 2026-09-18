import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { fetchActiveStatuses, deleteStatus, type StatusRow } from '@/services/status';
import { getPublicUrl } from '@/services/storage';

export default function ViewStatus() {
  const { authorId } = useParams<{ authorId: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [statuses, setStatuses] = useState<StatusRow[]>([]);
  const [index, setIndex] = useState(0);

  useEffect(() => {
    fetchActiveStatuses().then((all) => setStatuses(all.filter((s) => s.author_id === authorId)));
  }, [authorId]);

  useEffect(() => {
    if (!statuses.length) return;
    const timer = setTimeout(() => {
      if (index < statuses.length - 1) setIndex((i) => i + 1);
      else navigate('/');
    }, 5000);
    return () => clearTimeout(timer);
  }, [index, statuses, navigate]);

  if (!statuses.length) return <p className="p-6 text-center text-sm text-gray-500">No active status.</p>;
  const current = statuses[index];
  const isOwner = user?.id === current.author_id;

  const handleDelete = async () => {
    await deleteStatus(current.id);
    navigate('/');
  };

  return (
    <div className="flex h-screen flex-col bg-black text-white">
      <div className="flex gap-1 p-2">
        {statuses.map((_, i) => (
          <div key={i} className={`h-1 flex-1 rounded-full ${i <= index ? 'bg-white' : 'bg-white/30'}`} />
        ))}
      </div>
      <div className="flex items-center justify-between px-3 py-1">
        <p className="text-sm font-semibold">{current.author?.full_name}</p>
        <div className="flex items-center gap-3">
          {isOwner && <button onClick={handleDelete} className="text-xs">Delete</button>}
          <button onClick={() => navigate('/')} className="text-lg">✕</button>
        </div>
      </div>
      <div className="flex flex-1 items-center justify-center p-6" style={{ backgroundColor: current.background_color ?? '#000' }}>
        {current.content_type === 'text' ? (
          <p className="text-center text-2xl font-semibold">{current.text_content}</p>
        ) : (
          <img src={getPublicUrl('post-images', current.storage_path) ?? ''} alt="" className="max-h-full max-w-full rounded-lg object-contain" />
        )}
      </div>
    </div>
  );
}
