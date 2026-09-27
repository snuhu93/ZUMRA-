import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import type { Session, User, AuthChangeEvent } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabaseClient';
import type { Profile } from '@/types/database';

interface AuthContextValue {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  loading: boolean;
  signUp: (params: { email: string; password: string; fullName: string; username: string; phone: string }) => Promise<{ error: string | null }>;
  signIn: (params: { email: string; password: string }) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
  sendPasswordReset: (email: string) => Promise<{ error: string | null }>;
  updatePassword: (newPassword: string) => Promise<{ error: string | null }>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  const loadProfile = async (userId: string): Promise<Profile | null> => {
    const { data }: { data: Profile | null } = await supabase.from('profiles').select('*').eq('id', userId).single();
    if (data) setProfile(data);
    return data;
  };

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data }) => {
      const currentUser = data.session?.user ?? null;
      if (currentUser) {
        const p = await loadProfile(currentUser.id);
        if (p?.is_suspended) {
          // account was suspended while this device still had an active session
          await supabase.auth.signOut();
          setSession(null);
          setUser(null);
          setProfile(null);
          setLoading(false);
          return;
        }
      }
      setSession(data.session);
      setUser(currentUser);
      setLoading(false);
    });

    const { data: listener } = supabase.auth.onAuthStateChange(async (_event: AuthChangeEvent, newSession: Session | null) => {
      if (newSession?.user) {
        const p = await loadProfile(newSession.user.id);
        if (p?.is_suspended) {
          await supabase.auth.signOut();
          setSession(null);
          setUser(null);
          setProfile(null);
          return;
        }
        setSession(newSession);
        setUser(newSession.user);
      } else {
        setSession(null);
        setUser(null);
        setProfile(null);
      }
    });

    return () => listener.subscription.unsubscribe();
  }, []);

  const signUp: AuthContextValue['signUp'] = async ({ email, password, fullName, username, phone }) => {
    const { data: existing } = await supabase
      .from('profiles')
      .select('id')
      .ilike('username', username)
      .maybeSingle();
    if (existing) return { error: 'Username is already taken.' };

    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: fullName, username, phone } }
    });
    if (error) return { error: error.message };
    return { error: null };
  };

  const signIn: AuthContextValue['signIn'] = async ({ email, password }) => {
    const { error, data } = await supabase.auth.signInWithPassword({ email, password });
    if (error) return { error: error.message };

    if (data.user) {
      const { data: profileData } = await supabase
        .from('profiles')
        .select('is_suspended')
        .eq('id', data.user.id)
        .single();

      if (profileData?.is_suspended) {
        await supabase.auth.signOut();
        return { error: 'This account has been suspended. Contact support if you believe this is a mistake.' };
      }
    }
    return { error: null };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  const sendPasswordReset = async (email: string) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`
    });
    return { error: error?.message ?? null };
  };

  const updatePassword = async (newPassword: string) => {
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    return { error: error?.message ?? null };
  };

  const refreshProfile = async () => {
    if (user) {
      const p = await loadProfile(user.id);
      if (p?.is_suspended) {
        await supabase.auth.signOut();
        setSession(null);
        setUser(null);
        setProfile(null);
      }
    }
  };

  return (
    <AuthContext.Provider
      value={{ user, session, profile, loading, signUp, signIn, signOut, sendPasswordReset, updatePassword, refreshProfile }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
      }
