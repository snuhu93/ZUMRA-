import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Missing Supabase env vars. Check .env file.')
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
})

export type Profile = {
  id: string
  username: string
  full_name: string
  bio: string
  avatar_url: string | null
  created_at: string
  updated_at: string
}

export type Post = {
  id: string
  user_id: string
  content: string
  media_url: string | null
  media_type: 'text' | 'image' | 'video'
  created_at: string
}

export type Comment = {
  id: string
  post_id: string
  user_id: string
  content: string
  created_at: string
}

export type Notification = {
  id: string
  user_id: string
  actor_id: string | null
  type: 'like' | 'comment' | 'follow' | 'message'
  post_id: string | null
  read: boolean
  created_at: string
}
