import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { fetchFeed, type FeedPost } from '@/services/posts';
import PostCard from '@/components/PostCard';
import SkeletonPost from '@/components/SkeletonPost';
import StatusBar from '@/components/StatusBar';
import { useInfiniteScroll } from '@/hooks/useInfiniteScroll';

export default function Home() {
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
      setError('Something went wrong loading your feed. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

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
      <StatusBar />

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
          <button onClick={loadInitial} className="mt-2 block w-full text-zumra-600 font-semibold">Try again</button>
        </div>
      )}

      {!loading && !error && posts.length === 0 && (
        <div className="p-10 text-center text-sm text-gray-500 dark:text-gray-400">
          No posts yet.
          <button onClick={() => navigate('/create')} className="mt-2 block w-full font-semibold text-zumra-600">Create your first post</button>
        </div>
      )}

      {!loading && posts.map((post) => <PostCard key={post.id} post={post} onChanged={loadInitial} />)}

      {hasMore && !loading && <div ref={sentinelRef} className="h-4" />}
      {loadingMore && <SkeletonPost />}
    </div>
  );
}
