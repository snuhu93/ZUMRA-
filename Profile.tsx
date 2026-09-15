import { useEffect, useState, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase, Profile, Post } from '../lib/supabase'
import { useAuth } from '../lib/auth'
import { Avatar } from '../components/Avatar'
import { timeAgo, formatCount } from '../lib/utils'
import { Settings, Heart, MessageCircle, Grid3x3, UserPlus, UserCheck, LogOut, Edit2, X, Check, Loader2 } from 'lucide-react'

export default function ProfileScreen() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { user, profile: myProfile, signOut, refreshProfile } = useAuth()
  const profileId = id || user?.id || ''
  const isOwn = profileId === user?.id

  const [profile, setProfile] = useState<Profile | null>(null)
  const [posts, setPosts] = useState<(Post & { like_count: number; comment_count: number })[]>([])
  const [followers, setFollowers] = useState(0)
  const [following, setFollowing] = useState(0)
  const [isFollowing, setIsFollowing] = useState(false)
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(false)
  const [editName, setEditName] = useState('')
  const [editBio, setEditBio] = useState('')
  const [saving, setSaving] = useState(false)

  const loadData = useCallback(async () => {
    setLoading(true)
    const { data: prof } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', profileId)
      .maybeSingle()
    setProfile(prof as Profile | null)

    const { data: postData } = await supabase
      .from('posts')
      .select('*')
      .eq('user_id', profileId)
      .order('created_at', { ascending: false })

    const postIds = (postData || []).map((p) => p.id)

    const [{ data: likes }, { data: comments }, { data: followerRows }, { data: followingRows }, myFollowRes] = await Promise.all([
      postIds.length > 0
        ? supabase.from('likes').select('post_id').in('post_id', postIds)
        : Promise.resolve({ data: [] as { post_id: string }[] | null }),
      postIds.length > 0
        ? supabase.from('comments').select('post_id').in('post_id', postIds)
        : Promise.resolve({ data: [] as { post_id: string }[] | null }),
      supabase.from('follows').select('follower_id').eq('following_id', profileId),
      supabase.from('follows').select('following_id').eq('follower_id', profileId),
      user && !isOwn
        ? supabase.from('follows').select('id').eq('follower_id', user.id).eq('following_id', profileId).maybeSingle()
        : Promise.resolve({ data: null } as { data: unknown }),
    ])

    const likeCountMap: Record<string, number> = {}
    likes?.forEach((l) => { likeCountMap[l.post_id] = (likeCountMap[l.post_id] || 0) + 1 })
    const commentCountMap: Record<string, number> = {}
    comments?.forEach((c) => { commentCountMap[c.post_id] = (commentCountMap[c.post_id] || 0) + 1 })

    setPosts(
      (postData || []).map((p) => ({
        ...p,
        like_count: likeCountMap[p.id] || 0,
        comment_count: commentCountMap[p.id] || 0,
      }))
    )
    setFollowers(followerRows?.length || 0)
    setFollowing(followingRows?.length || 0)
    setIsFollowing(!!myFollowRes?.data)
    setLoading(false)
  }, [profileId, user, isOwn])

  useEffect(() => {
    loadData()
  }, [loadData])

  async function toggleFollow() {
    if (!user || isOwn) return
    if (isFollowing) {
      await supabase.from('follows').delete().eq('follower_id', user.id).eq('following_id', profileId)
      setIsFollowing(false)
      setFollowers((f) => f - 1)
    } else {
      await supabase.from('follows').insert({ follower_id: user.id, following_id: profileId })
      await supabase.from('notifications').insert({
        user_id: profileId,
        actor_id: user.id,
        type: 'follow',
      })
      setIsFollowing(true)
      setFollowers((f) => f + 1)
    }
  }

  function startEdit() {
    setEditName(profile?.full_name || '')
    setEditBio(profile?.bio || '')
    setEditing(true)
  }

  async function saveEdit() {
    setSaving(true)
    await supabase
      .from('profiles')
      .update({ full_name: editName.trim(), bio: editBio.trim() })
      .eq('id', user!.id)
    await refreshProfile()
    await loadData()
    setSaving(false)
    setEditing(false)
  }

  if (loading) {
    return (
      <div className="p-4 space-y-4">
        <div className="h-32 rounded-2xl shimmer-bg" />
        <div className="h-6 w-32 rounded shimmer-bg" />
        <div className="h-12 w-full rounded-xl shimmer-bg" />
      </div>
    )
  }

  return (
    <div className="pb-4">
      {/* Cover */}
      <div className="relative h-28 bg-gradient-to-br from-brand-500 to-brand-700">
        {isOwn && (
          <button
            onClick={() => navigate('/notifications')}
            className="absolute right-3 top-3 flex h-9 w-9 items-center justify-center rounded-full bg-black/20 text-white backdrop-blur-sm"
          >
            <Settings size={18} />
          </button>
        )}
      </div>

      {/* Avatar + info */}
      <div className="px-4 -mt-12">
        <div className="flex items-end justify-between">
          <Avatar
            name={profile?.full_name || 'User'}
            src={profile?.avatar_url}
            size={88}
            className="ring-4 ring-white"
          />
          {isOwn ? (
            <button
              onClick={startEdit}
              className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50 active:scale-95"
            >
              <Edit2 size={14} /> Edit Profile
            </button>
          ) : (
            <button
              onClick={toggleFollow}
              className={`flex items-center gap-1.5 rounded-xl px-5 py-2 text-sm font-semibold transition-all active:scale-95 ${
                isFollowing
                  ? 'border border-slate-200 bg-white text-slate-700'
                  : 'bg-brand-600 text-white shadow-md shadow-brand-500/30'
              }`}
            >
              {isFollowing ? <UserCheck size={14} /> : <UserPlus size={14} />}
              {isFollowing ? 'Following' : 'Follow'}
            </button>
          )}
        </div>

        <div className="mt-3">
          <h2 className="font-display text-xl font-bold text-slate-800">{profile?.full_name || 'User'}</h2>
          <p className="text-sm text-slate-400">@{profile?.username || 'user'}</p>
          {profile?.bio && <p className="mt-2 text-sm text-slate-600">{profile.bio}</p>}
        </div>

        {/* Stats */}
        <div className="mt-4 flex gap-6">
          <div>
            <span className="font-display text-lg font-bold text-slate-800">{formatCount(posts.length)}</span>
            <span className="ml-1 text-sm text-slate-400">Posts</span>
          </div>
          <div>
            <span className="font-display text-lg font-bold text-slate-800">{formatCount(followers)}</span>
            <span className="ml-1 text-sm text-slate-400">Followers</span>
          </div>
          <div>
            <span className="font-display text-lg font-bold text-slate-800">{formatCount(following)}</span>
            <span className="ml-1 text-sm text-slate-400">Following</span>
          </div>
        </div>

        {isOwn && (
          <button
            onClick={signOut}
            className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl border border-rose-100 bg-rose-50 py-2.5 text-sm font-medium text-rose-600 transition-colors hover:bg-rose-100 active:scale-95"
          >
            <LogOut size={16} /> Sign Out
          </button>
        )}
      </div>

      {/* Posts grid */}
      <div className="mt-6 px-4">
        <div className="flex items-center gap-2 mb-3">
          <Grid3x3 size={18} className="text-slate-400" />
          <h3 className="text-sm font-semibold text-slate-500">Posts</h3>
        </div>

        {posts.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-slate-100">
              <Grid3x3 size={24} className="text-slate-300" />
            </div>
            <p className="text-sm text-slate-400">No posts yet</p>
          </div>
        ) : (
          <div className="space-y-3">
            {posts.map((post) => (
              <div key={post.id} className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-100 animate-fade-in">
                <p className="text-sm text-slate-700 whitespace-pre-wrap line-clamp-3">{post.content}</p>
                {post.media_url && post.media_type === 'image' && (
                  <img src={post.media_url} alt="" className="mt-3 w-full max-h-64 object-cover rounded-xl" />
                )}
                {post.media_url && post.media_type === 'video' && (
                  <video src={post.media_url} controls className="mt-3 w-full max-h-64 object-cover rounded-xl" />
                )}
                <div className="mt-3 flex items-center gap-4 text-slate-400">
                  <span className="flex items-center gap-1 text-xs">
                    <Heart size={14} /> {formatCount(post.like_count)}
                  </span>
                  <span className="flex items-center gap-1 text-xs">
                    <MessageCircle size={14} /> {formatCount(post.comment_count)}
                  </span>
                  <span className="ml-auto text-xs text-slate-300">{timeAgo(post.created_at)}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Edit modal */}
      {editing && (
        <div className="fixed inset-0 z-50 flex items-end justify-center">
          <div className="absolute inset-0 bg-black/40 animate-fade-in" onClick={() => setEditing(false)} />
          <div className="relative w-full max-w-md rounded-t-3xl bg-white animate-slide-up p-5 safe-bottom">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-display font-semibold text-slate-800">Edit Profile</h3>
              <button onClick={() => setEditing(false)} className="text-slate-400">
                <X size={20} />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700">Name</label>
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-800 outline-none focus:border-brand-500 focus:bg-white focus:ring-2 focus:ring-brand-500/20"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700">Bio</label>
                <textarea
                  value={editBio}
                  onChange={(e) => setEditBio(e.target.value)}
                  rows={3}
                  maxLength={160}
                  className="w-full resize-none rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-800 outline-none focus:border-brand-500 focus:bg-white focus:ring-2 focus:ring-brand-500/20"
                />
                <p className="mt-1 text-right text-xs text-slate-400">{editBio.length}/160</p>
              </div>
              <button
                onClick={saveEdit}
                disabled={saving}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-brand-600 py-3 font-semibold text-white active:scale-95 disabled:opacity-50"
              >
                {saving ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />} Save
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

