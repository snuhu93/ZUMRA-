import { useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase, Profile } from '../lib/supabase'
import { useAuth } from '../lib/auth'
import { Avatar } from '../components/Avatar'
import { Search as SearchIcon, X, UserPlus, UserCheck } from 'lucide-react'

export default function Search() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<Profile[]>([])
  const [searching, setSearching] = useState(false)
  const [followingIds, setFollowingIds] = useState<Set<string>>(new Set())

  const search = useCallback(async (q: string) => {
    if (!q.trim()) {
      setResults([])
      return
    }
    setSearching(true)
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .or(`username.ilike.%${q}%,full_name.ilike.%${q}%`)
      .limit(20)
    setResults((data as Profile[]) || [])
    setSearching(false)
  }, [])

  function onQueryChange(q: string) {
    setQuery(q)
    search(q)
  }

  async function toggleFollow(id: string) {
    if (!user) return
    if (followingIds.has(id)) {
      await supabase.from('follows').delete().eq('follower_id', user.id).eq('following_id', id)
      setFollowingIds((prev) => { const n = new Set(prev); n.delete(id); return n })
    } else {
      await supabase.from('follows').insert({ follower_id: user.id, following_id: id })
      await supabase.from('notifications').insert({ user_id: id, actor_id: user.id, type: 'follow' })
      setFollowingIds((prev) => { const n = new Set(prev); n.add(id); return n })
    }
  }

  return (
    <div className="p-4">
      <h2 className="font-display text-2xl font-bold text-slate-800 mb-4">Search</h2>

      <div className="relative mb-4">
        <SearchIcon size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          type="text"
          value={query}
          onChange={(e) => onQueryChange(e.target.value)}
          placeholder="Search for people..."
          autoFocus
          className="w-full rounded-xl border border-slate-200 bg-slate-50 py-3 pl-10 pr-10 text-sm text-slate-800 outline-none focus:border-brand-500 focus:bg-white focus:ring-2 focus:ring-brand-500/20"
        />
        {query && (
          <button onClick={() => { setQuery(''); setResults([]) }} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400">
            <X size={18} />
          </button>
        )}
      </div>

      {searching && (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => <div key={i} className="h-16 rounded-xl shimmer-bg" />)}
        </div>
      )}

      {!searching && results.length > 0 && (
        <div className="space-y-2">
          {results.map((p) => (
            <div
              key={p.id}
              className="flex items-center gap-3 rounded-2xl bg-white p-3 shadow-sm ring-1 ring-slate-100 transition-all hover:shadow-md animate-fade-in"
            >
              <button onClick={() => navigate(`/profile/${p.id}`)} className="flex items-center gap-3 flex-1 min-w-0">
                <Avatar name={p.full_name} src={p.avatar_url} size={44} />
                <div className="flex-1 min-w-0 text-left">
                  <p className="truncate text-sm font-semibold text-slate-800">{p.full_name}</p>
                  <p className="truncate text-xs text-slate-400">@{p.username}</p>
                </div>
              </button>
              {p.id !== user?.id && (
                <button
                  onClick={() => toggleFollow(p.id)}
                  className={`flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs font-semibold transition-all active:scale-95 ${
                    followingIds.has(p.id)
                      ? 'border border-slate-200 text-slate-600'
                      : 'bg-brand-600 text-white'
                  }`}
                >
                  {followingIds.has(p.id) ? <UserCheck size={12} /> : <UserPlus size={12} />}
                  {followingIds.has(p.id) ? 'Following' : 'Follow'}
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {!searching && !query && (
        <div className="flex flex-col items-center justify-center pt-16 text-center">
          <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-brand-50">
            <SearchIcon size={28} className="text-brand-400" />
          </div>
          <h3 className="font-display text-lg font-semibold text-slate-700">Find people</h3>
          <p className="mt-1 text-sm text-slate-500">Search by name or username to discover and connect with others.</p>
        </div>
      )}

      {!searching && query && results.length === 0 && (
        <div className="flex flex-col items-center justify-center pt-16 text-center">
          <p className="text-sm text-slate-500">No results found for "{query}"</p>
        </div>
      )}
    </div>
  )
}
