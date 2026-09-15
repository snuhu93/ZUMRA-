import { useEffect, useState, useCallback } from 'react'
import { supabase, Profile, Post } from '../lib/supabase'
import { useAuth } from '../lib/auth'
import { Avatar } from '../components/Avatar'
import { timeAgo, formatCount } from '../lib/utils'
import { Heart, MessageCircle, MoreHorizontal, Send, X, Loader2, Image as ImageIcon, Video as VideoIcon } from 'lucide-react'

type FeedPost = Post & {
  profiles: Pick<Profile, 'id' | 'username' | 'full_name' | 'avatar_url'> | null
  like_count: number
  comment_count: number
  liked_by_me: boolean
}

export default function Feed() {
  const { user } = useAuth()
  const [posts, setPosts] = useState<FeedPost[]>([])
  const [loading, setLoading] = useState(true)
  const [commentingPostId, setCommentingPostId] = useState<string | null>(null)
  const [commentText, setCommentText] = useState('')
  const [comments, setComments] = useState<Record<string, CommentRow[]>>({})
  const [postingComment, setPostingComment] = useState(false)

  type CommentRow = {
    id: string
    content: string
    created_at: string
    profiles: Pick<Profile, 'id' | 'username' | 'full_name' | 'avatar_url'> | null
  }

  const loadFeed = useCallback(async () => {
    setLoading(true)
    const { data: postsData, error: postsError } = await supabase
      .from('posts')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(50)

    if (postsError || !postsData) {
      console.error('Failed to load posts:', postsError)
      setPosts([])
      setLoading(false)
      return
    }

    const postIds = postsData.map((p) => p.id)

    const userIds = [...new Set(postsData.map((p) => p.user_id).filter(Boolean))]
    const { data: profilesData, error: profilesError } = userIds.length
      ? await supabase
          .from('profiles')
          .select('id, username, full_name, avatar_url')
          .in('id', userIds)
      : { data: [], error: null }

    if (profilesError) console.error('Failed to load post profiles:', profilesError)
    const profileMap: Record<string, Pick<Profile, 'id' | 'username' | 'full_name' | 'avatar_url'>> = {}
    profilesData?.forEach((profile) => {
      profileMap[profile.id] = profile
    })

    const [{ data: likes }, { data: commentsData }] = await Promise.all([
      supabase.from('likes').select('post_id, user_id').in('post_id', postIds),
      supabase.from('comments').select('post_id').in('post_id', postIds),
    ])

    const likeMap: Record<string, Set<string>> = {}
    likes?.forEach((l) => {
      if (!likeMap[l.post_id]) likeMap[l.post_id] = new Set()
      likeMap[l.post_id].add(l.user_id)
    })

    const commentCountMap: Record<string, number> = {}
    commentsData?.forEach((c) => {
      commentCountMap[c.post_id] = (commentCountMap[c.post_id] || 0) + 1
    })

    const feedPosts: FeedPost[] = postsData.map((p) => {
      const likers = likeMap[p.id] || new Set()
      return {
        ...p,
        profiles: profileMap[p.user_id] || null,
        like_count: likers.size,
        comment_count: commentCountMap[p.id] || 0,
        liked_by_me: user ? likers.has(user.id) : false,
      }
    })

    setPosts(feedPosts)
    setLoading(false)
  }, [user])

  useEffect(() => {
    loadFeed()
  }, [loadFeed])

  async function toggleLike(postId: string, liked: boolean) {
    if (!user) return
    setPosts((prev) =>
      prev.map((p) =>
        p.id === postId
          ? { ...p, liked_by_me: !liked, like_count: liked ? p.like_count - 1 : p.like_count + 1 }
          : p
      )
    )

    if (liked) {
      await supabase.from('likes').delete().eq('post_id', postId).eq('user_id', user.id)
    } else {
      await supabase.from('likes').insert({ post_id: postId, user_id: user.id })
      const post = posts.find((p) => p.id === postId)
      if (post && post.user_id !== user.id) {
        await supabase.from('notifications').insert({
          user_id: post.user_id,
          actor_id: user.id,
          type: 'like',
          post_id: postId,
        })
      }
    }
  }

  async function openComments(postId: string) {
    setCommentingPostId(postId)
    setCommentText('')
    const { data } = await supabase
      .from('comments')
      .select(`
        id, content, created_at,
        profiles:profiles!comments_user_id_fkey (id, username, full_name, avatar_url)
      `)
      .eq('post_id', postId)
      .order('created_at', { ascending: true })

    setComments((prev) => ({ ...prev, [postId]: ((data as unknown) as CommentRow[]) || [] }))
  }

  async function submitComment(postId: string) {
    if (!user || !commentText.trim()) return
    setPostingComment(true)
    const { data } = await supabase
      .from('comments')
      .insert({ post_id: postId, user_id: user.id, content: commentText.trim() })
      .select('id, content, created_at')
      .single()

    if (data) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('id, username, full_name, avatar_url')
        .eq('id', user.id)
        .maybeSingle()

      setComments((prev) => ({
        ...prev,
        [postId]: [
          ...(prev[postId] || []),
          { ...data, profiles: profile as CommentRow['profiles'] },
        ],
      }))
      setPosts((prev) =>
        prev.map((p) => (p.id === postId ? { ...p, comment_count: p.comment_count + 1 } : p))
      )
      setCommentText('')

      const post = posts.find((p) => p.id === postId)
      if (post && post.user_id !== user.id) {
        await supabase.from('notifications').insert({
          user_id: post.user_id,
          actor_id: user.id,
          type: 'comment',
          post_id: postId,
        })
      }
    }
    setPostingComment(false)
  }

  if (loading) {
    return (
      <div className="space-y-4 p-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="rounded-2xl bg-white p-4 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full shimmer-bg" />
              <div className="flex-1">
                <div className="h-3 w-24 rounded shimmer-bg" />
                <div className="mt-2 h-2 w-16 rounded shimmer-bg" />
              </div>
            </div>
            <div className="mt-4 h-3 w-full rounded shimmer-bg" />
            <div className="mt-2 h-3 w-2/3 rounded shimmer-bg" />
            <div className="mt-4 h-48 w-full rounded-xl shimmer-bg" />
          </div>
        ))}
      </div>
    )
  }

  if (posts.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center px-6 pt-20 text-center">
        <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-brand-50">
          <ImageIcon size={28} className="text-brand-400" />
        </div>
        <h3 className="font-display text-lg font-semibold text-slate-700">No posts yet</h3>
        <p className="mt-1 text-sm text-slate-500">Be the first to share something with your circle.</p>
      </div>
    )
  }

  return (
    <>
      <div className="space-y-3 p-3">
        {posts.map((post) => (
          <article
            key={post.id}
            className="overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-slate-100 animate-fade-in"
          >
            {/* Header */}
            <div className="flex items-center gap-3 px-4 pt-4">
              <Avatar name={post.profiles?.full_name || 'User'} src={post.profiles?.avatar_url} size={40} />
              <div className="flex-1 min-w-0">
                <p className="truncate text-sm font-semibold text-slate-800">
                  {post.profiles?.full_name || 'Unknown User'}
                </p>
                <p className="truncate text-xs text-slate-400">
                  @{post.profiles?.username || 'user'} · {timeAgo(post.created_at)}
                </p>
              </div>
              <button className="text-slate-400 hover:text-slate-600">
                <MoreHorizontal size={20} />
              </button>
            </div>

            {/* Content */}
            {post.content && (
              <p className="px-4 pt-3 text-sm leading-relaxed text-slate-700 whitespace-pre-wrap">
                {post.content}
              </p>
            )}

            {/* Media */}
            {post.media_url && post.media_type === 'image' && (
              <div className="mt-3">
                <img src={post.media_url} alt="" className="w-full max-h-96 object-cover" />
              </div>
            )}
            {post.media_url && post.media_type === 'video' && (
              <div className="mt-3">
                <video src={post.media_url} controls className="w-full max-h-96 object-cover" />
              </div>
            )}

            {/* Actions */}
            <div className="flex items-center gap-6 px-4 py-3">
              <button
                onClick={() => toggleLike(post.id, post.liked_by_me)}
                className="flex items-center gap-1.5 transition-transform active:scale-90"
              >
                <Heart
                  size={20}
                  className={
                    post.liked_by_me
                      ? 'fill-rose-500 text-rose-500 animate-heart-pop'
                      : 'text-slate-400'
                  }
                />
                <span className={`text-sm ${post.liked_by_me ? 'text-rose-500 font-medium' : 'text-slate-400'}`}>
                  {formatCount(post.like_count)}
                </span>
              </button>
              <button
                onClick={() => openComments(post.id)}
                className="flex items-center gap-1.5 text-slate-400 transition-transform active:scale-90"
              >
                <MessageCircle size={20} />
                <span className="text-sm">{formatCount(post.comment_count)}</span>
              </button>
            </div>
          </article>
        ))}
      </div>

      {/* Comment sheet */}
      {commentingPostId && (
        <div className="fixed inset-0 z-50 flex items-end justify-center">
          <div
            className="absolute inset-0 bg-black/40 animate-fade-in"
            onClick={() => setCommentingPostId(null)}
          />
          <div className="relative w-full max-w-md rounded-t-3xl bg-white animate-slide-up max-h-[70vh] flex flex-col">
            <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
              <h3 className="font-display font-semibold text-slate-800">Comments</h3>
              <button onClick={() => setCommentingPostId(null)} className="text-slate-400">
                <X size={20} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-4 no-scrollbar">
              {(comments[commentingPostId] || []).length === 0 && (
                <p className="text-center text-sm text-slate-400 py-8">No comments yet. Start the conversation.</p>
              )}
              {(comments[commentingPostId] || []).map((c) => (
                <div key={c.id} className="flex gap-3">
                  <Avatar name={c.profiles?.full_name || 'User'} src={c.profiles?.avatar_url} size={32} />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-slate-700">
                      {c.profiles?.full_name || 'User'}
                      <span className="ml-2 font-normal text-slate-400">@{c.profiles?.username}</span>
                    </p>
                    <p className="mt-0.5 text-sm text-slate-600">{c.content}</p>
                    <p className="mt-0.5 text-xs text-slate-300">{timeAgo(c.created_at)}</p>
                  </div>
                </div>
              ))}
            </div>

            <div className="border-t border-slate-100 p-3 flex items-center gap-2 safe-bottom">
              <input
                type="text"
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                placeholder="Write a comment..."
                className="flex-1 rounded-full bg-slate-100 px-4 py-2.5 text-sm text-slate-800 outline-none focus:ring-2 focus:ring-brand-500/20"
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !postingComment) submitComment(commentingPostId)
                }}
              />
              <button
                onClick={() => submitComment(commentingPostId)}
                disabled={!commentText.trim() || postingComment}
                className="flex h-10 w-10 items-center justify-center rounded-full bg-brand-600 text-white transition-transform active:scale-90 disabled:opacity-40"
              >
                {postingComment ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
