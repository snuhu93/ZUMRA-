import { ReactNode } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { Home, Video, Plus, Users, User as UserIcon, Bell, MessageCircle, Search } from 'lucide-react'

const navItems = [
  { path: '/feed', label: 'Home', icon: Home },
  { path: '/videos', label: 'Videos', icon: Video },
  { path: '/create', label: 'Create', icon: Plus, isCenter: true },
  { path: '/communities', label: 'Communities', icon: Users },
  { path: '/profile', label: 'Profile', icon: UserIcon },
]

export default function AppShell({ children }: { children: ReactNode }) {
  const navigate = useNavigate()
  const location = useLocation()

  const isActive = (path: string) => {
    if (path === '/profile') return location.pathname === '/profile' || location.pathname.startsWith('/profile/')
    return location.pathname === path
  }

  return (
    <div className="flex min-h-dvh flex-col">
      {/* Top bar */}
      <header className="sticky top-0 z-30 flex items-center justify-between border-b border-slate-100 bg-white/90 px-4 py-3 backdrop-blur-md safe-top">
        <button onClick={() => navigate('/feed')} className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-brand-500 to-brand-700 text-white font-bold text-sm shadow-sm">
            Z
          </div>
          <span className="font-display text-xl font-bold tracking-tight text-brand-800">ZUMRA</span>
        </button>
        <div className="flex items-center gap-1">
          <button
            onClick={() => navigate('/search')}
            className="flex h-9 w-9 items-center justify-center rounded-full text-slate-500 transition-colors hover:bg-slate-100 active:scale-95"
          >
            <Search size={20} />
          </button>
          <button
            onClick={() => navigate('/notifications')}
            className="flex h-9 w-9 items-center justify-center rounded-full text-slate-500 transition-colors hover:bg-slate-100 active:scale-95"
          >
            <Bell size={20} />
          </button>
          <button
            onClick={() => navigate('/messages')}
            className="flex h-9 w-9 items-center justify-center rounded-full text-slate-500 transition-colors hover:bg-slate-100 active:scale-95"
          >
            <MessageCircle size={20} />
          </button>
        </div>
      </header>

      {/* Page content */}
      <main className="flex-1 overflow-y-auto pb-20 no-scrollbar">{children}</main>

      {/* Bottom navigation */}
      <nav className="fixed bottom-0 left-1/2 z-30 w-full max-w-md -translate-x-1/2 border-t border-slate-100 bg-white/95 backdrop-blur-lg safe-bottom">
        <div className="flex items-center justify-around px-2 py-2">
          {navItems.map((item) => {
            const active = isActive(item.path)
            const Icon = item.icon
            if (item.isCenter) {
              return (
                <button
                  key={item.path}
                  onClick={() => navigate(item.path)}
                  className="flex flex-col items-center gap-1 active:scale-95 transition-transform"
                >
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-brand-500 to-brand-700 text-white shadow-lg shadow-brand-500/30">
                    <Icon size={24} />
                  </div>
                </button>
              )
            }
            return (
              <button
                key={item.path}
                onClick={() => navigate(item.path)}
                className="flex flex-1 flex-col items-center gap-1 py-1 active:scale-95 transition-transform"
              >
                <Icon
                  size={22}
                  className={active ? 'text-brand-600' : 'text-slate-400'}
                  strokeWidth={active ? 2.5 : 2}
                />
                <span className={`text-[10px] font-medium ${active ? 'text-brand-600' : 'text-slate-400'}`}>
                  {item.label}
                </span>
              </button>
            )
          })}
        </div>
      </nav>
    </div>
  )
}
