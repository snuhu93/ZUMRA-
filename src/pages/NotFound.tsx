import { Link } from 'react-router-dom';

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-3 px-6 text-center">
      <p className="text-4xl">🧭</p>
      <h1 className="text-lg font-bold">Page not found</h1>
      <p className="text-sm text-gray-500 dark:text-gray-400">The page you're looking for doesn't exist.</p>
      <Link to="/" className="mt-2 rounded-lg bg-zumra-500 px-4 py-2 text-sm font-semibold text-white">Go Home</Link>
    </div>
  );
}
