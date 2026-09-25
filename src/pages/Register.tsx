import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';

const USERNAME_RE = /^[a-zA-Z0-9_]{3,20}$/;

export default function Register() {
  const { signUp } = useAuth();
  const navigate = useNavigate();
  const [fullName, setFullName] = useState('');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  const validate = (): string | null => {
    if (fullName.trim().length < 2) return 'Please enter your full name.';
    if (!USERNAME_RE.test(username)) return 'Username must be 3-20 characters: letters, numbers, underscores only.';
    if (password.length < 8) return 'Password must be at least 8 characters.';
    return null;
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const validationError = validate();
    if (validationError) {
      setError(validationError);
      return;
    }
    setError(null);
    setSubmitting(true);
    const { error: signUpError } = await signUp({ email, password, fullName, username, phone });
    setSubmitting(false);
    if (signUpError) {
      setError(signUpError);
      return;
    }
    setDone(true);
  };

  if (done) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-3 px-6 text-center">
        <h1 className="text-xl font-bold text-nuara-900 dark:text-nuara-50">Check your email</h1>
        <p className="text-sm text-nuara-500 dark:text-nuara-400">
          We sent a confirmation link to {email}. Confirm it, then log in.
        </p>
        <Link to="/login" className="mt-2 text-sm font-semibold text-nuara-600 dark:text-nuara-400">
          Back to Log In
        </Link>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-5 px-6 bg-surface-dark">
      <h1 className="mb-2 text-xl font-bold text-nuara-900 dark:text-nuara-50">Create your ZUMRA account</h1>
      <form onSubmit={handleSubmit} className="flex w-full max-w-sm flex-col gap-3">
        {error && <p className="rounded-xl bg-red-50 px-4 py-2.5 text-sm text-red-600 dark:bg-red-900/30 dark:text-red-400">{error}</p>}
        <input
          required
          placeholder="Full name"
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
          className="w-full rounded-xl border border-nuara-200 bg-white px-4 py-2.5 text-sm border:border-nuara-700 dark:bg-nuara-900"
        />
        <input
          required
          placeholder="Username"
          value={username}
          onChange={(e) => setUsername(e.target.value.trim())}
          className="w-full rounded-xl border border-nuara-200 bg-white px-4 py-2.5 text-sm border:border-nuara-700 dark:bg-nuara-900"
        />
        <input
          type="email"
          required
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full rounded-xl border border-nuara-200 bg-white px-4 py-2.5 text-sm border:border-nuara-700 dark:bg-nuara-900"
        />
        <input
          type="tel"
          placeholder="Phone number"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          className="w-full rounded-xl border border-nuara-200 bg-white px-4 py-2.5 text-sm border:border-nuara-700 dark:bg-nuara-900"
        />
        <input
          type="password"
          required
          placeholder="Password (min 8 characters)"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full rounded-xl border border-nuara-200 bg-white px-4 py-2.5 text-sm border:border-nuara-700 dark:bg-nuara-900"
        />
        <button
          type="submit"
          disabled={submitting}
          className="w-full rounded-xl bg-nuara-500 py-2.5 text-sm font-semibold text-white disabled:opacity-60"
        >
          {submitting ? 'Creating account...' : 'Sign Up'}
        </button>
        <p className="text-center text-sm text-nuara-500 dark:text-nuara-400">
          Already have an account? <Link to="/login" className="text-nuara-600 dark:text-nuara-400">Log in</Link>
        </p>
      </form>
    </div>
  );
                                               }
