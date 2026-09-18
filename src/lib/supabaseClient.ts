import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

if (!supabaseUrl || !supabaseAnonKey) {
  // Fail loudly in dev rather than silently breaking every request.
  // eslint-disable-next-line no-console
  console.error(
    'ZUMRA: Missing Supabase environment variables. Copy .env.example to .env and fill in VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY.'
  );
}

// Single shared client. Only the anon (public) key is ever used here --
// the service-role key must NEVER be referenced from frontend code.
//
// NOTE: deliberately untyped (no Database generic). Supabase-js's generic
// client does structural parsing of `.select()` strings against generated
// Row types; with hand-written join queries (nested `profiles!fk(...)`
// selects used throughout src/services/*) that parser produces false type
// errors unless the types are generated directly from the live schema via
// `supabase gen types typescript`. Every service function already casts its
// result to the hand-written types in `src/types/database.ts`
// (e.g. `as unknown as FeedPost[]`), so those types still give callers
// accurate shapes -- they just aren't wired through the client generic.
// Once you run `supabase gen types typescript --linked > src/types/supabase.ts`,
// swap this back to `createClient<GeneratedDatabase>(...)` for full inference.
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true
  },
  realtime: {
    params: {
      eventsPerSecond: 2 // keep realtime traffic low for data-saver users
    }
  }
});

