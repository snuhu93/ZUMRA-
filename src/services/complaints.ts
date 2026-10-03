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
    .select('id, user_id, message, status, created_at, profiles:user_id(username, full_name)')
    .order('created_at', { ascending: false });
  if (status) q = q.eq('status', status);
  const { data, error } = await q;
  if (error) throw error;
  return data as any[];
}

export async function setComplaintStatus(id: string, status: 'new' | 'seen' | 'resolved') {
  const { error } = await db.from('complaints').update({ status }).eq('id', id);
  if (error) throw error;
    }
