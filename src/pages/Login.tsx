import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';

export default function Login() {
  const { signIn } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    const { error: signInError } = await signIn({ email, password });
    setSubmitting(false);
    if (signInError) {
      setError(signInError);
      return;
    }
    navigate('/');
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gray-50 px-6 dark:bg-surface-dark">
      <div className="mb-8 flex flex-col items-center gap-2">
        <svg width="56" height="56" viewBox="0 0 100 100">
          <rect width="100" height="100" rx="24" fill="#0F9D58" />
          <path d="M28 32 H72 L30 68 H74" stroke="#FFFFFF" strokeWidth="9" strokeLinecap="round" strokeLinejoin="round" fill="none" />
          <circle cx="72" cy="32" r="5.5" fill="#FFFFFF" />
        </svg>
        <h1 className="text-2xl font-bold text-zumra-600 dark:text-zumra-400">ZUMRA</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400">Connect. Share. Belong.</p>
      </div>

      <form onSubmit={handleSubmit} className="w-full max-w-sm space-y-3">
        {error && <p className="rounded-md bg-red-50 p-2 text-sm text-red-600 dark:bg-red-900/30 dark:text-red-400">{error}</p>}
        <input
          type="email"
          required
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm dark:border-gray-700 dark:bg-gray-900"
        />
        <input
          type="password"
          required
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm dark:border-gray-700 dark:bg-gray-900"
        />
        <button
          type="submit"
          disabled={submitting}
          className="w-full rounded-lg bg-zumra-500 py-2.5 text-sm font-semibold text-white disabled:opacity-60"
        >
          {submitting ? 'Logging in...' : 'Log In'}
        </button>
        <div className="flex justify-between text-xs">
          <Link to="/forgot-password" className="text-zumra-600 dark:text-zumra-400">Forgot password?</Link>
          <Link to="/register" className="text-zumra-600 dark:text-zumra-400">Create account</Link>
        </div>
      </form>
    </div>
  );
}
