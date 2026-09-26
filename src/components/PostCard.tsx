import { useState, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Avatar from '@/components/Avatar';
import { useAuth } from '@/contexts/AuthContext';
import { useSettings } from '@/contexts/SettingsContext';
import { toggleLike, toggleSave, deletePost, type FeedPost } from '@/services/posts';
import { getPublicUrl } from '@/services/storage';
import { optimizedImageUrl } from '@/utils/mediaOptimization';
import { Heart, MessageCircle, Share2 } from 'lucide-react';

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
  const [playingVideoId, setPlayingVideoId] = useState<string | null>(null);
  const videoRefs = useRef<Record<string, HTMLVideoElement | null>>({});

  const playFullscreen = (id: string) => {
    setPlayingVideoId(id);
    setTimeout(() => {
      const el = videoRefs.current[id];
      if (!el) return;
      if (el.requestFullscreen) el.requestFullscreen();
      else if ((el as any).webkitEnterFullscreen) (el as any).webkitEnterFullscreen();
    }, 100);
  };

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

  const imageWidth = dataSaver ? 480 : 800;

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
                <div key={m.id} className="relative overflow-hidden rounded-lg bg-black">
                    {playingVideoId === m.id ? (
                      <video
                        ref={(el) => { videoRefs.current[m.id] = el; }}
                        src={getPublicUrl('post-videos', m.storage_path) ?? ''}
                        controls
                        autoPlay
                        playsInline
                        muted={false}
                        className="max-h-96 w-full"
                      />
                    ) : (
                      <button
                        onClick={() => playFullscreen(m.id)}
                        className="relative flex h-56 w-full items-center justify-center bg-gray-800"
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
                    )}
                  </div>
              )
            )}
        </div>
      )}

      <div className="mt-3 flex items-center justify-around border-t border-gray-100 pt-2 dark:border-gray-800">
        <button
          onClick={handleLike}
          className="flex items-center gap-2 rounded-full px-3 py-1.5 transition hover:bg-gray-100 dark:hover:bg-gray-800"
        >
          <span
            className={`flex items-center justify-center rounded-full ${liked ? 'bg-zumra-600' : 'bg-gray-100 dark:bg-gray-800'}`}
            style={{ width: 'clamp(28px, 8vw, 34px)', height: 'clamp(28px, 8vw, 34px)' }}
          >
            <Heart
              style={{ width: 'clamp(14px, 4vw, 17px)', height: 'clamp(14px, 4vw, 17px)' }}
              fill={liked ? 'white' : 'none'}
              color={liked ? 'white' : 'currentColor'}
            />
          </span>
          <span className={`text-sm ${liked ? 'font-semibold text-zumra-600' : 'text-gray-500 dark:text-gray-400'}`}>
            {likeCount}
          </span>
        </button>

        <button
          onClick={() => navigate(`/post/${post.id}`)}
          className="flex items-center gap-2 rounded-full px-3 py-1.5 transition hover:bg-gray-100 dark:hover:bg-gray-800"
        >
          <span
            className="flex items-center justify-center rounded-full bg-gray-100 dark:bg-gray-800"
            style={{ width: 'clamp(28px, 8vw, 34px)', height: 'clamp(28px, 8vw, 34px)' }}
          >
            <MessageCircle style={{ width: 'clamp(14px, 4vw, 17px)', height: 'clamp(14px, 4vw, 17px)' }} />
          </span>
          <span className="text-sm text-gray-500 dark:text-gray-400">{post.comment_count}</span>
        </button>

        <button
          onClick={() => navigate(`/post/${post.id}/share`)}
          className="flex items-center gap-2 rounded-full px-3 py-1.5 transition hover:bg-gray-100 dark:hover:bg-gray-800"
        >
          <span
            className="flex items-center justify-center rounded-full bg-gray-100 dark:bg-gray-800"
            style={{ width: 'clamp(28px, 8vw, 34px)', height: 'clamp(28px, 8vw, 34px)' }}
          >
            <Share2 style={{ width: 'clamp(14px, 4vw, 17px)', height: 'clamp(14px, 4vw, 17px)' }} />
          </span>
          <span className="text-sm text-gray-500 dark:text-gray-400">{post.share_count}</span>
        </button>
      </div>
    </article>
  );
}
