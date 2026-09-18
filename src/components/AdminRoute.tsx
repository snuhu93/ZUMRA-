import { Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import type { ReactNode } from 'react';

export default function AdminRoute({ children }: { children: ReactNode }) {
  const { profile, loading } = useAuth();
  if (loading) return null;
  if (!profile?.is_admin) return <Navigate to="/" replace />;
  return <>{children}</>;
}
