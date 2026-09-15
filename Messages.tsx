import { useEffect, useState, useCallback, useRef } from 'react'
import { supabase, Profile } from '../lib/supabase'
import { useAuth } from '../lib/auth'
import { Avatar } from '../components/Avatar'
import { timeAgo } from '../lib/utils'
import { Send, ArrowLeft, MessageCircle } from 'lucide-react'

type Conversation = {
  otherUser: Profile
  lastMessage: string
  lastAt: string
  unread: number
}

export default function Messages() {
  const { user } = useAuth()
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [loading, setLoading] = useState(true)
  const [activeUser, setActiveUser] = useState<Profile | null>(null)
  const [messages, setMessages] = useState<{ id: string; sender_id: string; content: string; created_at: string }[]>([])
  const [draft, setDraft] = useState('')
  const [sending, setSending] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)

  const loadConversations = useCallback(async () => {
    if (!user) return
    setLoading(true)
    const { data } = await supabase
      .from('messages')
      .select('id, sender_id, recipient_id, content, created_at, read_at')
      .or(`sender_id.eq.${user.id},recipient_id.eq.${user.id}`)
      .order('created_at', { ascending: false })

    if (!data) {
      setLoading(false)
      return
    }

    const partnerMap: Record<string, { lastMessage: string; lastAt: string; unread: number }> = {}
    data.forEach((m) => {
      const partnerId = m.sender_id === user.id ? m.recipient_id : m.sender_id
      if (!partnerMap[partnerId] || new Date(m.created_at) > new Date(partnerMap[partnerId].lastAt)) {
        partnerMap[partnerId] = {
          lastMessage: m.content,
          lastAt: m.created_at,
          unread: m.recipient_id === user.id && !m.read_at ? (partnerMap[partnerId]?.unread || 0) + 1 : partnerMap[partnerId]?.unread || 0,
        }
      }
    })

    const partnerIds = Object.keys(partnerMap)
    if (partnerIds.length === 0) {
      setConversations([])
      setLoading(false)
      return
    }

    const { data: profiles } = await supabase
      .from('profiles')
      .select('*')
      .in('id', partnerIds)

    const convos: Conversation[] = (profiles || []).map((p) => ({
      otherUser: p as Profile,
      ...partnerMap[p.id],
    }))
    convos.sort((a, b) => new Date(b.lastAt).getTime() - new Date(a.lastAt).getTime())
    setConversations(convos)
    setLoading(false)
  }, [user])

  useEffect(() => {
    loadConversations()
  }, [loadConversations])

  async function openConversation(other: Profile) {
    setActiveUser(other)
    setMessages([])
    const { data } = await supabase
      .from('messages')
      .select('id, sender_id, content, created_at')
      .or(`and(sender_id.eq.${user!.id},recipient_id.eq.${other.id}),and(sender_id.eq.${other.id},recipient_id.eq.${user!.id})`)
      .order('created_at', { ascending: true })
    setMessages(data || [])

    await supabase
      .from('messages')
      .update({ read_at: new Date().toISOString() })
      .eq('recipient_id', user!.id)
      .eq('sender_id', other.id)
      .is('read_at', null)

    setTimeout(() => {
      scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' })
    }, 100)
  }

  async function sendMessage() {
    if (!user || !activeUser || !draft.trim()) return
    setSending(true)
    const { data } = await supabase
      .from('messages')
      .insert({ sender_id: user.id, recipient_id: activeUser.id, content: draft.trim() })
      .select('id, sender_id, content, created_at')
      .single()
    if (data) {
      setMessages((prev) => [...prev, data])
      setDraft('')
      setTimeout(() => {
        scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' })
      }, 50)
      await supabase.from('notifications').insert({
        user_id: activeUser.id,
        actor_id: user.id,
        type: 'message',
      })
    }
    setSending(false)
  }

  if (activeUser) {
    return (
      <div className="flex flex-col h-[calc(100dvh-140px)]">
        <div className="flex items-center gap-3 border-b border-slate-100 px-4 py-3">
          <button onClick={() => setActiveUser(null)} className="text-slate-500">
            <ArrowLeft size={20} />
          </button>
          <Avatar name={activeUser.full_name} src={activeUser.avatar_url} size={36} />
          <div>
            <p className="text-sm font-semibold text-slate-800">{activeUser.full_name}</p>
            <p className="text-xs text-slate-400">@{activeUser.username}</p>
          </div>
        </div>

        <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-3 no-scrollbar">
          {messages.length === 0 && (
            <p className="text-center text-sm text-slate-400 py-8">No messages yet. Say hello!</p>
          )}
          {messages.map((m) => {
            const mine = m.sender_id === user?.id
            return (
              <div key={m.id} className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
                <div
                  className={`max-w-[75%] rounded-2xl px-4 py-2.5 text-sm ${
                    mine
                      ? 'bg-brand-600 text-white rounded-br-md'
                      : 'bg-slate-100 text-slate-800 rounded-bl-md'
                  }`}
                >
                  {m.content}
                </div>
              </div>
            )
          })}
        </div>

        <div className="border-t border-slate-100 p-3 flex items-center gap-2 safe-bottom">
          <input
            type="text"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="Type a message..."
            className="flex-1 rounded-full bg-slate-100 px-4 py-2.5 text-sm text-slate-800 outline-none focus:ring-2 focus:ring-brand-500/20"
            onKeyDown={(e) => { if (e.key === 'Enter' && !sending) sendMessage() }}
          />
          <button
            onClick={sendMessage}
            disabled={!draft.trim() || sending}
            className="flex h-10 w-10 items-center justify-center rounded-full bg-brand-600 text-white active:scale-90 disabled:opacity-40"
          >
            <Send size={16} />
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="p-4">
      <h2 className="font-display text-2xl font-bold text-slate-800 mb-4">Messages</h2>
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => <div key={i} className="h-16 rounded-xl shimmer-bg" />)}
        </div>
      ) : conversations.length === 0 ? (
        <div className="flex flex-col items-center justify-center pt-20 text-center">
          <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-brand-50">
            <MessageCircle size={28} className="text-brand-400" />
          </div>
          <h3 className="font-display text-lg font-semibold text-slate-700">No conversations</h3>
          <p className="mt-1 text-sm text-slate-500">Search for users to start messaging.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {conversations.map((c) => (
            <button
              key={c.otherUser.id}
              onClick={() => openConversation(c.otherUser)}
              className="flex w-full items-center gap-3 rounded-2xl bg-white p-3 shadow-sm ring-1 ring-slate-100 transition-all hover:shadow-md active:scale-[0.98]"
            >
              <Avatar name={c.otherUser.full_name} src={c.otherUser.avatar_url} size={48} />
              <div className="flex-1 min-w-0 text-left">
                <p className="truncate text-sm font-semibold text-slate-800">{c.otherUser.full_name}</p>
                <p className="truncate text-xs text-slate-400">{c.lastMessage}</p>
              </div>
              <div className="text-right">
                <p className="text-xs text-slate-300">{timeAgo(c.lastAt)}</p>
                {c.unread > 0 && (
                  <span className="mt-1 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-brand-600 px-1.5 text-xs font-bold text-white">
                    {c.unread}
                  </span>
                )}
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
