import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { fetchFeed, type FeedPost } from '@/services/posts';
import PostCard from '@/components/PostCard';
import SkeletonPost from '@/components/SkeletonPost';
import StatusBar from '@/components/StatusBar';
import Avatar from '@/components/Avatar';
import WelcomeModal from '@/components/WelcomeModal';
import { useInfiniteScroll } from '@/hooks/useInfiniteScroll';
import { Image as ImageIcon } from 'lucide-react';
import { useT } from '@/i18n';

// "What's on your mind?" composer bar (Facebook style)
function CreatePostBar() {
  const t = useT();
  const navigate = useNavigate();
  const { profile } = useAuth();

  return (
    <div className="flex items-center gap-3 border-b border-gray-200 bg-white p-3 dark:border-gray-800 dark:bg-gray-900">
      <button
        onClick={() => navigate(`/profile/${profile?.username ?? ''}`)}
        aria-label={t('home.openProfile')}
      >
        <Avatar src={profile?.avatar_url} name={profile?.full_name ?? t('reels.user')} size={40} />
      </button>
      <button
        onClick={() => navigate('/create')}
        className="flex-1 rounded-full bg-gray-100 px-4 py-2.5 text-left text-sm text-gray-500 dark:bg-gray-800 dark:text-gray-400"
      >
        {t('whats_on_your_mind')}
      </button>
      <button
        onClick={() => navigate('/create?media=photo')}
        aria-label={t('home.addPhoto')}
        className="flex items-center justify-center rounded-full p-2 text-green-600"
      >
        <ImageIcon size={22} />
      </button>
    </div>
  );
}

export default function Home() {
  const t = useT();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [posts, setPosts] = useState<FeedPost[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const initialLoadDone = useRef(false);

  const loadInitial = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { posts: page, nextCursor } = await fetchFeed(null, user?.id ?? null);
      setPosts(page);
      setCursor(nextCursor);
      setHasMore(!!nextCursor);
    } catch {
      setError(t('feed_error'));
    } finally {
      setLoading(false);
    }
  }, [user?.id, t]);

  useEffect(() => {
    if (!initialLoadDone.current) {
      initialLoadDone.current = true;
      loadInitial();
    }
  }, [loadInitial]);

  const loadMore = useCallback(async () => {
    if (!cursor || loadingMore) return;
    setLoadingMore(true);
    try {
      const { posts: page, nextCursor } = await fetchFeed(cursor, user?.id ?? null);
      setPosts((prev) => [...prev, ...page]);
      setCursor(nextCursor);
      setHasMore(!!nextCursor);
    } catch {
      // Silent -- user can keep scrolling/retry; don't block the feed they already have.
    } finally {
      setLoadingMore(false);
    }
  }, [cursor, loadingMore, user?.id]);

  const sentinelRef = useInfiniteScroll(loadMore, hasMore && !loading);

  return (
    <div>
      <WelcomeModal />

      <StatusBar />

      <CreatePostBar />

      {loading && (
        <div>
          <SkeletonPost />
          <SkeletonPost />
          <SkeletonPost />
        </div>
      )}

      {!loading && error && (
        <div className="p-6 text-center text-sm text-gray-500">
          {error}
          <button onClick={loadInitial} className="mt-2 block w-full text-zumra-600 font-semibold">{t('try_again')}</button>
        </div>
      )}

      {!loading && !error && posts.length === 0 && (
        <div className="p-10 text-center text-sm text-gray-500 dark:text-gray-400">
          {t('no_posts_yet')}
          <button onClick={() => navigate('/create')} className="mt-2 block w-full font-semibold text-zumra-600">{t('create_first_post')}</button>
        </div>
      )}

      {!loading && posts.map((post) => <PostCard key={post.id} post={post} onChanged={loadInitial} />)}

      {hasMore && !loading && <div ref={sentinelRef} className="h-4" />}
      {loadingMore && <SkeletonPost />}
    </div>
  );
}
