import { useEffect, useState, useCallback } from 'react'
import { supabase, Profile, Post } from '../lib/supabase'
import { useAuth } from '../lib/auth'
import { Avatar } from '../components/Avatar'
import { timeAgo, formatCount } from '../lib/utils'
import { Heart, MessageCircle, Play } from 'lucide-react'

type VideoPost = Post & {
  profiles: Pick<Profile, 'id' | 'username' | 'full_name' | 'avatar_url'> | null
  like_count: number
  comment_count: number
}

export default function Videos() {
  const { user } = useAuth()
  const [videos, setVideos] = useState<VideoPost[]>([])
  const [loading, setLoading] = useState(true)

  const loadVideos = useCallback(async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('posts')
      .select(`
        *,
        profiles:profiles!posts_user_id_fkey (id, username, full_name, avatar_url)
      `)
      .eq('media_type', 'video')
      .order('created_at', { ascending: false })
      .limit(50)

    if (error || !data) {
      setLoading(false)
      return
    }

    const postIds = data.map((p) => p.id)
    const [{ data: likes }, { data: comments }] = await Promise.all([
      supabase.from('likes').select('post_id, user_id').in('post_id', postIds),
      supabase.from('comments').select('post_id').in('post_id', postIds),
    ])

    const likeMap: Record<string, Set<string>> = {}
    likes?.forEach((l) => {
      if (!likeMap[l.post_id]) likeMap[l.post_id] = new Set()
      likeMap[l.post_id].add(l.user_id)
    })
    const commentCountMap: Record<string, number> = {}
    comments?.forEach((c) => { commentCountMap[c.post_id] = (commentCountMap[c.post_id] || 0) + 1 })

    setVideos(
      data.map((p) => ({
        ...p,
        profiles: (p as any).profiles,
        like_count: (likeMap[p.id] || new Set()).size,
        comment_count: commentCountMap[p.id] || 0,
      }))
    )
    setLoading(false)
  }, [])

  useEffect(() => {
    loadVideos()
  }, [loadVideos])

  if (loading) {
    return (
      <div className="p-4 space-y-4">
        {[1, 2].map((i) => (
          <div key={i} className="h-64 rounded-2xl shimmer-bg" />
        ))}
      </div>
    )
  }

  if (videos.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center px-6 pt-20 text-center">
        <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-brand-50">
          <Play size={28} className="text-brand-400" />
        </div>
        <h3 className="font-display text-lg font-semibold text-slate-700">No videos yet</h3>
        <p className="mt-1 text-sm text-slate-500">Video posts from your circle will appear here.</p>
      </div>
    )
  }

  return (
    <div className="p-3 space-y-4">
      {videos.map((video) => (
        <article key={video.id} className="overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-slate-100 animate-fade-in">
          <div className="flex items-center gap-3 px-4 pt-4">
            <Avatar name={video.profiles?.full_name || 'User'} src={video.profiles?.avatar_url} size={36} />
            <div className="flex-1 min-w-0">
              <p className="truncate text-sm font-semibold text-slate-800">{video.profiles?.full_name || 'User'}</p>
              <p className="truncate text-xs text-slate-400">@{video.profiles?.username} · {timeAgo(video.created_at)}</p>
            </div>
          </div>
          {video.content && <p className="px-4 pt-2 text-sm text-slate-700">{video.content}</p>}
          <div className="mt-3 relative">
            <video src={video.media_url!} controls className="w-full max-h-96 object-cover" />
          </div>
          <div className="flex items-center gap-6 px-4 py-3">
            <span className="flex items-center gap-1.5 text-slate-400">
              <Heart size={18} /> <span className="text-sm">{formatCount(video.like_count)}</span>
            </span>
            <span className="flex items-center gap-1.5 text-slate-400">
              <MessageCircle size={18} /> <span className="text-sm">{formatCount(video.comment_count)}</span>
            </span>
          </div>
        </article>
      ))}
    </div>
  )
}
