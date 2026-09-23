import { useCallback, useEffect, useRef, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { fetchVideoFeed, toggleLike, type FeedPost } from '@/services/posts';
import { getPublicUrl } from '@/services/storage';
import Avatar from '@/components/Avatar';
import { Link } from 'react-router-dom';

export default function Reels() {
  const { user } = useAuth();
  const [posts, setPosts] = useState<FeedPost[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(true);
  const [muted, setMuted] = useState(true);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const videoRefs = useRef<Record<string, HTMLVideoElement | null>>({});

  const load = useCallback(async () => {
    if (!hasMore) return;
    setLoading(true);
    try {
      const { posts: next, nextCursor } = await fetchVideoFeed(cursor, user?.id ?? null);
      setPosts((prev) => [...prev, ...next]);
      setCursor(nextCursor);
      setHasMore(!!nextCursor);
    } finally {
      setLoading(false);
    }
  }, [cursor, hasMore, user]);

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Play the reel currently in view, pause the rest.
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          const id = entry.target.getAttribute('data-post-id');
          if (!id) return;
          const video = videoRefs.current[id];
          if (!video) return;
          if (entry.isIntersecting && entry.intersectionRatio > 0.6) {
            const idx = posts.findIndex((p) => p.id === id);
            video.play().catch(() => {});
            if (idx !== -1 && idx >= posts.length - 2) load();
          } else {
            video.pause();
          }
        });
      },
      { root: el, threshold: [0, 0.6, 1] }
    );
    const items = el.querySelectorAll('[data-post-id]');
    items.forEach((item) => observer.observe(item));
    return () => observer.disconnect();
  }, [posts, load]);

  // Apply the mute state to every video whenever it changes.
  useEffect(() => {
    Object.values(videoRefs.current).forEach((video) => {
      if (video) video.muted = muted;
    });
  }, [muted]);

  const handleLike = async (post: FeedPost) => {
    if (!user) return;
    const liked = !post.liked_by_me;
    setPosts((prev) => prev.map((p) => (p.id === post.id ? { ...p, liked_by_me: liked, like_count: p.like_count + (liked ? 1 : -1) } : p)));
    try {
      await toggleLike(post.id, user.id, !liked);
    } catch {
      setPosts((prev) => prev.map((p) => (p.id === post.id ? { ...p, liked_by_me: !liked, like_count: p.like_count + (liked ? -1 : 1) } : p)));
    }
  };

  if (!loading && posts.length === 0) {
    return <p className="p-10 text-center text-sm text-gray-500">No videos yet.</p>;
  }

  return (
    <div ref={containerRef} className="h-[calc(100vh-8rem)] w-full snap-y snap-mandatory overflow-y-scroll bg-black">
      <button
        onClick={() => setMuted((m) => !m)}
        className="fixed right-4 top-4 z-50 flex h-10 w-10 items-center justify-center rounded-full bg-black/50 text-xl text-white"
        aria-label={muted ? 'Unmute' : 'Mute'}
      >
        {muted ? '🔇' : '🔊'}
      </button>

      {posts.map((post) => {
        const video = post.post_media.find((m) => m.media_type === 'video');
        if (!video) return null;
        return (
          <div key={post.id} data-post-id={post.id} className="relative flex h-[calc(100vh-8rem)] w-full snap-start snap-always items-center justify-center">
            <video
              ref={(el) => { videoRefs.current[post.id] = el; }}
              src={getPublicUrl('post-videos', video.storage_path) ?? ''}
              className="h-full w-full object-contain"
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

              <div className="flex flex-col items-center gap-4">
                <button onClick={() => handleLike(post)} className="flex flex-col items-center gap-1 text-white">
                  <span className="text-2xl">{post.liked_by_me ? '❤️' : '🤍'}</span>
                  <span className="text-xs">{post.like_count}</span>
                </button>
                <Link to={`/post/${post.id}`} className="flex flex-col items-center gap-1 text-white">
                  <span className="text-2xl">💬</span>
                  <span className="text-xs">{post.comment_count}</span>
                </Link>
              </div>
            </div>
          </div>
        );
      })}
      {loading && <p className="p-4 text-center text-xs text-gray-400">Loading...</p>}
    </div>
  );
}
