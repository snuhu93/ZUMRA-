import { useState, useRef, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';

export default function TopHeader() {
  const { profile, signOut } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

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
        className="flex flex-1 items-center gap-2 rounded-full bg-gray-100 px-4 py-2 text-sm text-gray-500 dark:bg-gray-800 dark:text-gray-400"
      >
        🔍 <span className="truncate">Search Zumra</span>
      </Link>

      <div className="flex shrink-0 items-center gap-3">
        <Link
          to="/notifications"
          aria-label="Notifications"
          className="grid h-9 w-9 place-items-center rounded-full bg-gray-100 text-lg dark:bg-gray-800"
        >
          🔔
        </Link>
        <Link
          to="/messages"
          aria-label="Messages"
          className="grid h-9 w-9 place-items-center rounded-full bg-gray-100 text-lg dark:bg-gray-800"
        >
          💬
        </Link>
        <Link
          to="/post/create"
          aria-label="Create post"
          className="grid h-9 w-9 place-items-center rounded-full bg-gray-100 text-lg dark:bg-gray-800"
        >
          ➕
        </Link>

        {profile?.is_admin && (
          <Link
            to="/admin"
            aria-label="Admin"
            className="grid h-9 w-9 place-items-center rounded-full bg-gray-100 text-lg dark:bg-gray-800"
          >
            ⚙️
          </Link>
        )}

        <div className="relative" ref={menuRef}>
          <button
            onClick={() => setMenuOpen((v) => !v)}
            aria-label="Profile menu"
            className="grid h-9 w-9 place-items-center overflow-hidden rounded-full bg-gray-200 text-sm font-bold dark:bg-gray-700"
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
