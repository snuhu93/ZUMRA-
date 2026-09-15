import { useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../lib/auth'
import { Avatar } from '../components/Avatar'
import { Image as ImageIcon, Video as VideoIcon, X, Loader2, Globe } from 'lucide-react'

export default function CreatePost() {
  const { user, profile } = useAuth()
  const navigate = useNavigate()
  const [content, setContent] = useState('')
  const [mediaUrl, setMediaUrl] = useState('')
  const [mediaType, setMediaType] = useState<'text' | 'image' | 'video'>('text')
  const [posting, setPosting] = useState(false)
  const [error, setError] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)
  const videoInputRef = useRef<HTMLInputElement>(null)

  function handleImagePick(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => {
      setMediaUrl(reader.result as string)
      setMediaType('image')
    }
    reader.readAsDataURL(file)
  }

  function handleVideoPick(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => {
      setMediaUrl(reader.result as string)
      setMediaType('video')
    }
    reader.readAsDataURL(file)
  }

  function removeMedia() {
    setMediaUrl('')
    setMediaType('text')
    if (fileInputRef.current) fileInputRef.current.value = ''
    if (videoInputRef.current) videoInputRef.current.value = ''
  }

  async function handlePost() {
    if (!user) {
      setError('You must be signed in to create a post.')
      return
    }
    if (!content.trim() && !mediaUrl) return

    setPosting(true)
    setError('')

    const { error } = await supabase.from('posts').insert({
      user_id: user.id,
      content: content.trim(),
      media_url: mediaUrl || null,
      media_type: mediaUrl ? mediaType : 'text',
    })

    if (error) {
      console.error('Failed to create post:', error)
      setError(error.message || 'Could not create the post. Please try again.')
      setPosting(false)
      return
    }

    navigate('/feed', { replace: true })
  }

  return (
    <div className="flex flex-col min-h-[calc(100dvh-140px)]">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
        <button onClick={() => navigate('/feed')} className="text-sm font-medium text-slate-500">
          Cancel
        </button>
        <h2 className="font-display font-semibold text-slate-800">New Post</h2>
        <button
          onClick={handlePost}
          disabled={posting || (!content.trim() && !mediaUrl)}
          className="rounded-full bg-brand-600 px-5 py-1.5 text-sm font-semibold text-white transition-all active:scale-95 disabled:opacity-40"
        >
          {posting ? <Loader2 size={14} className="animate-spin" /> : 'Post'}
        </button>
      </div>

      {/* Content area */}
      <div className="flex-1 p-4">
        <div className="flex gap-3">
          <Avatar name={profile?.full_name || 'User'} src={profile?.avatar_url} size={44} />
          <div className="flex-1">
            <p className="text-sm font-semibold text-slate-800">{profile?.full_name || 'User'}</p>
            <div className="mt-0.5 inline-flex items-center gap-1 rounded-full bg-brand-50 px-2 py-0.5 text-xs text-brand-600">
              <Globe size={10} /> Public
            </div>
          </div>
        </div>

        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="What's on your mind?"
          rows={5}
          className="mt-4 w-full resize-none bg-transparent text-base text-slate-800 outline-none placeholder:text-slate-400"
          autoFocus
        />

        {/* Media preview */}
        {mediaUrl && (
          <div className="relative mt-3 rounded-2xl overflow-hidden ring-1 ring-slate-200 animate-scale-in">
            {mediaType === 'image' ? (
              <img src={mediaUrl} alt="" className="w-full max-h-80 object-cover" />
            ) : (
              <video src={mediaUrl} controls className="w-full max-h-80 object-cover" />
            )}
            <button
              onClick={removeMedia}
              className="absolute top-2 right-2 flex h-8 w-8 items-center justify-center rounded-full bg-black/60 text-white backdrop-blur-sm"
            >
              <X size={16} />
            </button>
          </div>
        )}

        {error && (
          <div className="mt-3 rounded-xl bg-rose-50 px-4 py-3 text-sm text-rose-600">{error}</div>
        )}
      </div>

      {/* Media buttons */}
      <div className="border-t border-slate-100 px-4 py-3 flex items-center gap-4">
        <input ref={fileInputRef} type="file" accept="image/*" onChange={handleImagePick} className="hidden" />
        <input ref={videoInputRef} type="file" accept="video/*" onChange={handleVideoPick} className="hidden" />
        <button
          onClick={() => fileInputRef.current?.click()}
          className="flex items-center gap-2 rounded-xl bg-slate-100 px-3 py-2 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-200 active:scale-95"
        >
          <ImageIcon size={18} className="text-brand-500" /> Photo
        </button>
        <button
          onClick={() => videoInputRef.current?.click()}
          className="flex items-center gap-2 rounded-xl bg-slate-100 px-3 py-2 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-200 active:scale-95"
        >
          <VideoIcon size={18} className="text-accent-500" /> Video
        </button>
      </div>
    </div>
  )
}
