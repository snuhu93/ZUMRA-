import { supabase } from '@/lib/supabaseClient';

const db = supabase as any;

export async function submitComplaint(userId: string, message: string) {
  const since = new Date(Date.now() - 3600000).toISOString();
  const { count } = await db
    .from('complaints')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId)
    .gte('created_at', since);
  if ((count ?? 0) >= 3) throw new Error('RATE_LIMIT');

  const { error } = await db.from('complaints').insert({ user_id: userId, message });
  if (error) throw error;
}

export async function fetchComplaints(status: string | null) {
  let q = db
    .from('complaints')
    .select('id, user_id, message, status, created_at')
    .order('created_at', { ascending: false });
  if (status) q = q.eq('status', status);
  const { data, error } = await q;
  if (error) throw error;

  const rows = (data ?? []) as any[];
  const ids = Array.from(new Set(rows.map((r) => r.user_id).filter(Boolean)));
  let people: Record<string, any> = {};
  if (ids.length) {
    const { data: ps } = await db
      .from('profiles')
      .select('id, username, full_name')
      .in('id', ids);
    for (const p of (ps ?? []) as any[]) people[p.id] = p;
  }
  return rows.map((r) => ({ ...r, profiles: people[r.user_id] ?? null }));
}

export async function setComplaintStatus(id: string, status: 'new' | 'seen' | 'resolved') {
  const { error } = await db.from('complaints').update({ status }).eq('id', id);
  if (error) throw error;
}
