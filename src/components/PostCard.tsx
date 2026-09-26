import { useState, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Avatar from '@/components/Avatar';
import { useAuth } from '@/contexts/AuthContext';
import { useSettings } from '@/contexts/SettingsContext';
import { toggleLike, toggleSave, deletePost, type FeedPost } from '@/services/posts';
import { getPublicUrl } from '@/services/storage';
import { optimizedImageUrl } from '@/utils/mediaOptimization';
import { ThumbsUp, MessageCircle, Share2, X, Volume2, VolumeX } from 'lucide-react';

function timeAgo(iso: string): string {
  const seconds = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (seconds < 60) return 'now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d`;
  return new Date(iso).toLocaleDateString();
}

export default function PostCard({ post, onChanged }: { post: FeedPost; onChanged?: () => void }) {
  const { user } = useAuth();
  const { dataSaver, autoplayVideos } = useSettings();
  const navigate = useNavigate();
  const [liked, setLiked] = useState(!!post.liked_by_me);
  const [likeCount, setLikeCount] = useState(post.like_count);
  const [saved, setSaved] = useState(!!post.saved_by_me);
  const [menuOpen, setMenuOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [fullscreenMediaId, setFullscreenMediaId] = useState<string | null>(null);
  const [muted, setMuted] = useState(false);
  const videoRefs = useRef<Record<string, HTMLVideoElement | null>>({});

  const isOwner = user?.id === post.author_id;

  const handleLike = async () => {
    if (!user || busy) return;
    setBusy(true);
    const next = !liked;
    setLiked(next);
    setLikeCount((c) => c + (next ? 1 : -1));
    try {
      await toggleLike(post.id, user.id, liked);
    } catch {
      setLiked(!next);
      setLikeCount((c) => c + (next ? -1 : 1));
    } finally {
      setBusy(false);
    }
  };

  const handleSave = async () => {
    if (!user) return;
    const next = !saved;
    setSaved(next);
    try {
      await toggleSave(post.id, user.id, saved);
    } catch {
      setSaved(!next);
    }
  };

  const handleDelete = async () => {
    setMenuOpen(false);
    await deletePost(post.id);
    onChanged?.();
  };

  const handleCopyLink = async () => {
    setMenuOpen(false);
    await navigator.clipboard.writeText(`${window.location.origin}/post/${post.id}`);
  };

  const handleShare = async () => {
    try {
      await navigator.clipboard.writeText(`${window.location.origin}/post/${post.id}`);
    } catch {
      // clipboard not available, ignore
    }
  };

  const imageWidth = dataSaver ? 480 : 800;
  const activeVideo = post.post_media?.find((m) => m.id === fullscreenMediaId);

  return (
    <article className="mb-2 bg-white p-4 dark:bg-gray-900">
      <div className="flex items-start justify-between">
        <Link to={`/profile/${post.author?.username}`} className="flex items-center gap-3">
          <Avatar src={post.author?.avatar_url} name={post.author?.full_name ?? 'User'} />
          <div>
            <p className="text-sm font-semibold">{post.author?.full_name}</p>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              @{post.author?.username} · {timeAgo(post.created_at)}
            </p>
          </div>
        </Link>
        <div className="relative">
          <button onClick={() => setMenuOpen((v) => !v)} aria-label="Post options" className="px-2 text-gray-400">⋯</button>
          {menuOpen && (
            <div className="absolute right-0 z-10 w-40 rounded-lg border border-gray-200 bg-white py-1 text-sm shadow-lg dark:border-gray-700 dark:bg-gray-800">
              {isOwner && (
                <button onClick={() => navigate(`/post/${post.id}/edit`)} className="block w-full px-3 py-2 text-left hover:bg-gray-50 dark:hover:bg-gray-700">Edit</button>
              )}
              {isOwner && (
                <button onClick={handleDelete} className="block w-full px-3 py-2 text-left text-red-600 hover:bg-gray-50 dark:hover:bg-gray-700">Delete</button>
              )}
              <button onClick={handleSave} className="block w-full px-3 py-2 text-left hover:bg-gray-50 dark:hover:bg-gray-700">{saved ? 'Unsave' : 'Save'}</button>
              <button onClick={handleCopyLink} className="block w-full px-3 py-2 text-left hover:bg-gray-50 dark:hover:bg-gray-700">Copy link</button>
              {!isOwner && (
                <button onClick={() => navigate(`/report?type=post&id=${post.id}`)} className="block w-full px-3 py-2 text-left text-red-600 hover:bg-gray-50 dark:hover:bg-gray-700">Report</button>
              )}
            </div>
          )}
        </div>
      </div>

      {post.content && <p className="mt-3 whitespace-pre-wrap text-sm">{post.content}</p>}

      {post.post_media?.length > 0 && (
        <div className={`mt-3 grid gap-1 ${post.post_media.length > 1 ? 'grid-cols-2' : 'grid-cols-1'}`}>
          {post.post_media
            .sort((a, b) => a.position - b.position)
            .map((m) =>
              m.media_type === 'image' ? (
                <img
                  key={m.id}
                  src={optimizedImageUrl(getPublicUrl('post-images', m.storage_path) ?? '', imageWidth)}
                  alt=""
                  loading="lazy"
                  className="max-h-96 w-full rounded-lg object-cover"
                />
              ) : (
                <button
                  key={m.id}
                  onClick={() => { setFullscreenMediaId(m.id); setMuted(false); }}
                  className="relative flex h-56 w-full items-center justify-center overflow-hidden rounded-lg bg-gray-800"
                  aria-label="Play video"
                >
                  {!m.thumbnail_path && !dataSaver && autoplayVideos && (
                    <video
                      src={`${getPublicUrl('post-videos', m.storage_path) ?? ''}#t=0.1`}
                      preload="metadata"
                      muted
                      playsInline
                      className="absolute inset-0 h-full w-full object-cover"
                    />
                  )}
                  {m.thumbnail_path && (
                    <img src={getPublicUrl('post-images', m.thumbnail_path) ?? ''} alt="" className="absolute inset-0 h-full w-full object-cover" />
                  )}
                  <span className="z-10 flex h-12 w-12 items-center justify-center rounded-full bg-white/90 text-xl">▶</span>
                </button>
              )
            )}
        </div>
      )}

      <div className="mt-3 flex items-center justify-around border-t border-gray-100 pt-2 dark:border-gray-800">
        <button onClick={handleLike} className="flex items-center gap-2 rounded-full px-3 py-1.5 transition hover:bg-gray-100 dark:hover:bg-gray-800">
          <ThumbsUp
            style={{ width: 'clamp(18px, 5vw, 20px)', height: 'clamp(18px, 5vw, 20px)' }}
            fill={liked ? '#0C7D46' : 'none'}
            color={liked ? '#0C7D46' : 'currentColor'}
          />
          <span className={`text-sm ${liked ? 'font-semibold text-zumra-600' : 'text-gray-500 dark:text-gray-400'}`}>
            {likeCount}
          </span>
        </button>

        <button onClick={() => navigate(`/post/${post.id}`)} className="flex items-center gap-2 rounded-full px-3 py-1.5 transition hover:bg-gray-100 dark:hover:bg-gray-800">
          <MessageCircle style={{ width: 'clamp(18px, 5vw, 20px)', height: 'clamp(18px, 5vw, 20px)' }} />
          <span className="text-sm text-gray-500 dark:text-gray-400">{post.comment_count}</span>
        </button>

        <button onClick={() => navigate(`/post/${post.id}/share`)} className="flex items-center gap-2 rounded-full px-3 py-1.5 transition hover:bg-gray-100 dark:hover:bg-gray-800">
          <Share2 style={{ width: 'clamp(18px, 5vw, 20px)', height: 'clamp(18px, 5vw, 20px)' }} />
          <span className="text-sm text-gray-500 dark:text-gray-400">{post.share_count}</span>
        </button>
      </div>

      {activeVideo && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black">
          <button
            onClick={() => setFullscreenMediaId(null)}
            className="fixed z-50 flex items-center justify-center rounded-full bg-black/50 text-white"
            style={{
              top: 'clamp(12px, 2vh, 16px)',
              left: 'clamp(12px, 3vw, 16px)',
              width: 'clamp(36px, 9vw, 40px)',
              height: 'clamp(36px, 9vw, 40px)',
            }}
            aria-label="Close"
          >
            <X size={20} />
          </button>

          <button
            onClick={() => setMuted((m) => !m)}
            className="fixed z-50 flex items-center justify-center rounded-full bg-black/50 text-white"
            style={{
              top: 'clamp(12px, 2vh, 16px)',
              right: 'clamp(12px, 3vw, 16px)',
              width: 'clamp(36px, 9vw, 40px)',
              height: 'clamp(36px, 9vw, 40px)',
            }}
            aria-label={muted ? 'Unmute' : 'Mute'}
          >
            {muted ? <VolumeX size={18} /> : <Volume2 size={18} />}
          </button>

          <video
            ref={(el) => { videoRefs.current[activeVideo.id] = el; }}
            src={getPublicUrl('post-videos', activeVideo.storage_path) ?? ''}
            className="h-full w-full object-contain"
            autoPlay
            loop
            muted={muted}
            playsInline
            onClick={(e) => {
              const v = e.currentTarget;
              v.paused ? v.play() : v.pause();
            }}
          />

          <div className="absolute inset-x-0 bottom-0 flex items-end justify-between bg-gradient-to-t from-black/70 to-transparent p-4 pb-6">
            <Link to={`/profile/${post.author?.username}`} className="flex items-center gap-2">
              <Avatar src={post.author?.avatar_url ?? null} name={post.author?.full_name ?? 'User'} />
              <div>
                <p className="text-sm font-semibold text-white">{post.author?.full_name ?? 'User'}</p>
                {post.content && <p className="line-clamp-2 max-w-[70vw] text-xs text-gray-200">{post.content}</p>}
              </div>
            </Link>

            <div className="flex flex-col items-center text-white" style={{ gap: 'clamp(16px, 3.5vh, 24px)' }}>
              <button onClick={handleLike} className="flex flex-col items-center gap-1">
                <ThumbsUp
                  style={{ width: 'clamp(26px, 7vw, 30px)', height: 'clamp(26px, 7vw, 30px)' }}
                  fill={liked ? '#0C7D46' : 'none'}
                  color={liked ? '#0C7D46' : 'white'}
                />
                <span className="text-xs font-semibold">{likeCount}</span>
              </button>

              <Link to={`/post/${post.id}`} className="flex flex-col items-center gap-1">
                <MessageCircle style={{ width: 'clamp(26px, 7vw, 30px)', height: 'clamp(26px, 7vw, 30px)' }} />
                <span className="text-xs font-semibold">{post.comment_count}</span>
              </Link>

              <button onClick={handleShare} className="flex flex-col items-center gap-1">
                <Share2 style={{ width: 'clamp(26px, 7vw, 30px)', height: 'clamp(26px, 7vw, 30px)' }} />
                <span className="text-xs font-semibold">{post.share_count}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </article>
  );
}
