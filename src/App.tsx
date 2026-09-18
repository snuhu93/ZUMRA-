import { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { SettingsProvider } from '@/contexts/SettingsContext';
import ProtectedRoute from '@/components/ProtectedRoute';
import AdminRoute from '@/components/AdminRoute';
import AppLayout from '@/layouts/AppLayout';

// Lazy-loaded routes -- keeps the initial JS bundle small for low-end devices.
const Login = lazy(() => import('@/pages/Login'));
const Register = lazy(() => import('@/pages/Register'));
const ForgotPassword = lazy(() => import('@/pages/ForgotPassword'));
const ResetPassword = lazy(() => import('@/pages/ResetPassword'));
const Home = lazy(() => import('@/pages/Home'));
const CreatePost = lazy(() => import('@/pages/CreatePost'));
const EditPost = lazy(() => import('@/pages/EditPost'));
const PostDetail = lazy(() => import('@/pages/PostDetail'));
const SharePost = lazy(() => import('@/pages/SharePost'));
const Profile = lazy(() => import('@/pages/Profile'));
const EditProfile = lazy(() => import('@/pages/EditProfile'));
const Friends = lazy(() => import('@/pages/Friends'));
const Search = lazy(() => import('@/pages/Search'));
const Notifications = lazy(() => import('@/pages/Notifications'));
const Messages = lazy(() => import('@/pages/Messages'));
const Conversation = lazy(() => import('@/pages/Conversation'));
const CreateStatus = lazy(() => import('@/pages/CreateStatus'));
const ViewStatus = lazy(() => import('@/pages/ViewStatus'));
const Settings = lazy(() => import('@/pages/Settings'));
const BlockedUsers = lazy(() => import('@/pages/BlockedUsers'));
const Report = lazy(() => import('@/pages/Report'));
const Admin = lazy(() => import('@/pages/Admin'));
const About = lazy(() => import('@/pages/About'));
const NotFound = lazy(() => import('@/pages/NotFound'));

function PageFallback() {
  return (
    <div className="flex h-screen items-center justify-center">
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-zumra-500 border-t-transparent" />
    </div>
  );
}

function AuthGate({ children }: { children: React.ReactNode }) {
  const { loading } = useAuth();
  if (loading) return <PageFallback />;
  return <>{children}</>;
}

function Protected({ children }: { children: React.ReactNode }) {
  return (
    <ProtectedRoute>
      <AppLayout>{children}</AppLayout>
    </ProtectedRoute>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <SettingsProvider>
          <AuthGate>
            <Suspense fallback={<PageFallback />}>
              <Routes>
                {/* Public / auth routes */}
                <Route path="/login" element={<Login />} />
                <Route path="/register" element={<Register />} />
                <Route path="/forgot-password" element={<ForgotPassword />} />
                <Route path="/reset-password" element={<ResetPassword />} />

                {/* Main app -- all wrapped in AppLayout (header + bottom nav) */}
                <Route path="/" element={<Protected><Home /></Protected>} />
                <Route path="/create" element={<Protected><CreatePost /></Protected>} />
                <Route path="/post/:postId" element={<Protected><PostDetail /></Protected>} />
                <Route path="/post/:postId/edit" element={<Protected><EditPost /></Protected>} />
                <Route path="/post/:postId/share" element={<Protected><SharePost /></Protected>} />

                <Route path="/profile" element={<Protected><Profile /></Protected>} />
                <Route path="/profile/edit" element={<Protected><EditProfile /></Protected>} />
                <Route path="/profile/:username" element={<Protected><Profile /></Protected>} />

                <Route path="/friends" element={<Protected><Friends /></Protected>} />
                <Route path="/search" element={<Protected><Search /></Protected>} />
                <Route path="/notifications" element={<Protected><Notifications /></Protected>} />

                <Route path="/messages" element={<Protected><Messages /></Protected>} />
                <Route path="/messages/:conversationId" element={<Protected><Conversation /></Protected>} />

                <Route path="/status/create" element={<Protected><CreateStatus /></Protected>} />
                <Route path="/status/:authorId" element={<Protected><ViewStatus /></Protected>} />

                <Route path="/settings" element={<Protected><Settings /></Protected>} />
                <Route path="/settings/blocked" element={<Protected><BlockedUsers /></Protected>} />
                <Route path="/report" element={<Protected><Report /></Protected>} />
                <Route path="/about" element={<Protected><About /></Protected>} />

                <Route
                  path="/admin"
                  element={
                    <ProtectedRoute>
                      <AdminRoute>
                        <AppLayout>
                          <Admin />
                        </AppLayout>
                      </AdminRoute>
                    </ProtectedRoute>
                  }
                />

                <Route path="*" element={<NotFound />} />
              </Routes>
            </Suspense>
          </AuthGate>
        </SettingsProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}
