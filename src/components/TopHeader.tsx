import { Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';

export default function TopHeader() {
  const { profile } = useAuth();
  return (
    <header className="sticky top-0 z-40 flex h-14 items-center justify-between border-b border-gray-200 bg-white/95 px-4 backdrop-blur dark:border-gray-800 dark:bg-surface-dark/95">
      <Link to="/" className="flex items-center gap-2">
        <svg width="28" height="28" viewBox="0 0 100 100" aria-hidden="true">
          <rect width="100" height="100" rx="24" fill="#0F9D58" />
          <path d="M28 32 H72 L30 68 H74" stroke="#FFFFFF" strokeWidth="9" strokeLinecap="round" strokeLinejoin="round" fill="none" />
          <circle cx="72" cy="32" r="5.5" fill="#FFFFFF" />
        </svg>
        <span className="text-lg font-bold text-zumra-600 dark:text-zumra-400">ZUMRA</span>
      </Link>
      <div className="flex items-center gap-4">
        <Link to="/search" aria-label="Search" className="text-xl">🔍</Link>
        <Link to="/notifications" aria-label="Notifications" className="text-xl">🔔</Link>
        <Link to="/messages" aria-label="Messages" className="text-xl">💬</Link>
        <Link to="/settings" aria-label="Settings" className="text-xl">⚙️</Link>
        {profile?.is_admin && <Link to="/admin" aria-label="Admin" className="text-xl">🛡️</Link>}
      </div>
    </header>
  );
}
