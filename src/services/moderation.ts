import { supabase } from '@/lib/supabaseClient';
import type { ReportReason, ReportTargetType } from '@/types/database';

export async function submitReport(params: { reporterId: string; targetType: ReportTargetType; targetId: string; reason: ReportReason; details?: string }) {
  const { error } = await supabase.from('reports').insert({
    reporter_id: params.reporterId,
    target_type: params.targetType,
    target_id: params.targetId,
    reason: params.reason,
    details: params.details ?? null
  });
  if (error) throw error;
}

export async function blockUser(blockerId: string, blockedId: string) {
  const { error } = await supabase.from('blocked_users').insert({ blocker_id: blockerId, blocked_id: blockedId });
  if (error) throw error;
}

export async function unblockUser(blockerId: string, blockedId: string) {
  const { error } = await supabase.from('blocked_users').delete().eq('blocker_id', blockerId).eq('blocked_id', blockedId);
  if (error) throw error;
}
