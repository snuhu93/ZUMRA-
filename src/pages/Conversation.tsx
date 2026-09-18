import { useEffect, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useSettings } from '@/contexts/SettingsContext';
import { supabase } from '@/lib/supabaseClient';
import Avatar from '@/components/Avatar';
import {
  fetchMessages,
  sendMessage,
  deleteMessage,
  markConversationRead,
  subscribeToConversation
} from '@/services/messages';

interface Msg {
  id: string;
  conversation_id: string;
  sender_id: string;
  content: string | null;
  reply_to_message_id: string | null;
  is_deleted: boolean;
  created_at: string;
  _pending?: boolean;
}

export default function Conversation() {
  const { conversationId } = useParams<{ conversationId: string }>();
  const { user } = useAuth();
  const { isOffline } = useSettings();
  const [messages, setMessages] = useState<Msg[]>([]);
  const [otherUser, setOtherUser] = useState<{ full_name: string; avatar_url: string | null } | null>(null);
  const [text, setText] = useState('');
  const [replyTo, setReplyTo] = useState<Msg | null>(null);
  const [loading, setLoading] = useState(true);
  const bottomRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!conversationId || !user) return;
    fetchMessages(conversationId, null).then((data) => {
      setMessages(data as Msg[]);
      setLoading(false);
    });
    markConversationRead(conversationId, user.id);

    supabase
      .from('conversation_members')
      .select('profile:profiles(full_name, avatar_url)')
      .eq('conversation_id', conversationId)
      .neq('user_id', user.id)
      .maybeSingle()
      .then(({ data }) => setOtherUser((data?.profile as any) ?? null));

    const unsubscribe = subscribeToConversation(conversationId, (msg: Msg) => {
      setMessages((prev) => (prev.some((m) => m.id === msg.id) ? prev : [...prev, msg]));
      markConversationRead(conversationId, user.id);
    });
    return unsubscribe;
  }, [conversationId, user]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async () => {
    if (!user || !conversationId || !text.trim()) return;
    const content = text.trim();
    const replyId = replyTo?.id ?? null;
    setText('');
    setReplyTo(null);

    const tempId = `pending-${Date.now()}`;
    const optimistic: Msg = {
      id: tempId,
      conversation_id: conversationId,
      sender_id: user.id,
      content,
      reply_to_message_id: replyId,
      is_deleted: false,
      created_at: new Date().toISOString(),
      _pending: true
    };
    setMessages((prev) => [...prev, optimistic]);

    if (isOffline) return; // stays marked "pending" -- retried by the browser once reconnected via user resend

    try {
      const id = await sendMessage({ conversationId, senderId: user.id, content, replyToMessageId: replyId });
      setMessages((prev) => prev.map((m) => (m.id === tempId ? { ...m, id, _pending: false } : m)));
    } catch {
      setMessages((prev) => prev.filter((m) => m.id !== tempId));
      setText(content); // let the user retry
    }
  };

  const handleDelete = async (id: string) => {
    await deleteMessage(id);
    setMessages((prev) => prev.filter((m) => m.id !== id));
  };

  if (loading) return <p className="p-6 text-center text-sm text-gray-500">Loading...</p>;

  return (
    <div className="flex h-[calc(100vh-3.5rem-4rem)] flex-col">
      <div className="flex items-center gap-2 border-b border-gray-200 p-3 dark:border-gray-800">
        <Avatar src={otherUser?.avatar_url} name={otherUser?.full_name ?? 'User'} size={32} />
        <span className="text-sm font-semibold">{otherUser?.full_name ?? 'Conversation'}</span>
      </div>

      <div className="flex-1 space-y-2 overflow-y-auto p-3">
        {messages.map((m) => {
          const mine = m.sender_id === user?.id;
          return (
            <div key={m.id} className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[75%] rounded-2xl px-3 py-2 text-sm ${mine ? 'bg-zumra-500 text-white' : 'bg-gray-100 dark:bg-gray-800'}`}>
                {m.reply_to_message_id && <p className="mb-1 text-xs opacity-70">Replying to a message</p>}
                <p>{m.content}</p>
                <div className="mt-1 flex items-center gap-2 text-[10px] opacity-70">
                  <span>{m._pending ? (isOffline ? 'Waiting for connection...' : 'Sending...') : new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                  {mine && !m._pending && (
                    <>
                      <button onClick={() => setReplyTo(m)}>Reply</button>
                      <button onClick={() => handleDelete(m.id)}>Delete</button>
                    </>
                  )}
                </div>
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      <div className="border-t border-gray-200 p-3 dark:border-gray-800">
        {replyTo && (
          <div className="mb-1 flex items-center justify-between text-xs text-gray-500">
            <span>Replying to: {replyTo.content?.slice(0, 40)}</span>
            <button onClick={() => setReplyTo(null)}>✕</button>
          </div>
        )}
        <div className="flex items-center gap-2">
          <input
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
            placeholder="Message..."
            className="flex-1 rounded-full border border-gray-300 px-4 py-2 text-sm dark:border-gray-700 dark:bg-gray-800"
          />
          <button onClick={handleSend} className="rounded-full bg-zumra-500 px-4 py-2 text-sm font-semibold text-white">Send</button>
        </div>
      </div>
    </div>
  );
}
