import { Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { Loader2 } from 'lucide-react'
import { useAuth } from './lib/auth'
import Welcome from './screens/Welcome'
import SignUp from './screens/SignUp'
import AppShell from './components/AppShell'
import Feed from './screens/Feed'
import CreatePost from './screens/CreatePost'
import Profile from './screens/Profile'
import Videos from './screens/Videos'
import Communities from './screens/Communities'
import Messages from './screens/Messages'
import Notifications from './screens/Notifications'
import Search from './screens/Search'

function LoadingScreen() {
  return (
    <div className="flex min-h-dvh items-center justify-center bg-slate-50">
      <Loader2 size={32} className="animate-spin text-brand-600" />
    </div>
  )
}

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { session, loading } = useAuth()
  if (loading) return <LoadingScreen />
  if (!session) return <Navigate to="/welcome" replace />
  return <>{children}</>
}

function PublicRoute({ children }: { children: React.ReactNode }) {
  const { session, loading } = useAuth()
  if (loading) return <LoadingScreen />
  if (session) return <Navigate to="/feed" replace />
  return <>{children}</>
}

export default function App() {
  const location = useLocation()
  const hideShellRoutes = ['/welcome', '/signup']
  const showShell = !hideShellRoutes.some((r) => location.pathname.startsWith(r))

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-md flex-col bg-slate-50 shadow-xl">
      <Routes>
        <Route path="/welcome" element={<PublicRoute><Welcome /></PublicRoute>} />
        <Route path="/signup" element={<PublicRoute><SignUp /></PublicRoute>} />

        <Route path="/feed" element={<ProtectedRoute><AppShell><Feed /></AppShell></ProtectedRoute>} />
        <Route path="/videos" element={<ProtectedRoute><AppShell><Videos /></AppShell></ProtectedRoute>} />
        <Route path="/create" element={<ProtectedRoute><AppShell><CreatePost /></AppShell></ProtectedRoute>} />
        <Route path="/communities" element={<ProtectedRoute><AppShell><Communities /></AppShell></ProtectedRoute>} />
        <Route path="/profile" element={<ProtectedRoute><AppShell><Profile /></AppShell></ProtectedRoute>} />
        <Route path="/profile/:id" element={<ProtectedRoute><AppShell><Profile /></AppShell></ProtectedRoute>} />
        <Route path="/messages" element={<ProtectedRoute><AppShell><Messages /></AppShell></ProtectedRoute>} />
        <Route path="/notifications" element={<ProtectedRoute><AppShell><Notifications /></AppShell></ProtectedRoute>} />
        <Route path="/search" element={<ProtectedRoute><AppShell><Search /></AppShell></ProtectedRoute>} />

        <Route path="*" element={<Navigate to="/feed" replace />} />
      </Routes>
      {showShell && null}
    </div>
  )
}
