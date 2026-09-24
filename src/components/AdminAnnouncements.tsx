import { useState } from 'react';
import { adminSendAnnouncement } from '@/services/admin';

export default function AdminAnnouncements() {
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSend = async () => {
    if (!message.trim()) return;
    setSending(true);
    setSent(false);
    try {
      await adminSendAnnouncement(message.trim());
      setMessage('');
      setSent(true);
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="p-4">
      <p className="mb-2 text-sm text-gray-500">
        Wannan sako zai je wa DUK users a matsayin notification.
      </p>
      <textarea
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        rows={4}
        placeholder="Rubuta sanarwar ku a nan..."
        className="w-full rounded-lg border border-gray-200 bg-white p-3 text-sm dark:border-gray-800 dark:bg-gray-900"
      />
      <button
        onClick={handleSend}
        disabled={sending || !message.trim()}
        className="mt-3 rounded-lg bg-zumra-500 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
      >
        {sending ? 'Ana Aikawa...' : 'Aika Sanarwa'}
      </button>
      {sent && <p className="mt-2 text-xs text-green-500">An aika sanarwar cikin nasara!</p>}
    </div>
  );
      }
