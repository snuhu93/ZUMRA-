import { useState, useRef, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { unreadCount } from '@/services/notifications';
import { unreadConversationsCount } from '@/services/messages';

export default function TopHeader() {
  const { profile, user, signOut } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const [unreadNotifs, setUnreadNotifs] = useState(0);
  const [unreadMessages, setUnreadMessages] = useState(0);
  const menuRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (!user) return;

    let cancelled = false;
    const load = () => {
      unreadCount(user.id).then((n) => {
        if (!cancelled) setUnreadNotifs(n);
      });
      unreadConversationsCount(user.id).then((n) => {
        if (!cancelled) setUnreadMessages(n);
      });
    };

    load();
    const interval = setInterval(load, 20000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [user]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  async function handleLogout() {
    setMenuOpen(false);
    await signOut();
    navigate('/login');
  }

  return (
    <header className="sticky top-0 z-40 flex h-14 items-center justify-between gap-2 border-b border-gray-200 px-3 backdrop-blur dark:border-gray-800 dark:bg-surface-dark/95">
      <Link to="/" className="flex shrink-0 items-center gap-2">
        <svg width="32" height="32" viewBox="0 0 100 100" aria-hidden="true">
          <circle cx="72" cy="52" r="5.5" fill="#FFFFFF" />
        </svg>
        <span className="hidden text-lg font-bold text-nuara-600 dark:text-nuara-400 sm:inline">
          ZUMRA
        </span>
      </Link>

      <Link
        to="/search"
        aria-label="Search"
        className="flex min-w-0 flex-1 items-center gap-2 rounded-full bg-gray-100 px-3 py-2 text-sm text-gray-500 dark:bg-gray-800 dark:text-gray-400"
      >
        🔍 <span className="truncate">Search Zumra</span>
      </Link>

      <div className="flex shrink-0 items-center gap-2">
        <Link
          to="/notifications"
          aria-label="Notifications"
          onClick={() => setUnreadNotifs(0)}
          className="relative grid h-8 w-8 shrink-0 place-items-center rounded-full bg-gray-100 text-lg dark:bg-gray-800"
        >
          🔔
          {unreadNotifs > 0 && (
            <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-600 px-1 text-[10px] font-bold leading-none text-white">
              {unreadNotifs > 9 ? '9+' : unreadNotifs}
            </span>
          )}
        </Link>
        <Link
          to="/messages"
          aria-label="Messages"
          className="relative grid h-8 w-8 shrink-0 place-items-center rounded-full bg-gray-100 text-lg dark:bg-gray-800"
        >
          💬
          {unreadMessages > 0 && (
            <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-600 px-1 text-[10px] font-bold leading-none text-white">
              {unreadMessages > 9 ? '9+' : unreadMessages}
            </span>
          )}
        </Link>
        <Link
          to="/create"
          aria-label="Create post"
          className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-gray-100 text-lg dark:bg-gray-800"
        >
          ➕
        </Link>

        {profile?.is_admin && (
          <Link
            to="/admin"
            aria-label="Admin"
            className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-gray-100 text-lg dark:bg-gray-800"
          >
            ⚙️
          </Link>
        )}

        <div className="relative shrink-0" ref={menuRef}>
          <button
            onClick={() => setMenuOpen((v) => !v)}
            aria-label="Profile menu"
            className="grid h-8 w-8 shrink-0 place-items-center overflow-hidden rounded-full bg-gray-200 text-sm font-bold dark:bg-gray-700"
          >
            {profile?.avatar_url ? (
              <img
                src={profile.avatar_url}
                alt="Profile"
                className="h-full w-full object-cover"
              />
            ) : (
              <span>{profile?.username?.[0]?.toUpperCase() || '?'}</span>
            )}
          </button>

          {menuOpen && (
            <div className="absolute right-0 top-11 w-40 overflow-hidden rounded-xl border border-gray-200 bg-white shadow-lg dark:border-gray-800 dark:bg-surface-dark">
              <Link
                to="/profile"
                onClick={() => setMenuOpen(false)}
                className="block px-4 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-800"
              >
                Profile
              </Link>
              <Link
                to="/settings"
                onClick={() => setMenuOpen(false)}
                className="block px-4 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-800"
              >
                Settings
              </Link>
              <button
                onClick={handleLogout}
                className="block w-full px-4 py-2 text-left text-sm text-red-500 hover:bg-gray-100 dark:hover:bg-gray-800"
              >
                Log out
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
                                }
