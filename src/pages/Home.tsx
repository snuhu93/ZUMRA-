import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { fetchFeed, fetchLocalFeed, type FeedPost, type LocalLevel } from '@/services/posts';
import { supabase } from '@/lib/supabaseClient';
import PostCard from '@/components/PostCard';
import SkeletonPost from '@/components/SkeletonPost';
import StatusBar from '@/components/StatusBar';
import Avatar from '@/components/Avatar';
import WelcomeModal from '@/components/WelcomeModal';
import { useInfiniteScroll } from '@/hooks/useInfiniteScroll';
import { Image as ImageIcon } from 'lucide-react';
import { useT } from '@/i18n';

type AreaFields = { state?: string | null; lga?: string | null; neighborhood?: string | null };
type FeedTab = 'all' | 'local' | 'news';

type NewsItem = {
  id: string;
  title: string;
  summary: string | null;
  link: string;
  source_name: string;
  image: string | null;
  published_at: string;
  state: string | null;
  lga: string | null;
};

function timeAgo(iso: string) {
  const m = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  if (m < 1) return 'yanzu';
  if (m < 60) return `${m} minti`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} awa`;
  return `${Math.floor(h / 24)} kwana`;
}

// BBC Hausa live pages repeat the same generic sentence; don't show it
function isBoilerplate(s: string) {
  return /^Wannan shafi ne/i.test(s.trim());
}

// Labarai tab: reads news_items from Supabase
function NewsFeed({ state, lga }: { state: string; lga: string }) {
  const [scope, setScope] = useState<'nigeria' | 'state' | 'lga'>('nigeria');
  const [items, setItems] = useState<NewsItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(false);
      let q = supabase
        .from('news_items')
        .select('id,title,summary,link,source_name,image,published_at,state,lga')
        .order('published_at', { ascending: false })
        .limit(30);
      if (scope === 'state' && state) q = q.ilike('state', state.trim());
      if (scope === 'lga' && lga) {
        q = q.ilike('lga', lga.trim());
        if (state) q = q.ilike('state', state.trim());
      }
      const { data, error: err } = await q;
      if (cancelled) return;
      if (err) setError(true);
      else setItems((data ?? []) as NewsItem[]);
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [scope, state, lga]);

  const chip = (active: boolean) =>
    `rounded-full px-3 py-1 text-xs font-semibold ${
      active
        ? 'bg-zumra-600 text-white'
        : 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300'
    }`;

  return (
    <div>
      {!!state && (
        <div className="flex gap-2 bg-white px-3 py-2 dark:bg-gray-900">
          <button onClick={() => setScope('nigeria')} className={chip(scope === 'nigeria')}>
            Nigeria
          </button>
          <button onClick={() => setScope('state')} className={chip(scope === 'state')}>
            {state}
          </button>
          {!!lga && (
            <button onClick={() => setScope('lga')} className={chip(scope === 'lga')}>
              {lga}
            </button>
          )}
        </div>
      )}

      {loading && (
        <div className="p-8 text-center text-sm text-gray-500 dark:text-gray-400">Ana ɗauko labarai...</div>
      )}

      {!loading && error && (
        <div className="p-8 text-center text-sm text-gray-500 dark:text-gray-400">
          Ba a iya ɗauko labarai ba. Ka sake gwadawa.
        </div>
      )}

      {!loading && !error && items.length === 0 && (
        <div className="p-8 text-center text-sm text-gray-500 dark:text-gray-400">
          Babu labarai a wannan yankin tukuna.
        </div>
      )}

      {!loading &&
        !error &&
        items.map((n) => (
          <a
            key={n.id}
            href={n.link}
            target="_blank"
            rel="noopener noreferrer"
            className="flex gap-3 border-b border-gray-200 bg-white p-3 dark:border-gray-800 dark:bg-gray-900"
          >
            {n.image && (
              <img
                src={n.image}
                alt=""
                loading="lazy"
                onError={(e) => {
                  e.currentTarget.style.display = 'none';
                }}
                className="h-20 w-20 flex-shrink-0 rounded-lg object-cover"
              />
            )}
            <div className="min-w-0 flex-1">
              <p className="line-clamp-3 text-sm font-semibold text-gray-900 dark:text-gray-100">{n.title}</p>
              {n.summary && !isBoilerplate(n.summary) && (
                <p className="mt-1 line-clamp-2 text-xs text-gray-600 dark:text-gray-400">{n.summary}</p>
              )}
              <p className="mt-1 text-xs text-gray-500">
                {n.source_name} · {timeAgo(n.published_at)}
              </p>
            </div>
          </a>
        ))}
    </div>
  );
}

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
  const { user, profile } = useAuth();
  const navigate = useNavigate();

  const area = (profile ?? {}) as AreaFields;
  const state = area.state ?? '';
  const lga = area.lga ?? '';
  const neighborhood = area.neighborhood ?? '';

  const [tab, setTab] = useState<FeedTab>('all');
  const [level, setLevel] = useState<LocalLevel>('neighborhood');
  const [posts, setPosts] = useState<FeedPost[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [error, setError] = useState(false);
  const requestId = useRef(0);

  const fetchPage = useCallback(
    (pageCursor: string | null) => {
      if (tab === 'all') return fetchFeed(pageCursor, user?.id ?? null);
      return fetchLocalFeed(
        pageCursor,
        user?.id ?? null,
        { state: state || null, lga: lga || null, neighborhood: neighborhood || null },
        level
      );
    },
    [tab, level, state, lga, neighborhood, user?.id]
  );

  const loadInitial = useCallback(async () => {
    const reqId = ++requestId.current;
    if (tab === 'news') {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(false);
    try {
      const { posts: page, nextCursor } = await fetchPage(null);
      if (reqId !== requestId.current) return;
      setPosts(page);
      setCursor(nextCursor);
      setHasMore(!!nextCursor);
    } catch {
      if (reqId === requestId.current) setError(true);
    } finally {
      if (reqId === requestId.current) setLoading(false);
    }
  }, [fetchPage, tab]);

  useEffect(() => {
    loadInitial();
  }, [loadInitial]);

  const loadMore = useCallback(async () => {
    if (!cursor || loadingMore) return;
    const reqId = requestId.current;
    setLoadingMore(true);
    try {
      const { posts: page, nextCursor } = await fetchPage(cursor);
      if (reqId !== requestId.current) return;
      setPosts((prev) => [...prev, ...page]);
      setCursor(nextCursor);
      setHasMore(!!nextCursor);
    } catch {
      // Silent -- user can keep scrolling/retry; don't block the feed they already have.
    } finally {
      setLoadingMore(false);
    }
  }, [cursor, loadingMore, fetchPage]);

  const sentinelRef = useInfiniteScroll(loadMore, hasMore && !loading && tab !== 'news');

  const openLocalTab = () => {
    if (tab === 'local') return;
    // Start with the narrowest area the user has filled in
    setLevel(neighborhood ? 'neighborhood' : lga ? 'lga' : 'state');
    setTab('local');
  };

  const showAreaPrompt = tab === 'local' && !state;

  const tabClass = (active: boolean) =>
    `flex-1 py-2.5 text-center text-sm font-semibold ${
      active
        ? 'border-b-2 border-zumra-600 text-zumra-600'
        : 'text-gray-500 dark:text-gray-400'
    }`;

  const chipClass = (active: boolean, disabled: boolean) =>
    `rounded-full px-3 py-1 text-xs font-semibold ${
      active
        ? 'bg-zumra-600 text-white'
        : 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300'
    } ${disabled ? 'opacity-40' : ''}`;

  return (
    <div>
      <WelcomeModal />

      <StatusBar />

      <CreatePostBar />

      <div className="flex border-b border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900">
        <button onClick={() => setTab('all')} className={tabClass(tab === 'all')}>Duka</button>
        <button onClick={openLocalTab} className={tabClass(tab === 'local')}>Unguwata</button>
        <button onClick={() => setTab('news')} className={tabClass(tab === 'news')}>Labarai</button>
      </div>

      {tab === 'news' ? (
        <NewsFeed state={state} lga={lga} />
      ) : (
        <>
          {tab === 'local' && !!state && (
            <div className="flex gap-2 bg-white px-3 py-2 dark:bg-gray-900">
              <button
                onClick={() => setLevel('neighborhood')}
                disabled={!neighborhood || !lga}
                className={chipClass(level === 'neighborhood', !neighborhood || !lga)}
              >
                Unguwa
              </button>
              <button
                onClick={() => setLevel('lga')}
                disabled={!lga}
                className={chipClass(level === 'lga', !lga)}
              >
                Ƙaramar hukuma
              </button>
              <button onClick={() => setLevel('state')} className={chipClass(level === 'state', false)}>
                Jiha
              </button>
            </div>
          )}

          {showAreaPrompt && (
            <div className="p-8 text-center text-sm text-gray-500 dark:text-gray-400">
              <p>Ba ka saka jiharka da unguwarka ba tukuna.</p>
              <p className="mt-1 text-xs">Ka je Profile, ka danna Edit Profile, sannan ka cika Unguwata.</p>
              <button onClick={() => navigate('/profile')} className="mt-3 block w-full font-semibold text-zumra-600">
                Je Profile
              </button>
            </div>
          )}

          {!showAreaPrompt && loading && (
            <div>
              <SkeletonPost />
              <SkeletonPost />
              <SkeletonPost />
            </div>
          )}

          {!showAreaPrompt && !loading && error && (
            <div className="p-6 text-center text-sm text-gray-500">
              {t('feed_error')}
              <button onClick={loadInitial} className="mt-2 block w-full text-zumra-600 font-semibold">{t('try_again')}</button>
            </div>
          )}

          {!showAreaPrompt && !loading && !error && posts.length === 0 && (
            <div className="p-10 text-center text-sm text-gray-500 dark:text-gray-400">
              {tab === 'local' ? 'Babu posts a wannan yankin tukuna. Ka zama na farko!' : t('no_posts_yet')}
              <button onClick={() => navigate('/create')} className="mt-2 block w-full font-semibold text-zumra-600">{t('create_first_post')}</button>
            </div>
          )}

          {!showAreaPrompt && !loading && posts.map((post) => <PostCard key={post.id} post={post} onChanged={loadInitial} />)}

          {!showAreaPrompt && hasMore && !loading && <div ref={sentinelRef} className="h-4" />}
          {!showAreaPrompt && loadingMore && <SkeletonPost />}
        </>
      )}
    </div>
  );
}
