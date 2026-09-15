import { useEffect, useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase, Profile, Notification } from '../lib/supabase'
import { useAuth } from '../lib/auth'
import { Avatar } from '../components/Avatar'
import { timeAgo } from '../lib/utils'
import { Heart, MessageCircle, UserPlus, Mail, Bell } from 'lucide-react'

type NotificationRow = Notification & {
  actor: Pick<Profile, 'id' | 'username' | 'full_name' | 'avatar_url'> | null
}

export default function Notifications() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [notifications, setNotifications] = useState<NotificationRow[]>([])
  const [loading, setLoading] = useState(true)

  const loadNotifications = useCallback(async () => {
    if (!user) return
    setLoading(true)
    const { data } = await supabase
      .from('notifications')
      .select(`
        *,
        actor:profiles!notifications_actor_id_fkey (id, username, full_name, avatar_url)
      `)
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(50)

    setNotifications((data as NotificationRow[]) || [])
    setLoading(false)

    await supabase
      .from('notifications')
      .update({ read: true })
      .eq('user_id', user.id)
      .eq('read', false)
  }, [user])

  useEffect(() => {
    loadNotifications()
  }, [loadNotifications])

  const iconFor = (type: string) => {
    switch (type) {
      case 'like': return <Heart size={14} className="text-rose-500 fill-rose-500" />
      case 'comment': return <MessageCircle size={14} className="text-sky-500" />
      case 'follow': return <UserPlus size={14} className="text-brand-500" />
      case 'message': return <Mail size={14} className="text-accent-500" />
      default: return <Bell size={14} className="text-slate-400" />
    }
  }

  const textFor = (type: string) => {
    switch (type) {
      case 'like': return 'liked your post'
      case 'comment': return 'commented on your post'
      case 'follow': return 'started following you'
      case 'message': return 'sent you a message'
      default: return 'interacted with you'
    }
  }

  if (loading) {
    return (
      <div className="p-4 space-y-3">
        {[1, 2, 3, 4].map((i) => <div key={i} className="h-16 rounded-xl shimmer-bg" />)}
      </div>
    )
  }

  if (notifications.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center px-6 pt-20 text-center">
        <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-brand-50">
          <Bell size={28} className="text-brand-400" />
        </div>
        <h3 className="font-display text-lg font-semibold text-slate-700">No notifications</h3>
        <p className="mt-1 text-sm text-slate-500">You're all caught up. Activity from others will appear here.</p>
      </div>
    )
  }

  return (
    <div className="p-4">
      <h2 className="font-display text-2xl font-bold text-slate-800 mb-4">Notifications</h2>
      <div className="space-y-2">
        {notifications.map((n) => (
          <div
            key={n.id}
            className={`flex items-center gap-3 rounded-2xl bg-white p-3 shadow-sm ring-1 ring-slate-100 transition-all hover:shadow-md animate-fade-in ${
              !n.read ? 'ring-brand-200' : ''
            }`}
          >
            <div className="relative">
              <Avatar name={n.actor?.full_name || 'User'} src={n.actor?.avatar_url} size={44} />
              <div className="absolute -bottom-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-white ring-1 ring-slate-100">
                {iconFor(n.type)}
              </div>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm text-slate-700">
                <span className="font-semibold">{n.actor?.full_name || 'Someone'}</span>{' '}
                <span className="text-slate-500">{textFor(n.type)}</span>
              </p>
              <p className="text-xs text-slate-300">{timeAgo(n.created_at)}</p>
            </div>
            {n.type === 'follow' && n.actor && (
              <button
                onClick={() => navigate(`/profile/${n.actor!.id}`)}
                className="rounded-lg bg-brand-50 px-3 py-1.5 text-xs font-semibold text-brand-600 hover:bg-brand-100"
              >
                View
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
