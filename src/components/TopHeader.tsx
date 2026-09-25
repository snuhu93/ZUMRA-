import { Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';

export default function TopHeader() {
  const { profile } = useAuth();
  return (
    <header className="sticky top-0 z-40 flex h-14 items-center justify-between gap-2 border-b border-gray-200 bg-white/95 px-3 backdrop-blur dark:border-gray-800 dark:bg-surface-dark/95">
      <Link to="/" className="flex shrink-0 items-center gap-2">
        <svg width="32" height="32" viewBox="0 0 100 100" aria-hidden="true">
          <rect x="8" y="8" width="84" height="84" rx="24" fill="#00D563" />
          <circle cx="72" cy="32" r="5.5" fill="#FFFFFF" />
        </svg>
        <span className="hidden text-lg font-bold text-zumra-600 dark:text-zumra-400 sm:inline">
          ZUMRA
        </span>
      </Link>

      <Link
        to="/search"
        aria-label="Search"
        className="flex flex-1 items-center gap-2 rounded-full bg-gray-100 px-4 py-2 text-sm text-gray-500 dark:bg-gray-800 dark:text-gray-400"
      >
        🔍 <span>Search Zumra</span>
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
        {profile?.is_admin && (
          <Link
            to="/admin"
            aria-label="Admin"
            className="grid h-9 w-9 place-items-center rounded-full bg-gray-100 text-lg dark:bg-gray-800"
          >
            🛡️
          </Link>
        )}
      </div>
    </header>
  );
      }
