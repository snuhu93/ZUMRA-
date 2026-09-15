import { Users, Sparkles, TrendingUp } from 'lucide-react'

const communities = [
  { name: 'Photography', members: '12.4K', icon: '📷', color: 'from-sky-400 to-sky-600' },
  { name: 'Travel & Adventure', members: '8.9K', icon: '✈️', color: 'from-amber-400 to-amber-600' },
  { name: 'Food Lovers', members: '15.2K', icon: '🍽️', color: 'from-rose-400 to-rose-600' },
  { name: 'Tech & Innovation', members: '6.7K', icon: '💡', color: 'from-brand-400 to-brand-600' },
  { name: 'Music & Arts', members: '9.1K', icon: '🎵', color: 'from-violet-400 to-violet-600' },
  { name: 'Fitness & Health', members: '11.3K', icon: '💪', color: 'from-accent-400 to-accent-600' },
]

export default function Communities() {
  return (
    <div className="p-4">
      <div className="mb-5">
        <h2 className="font-display text-2xl font-bold text-slate-800">Communities</h2>
        <p className="mt-1 text-sm text-slate-500">Discover groups that match your interests</p>
      </div>

      {/* Featured */}
      <div className="mb-5 overflow-hidden rounded-2xl bg-gradient-to-br from-brand-500 to-brand-700 p-5 text-white shadow-lg">
        <div className="flex items-center gap-2 text-brand-100 text-xs font-medium">
          <Sparkles size={14} /> Featured
        </div>
        <h3 className="mt-2 font-display text-lg font-bold">Join the conversation</h3>
        <p className="mt-1 text-sm text-brand-100">Connect with people who share your passions</p>
      </div>

      <div className="mb-4 flex items-center gap-2">
        <TrendingUp size={18} className="text-brand-500" />
        <h3 className="text-sm font-semibold text-slate-600">Popular Communities</h3>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {communities.map((c) => (
          <div
            key={c.name}
            className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-100 transition-all hover:shadow-md active:scale-95 cursor-pointer animate-fade-in"
          >
            <div className={`flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br ${c.color} text-2xl shadow-sm`}>
              {c.icon}
            </div>
            <h4 className="mt-3 text-sm font-semibold text-slate-800">{c.name}</h4>
            <div className="mt-1 flex items-center gap-1 text-xs text-slate-400">
              <Users size={12} /> {c.members} members
            </div>
            <button className="mt-3 w-full rounded-lg bg-brand-50 py-1.5 text-xs font-semibold text-brand-600 transition-colors hover:bg-brand-100">
              Join
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}
