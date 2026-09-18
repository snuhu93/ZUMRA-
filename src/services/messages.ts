import { supabase } from '@/lib/supabaseClient';

export interface ConversationSummary {
  id: string;
  other: { id: string; username: string; full_name: string; avatar_url: string | null } | null;
  lastMessage: { content: string | null; created_at: string; sender_id: string } | null;
  unread: boolean;
}

/** Find an existing 1:1 conversation between two users, or create one. */
export async function getOrCreateConversation(userId: string, otherUserId: string): Promise<string> {
  const { data: mine } = await supabase.from('conversation_members').select('conversation_id').eq('user_id', userId);
  const myConvIds = (mine ?? []).map((r) => r.conversation_id);
  if (myConvIds.length) {
    const { data: shared } = await supabase
      .from('conversation_members')
      .select('conversation_id, conversations!inner(is_group)')
      .eq('user_id', otherUserId)
      .in('conversation_id', myConvIds)
      .eq('conversations.is_group', false)
      .maybeSingle();
    if (shared) return shared.conversation_id as string;
  }

  const { data: conv, error } = await supabase.from('conversations').insert({ is_group: false }).select('id').single();
  if (error) throw error;
  const { error: memberError } = await supabase
    .from('conversation_members')
    .insert([{ conversation_id: conv.id, user_id: userId }, { conversation_id: conv.id, user_id: otherUserId }]);
  if (memberError) throw memberError;
  return conv.id as string;
}

export async function fetchConversations(userId: string): Promise<ConversationSummary[]> {
  const { data: memberships, error } = await supabase
    .from('conversation_members')
    .select('conversation_id, last_read_at')
    .eq('user_id', userId);
  if (error) throw error;
  if (!memberships?.length) return [];

  const convIds = memberships.map((m) => m.conversation_id);
  const { data: otherMembers } = await supabase
    .from('conversation_members')
    .select('conversation_id, user_id, profile:profiles(id, username, full_name, avatar_url)')
    .in('conversation_id', convIds)
    .neq('user_id', userId);

  const { data: lastMessages } = await supabase
    .from('messages')
    .select('conversation_id, content, created_at, sender_id')
    .in('conversation_id', convIds)
    .order('created_at', { ascending: false });

  const lastByConv = new Map<string, { content: string | null; created_at: string; sender_id: string }>();
  (lastMessages ?? []).forEach((m) => {
    if (!lastByConv.has(m.conversation_id)) lastByConv.set(m.conversation_id, m);
  });

  return memberships.map((m) => {
    const other = (otherMembers ?? []).find((o) => o.conversation_id === m.conversation_id);
    const last = lastByConv.get(m.conversation_id) ?? null;
    const unread = !!last && last.sender_id !== userId && (!m.last_read_at || new Date(last.created_at) > new Date(m.last_read_at));
    return {
      id: m.conversation_id,
      other: (other?.profile as unknown as ConversationSummary['other']) ?? null,
      lastMessage: last,
      unread
    };
  });
}

export async function fetchMessages(conversationId: string, cursor: string | null) {
  let query = supabase
    .from('messages')
    .select('id, conversation_id, sender_id, content, reply_to_message_id, is_deleted, created_at')
    .eq('conversation_id', conversationId)
    .order('created_at', { ascending: false })
    .limit(30);
  if (cursor) query = query.lt('created_at', cursor);
  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []).reverse();
}

export async function sendMessage(params: { conversationId: string; senderId: string; content: string; replyToMessageId?: string | null }) {
  const { data, error } = await supabase
    .from('messages')
    .insert({
      conversation_id: params.conversationId,
      sender_id: params.senderId,
      content: params.content,
      reply_to_message_id: params.replyToMessageId ?? null
    })
    .select('id')
    .single();
  if (error) throw error;

  const { data: members } = await supabase
    .from('conversation_members')
    .select('user_id')
    .eq('conversation_id', params.conversationId)
    .neq('user_id', params.senderId);
  if (members?.length) {
    await supabase.from('notifications').insert(
      members.map((m) => ({ recipient_id: m.user_id, actor_id: params.senderId, type: 'new_message' as const, entity_id: params.conversationId }))
    );
  }
  return data.id as string;
}

export async function deleteMessage(messageId: string) {
  const { error } = await supabase.from('messages').update({ is_deleted: true }).eq('id', messageId);
  if (error) throw error;
}

export async function markConversationRead(conversationId: string, userId: string) {
  const { error } = await supabase
    .from('conversation_members')
    .update({ last_read_at: new Date().toISOString() })
    .eq('conversation_id', conversationId)
    .eq('user_id', userId);
  if (error) throw error;
}

/** Subscribe to new messages in a conversation. Caller must unsubscribe on unmount. */
export function subscribeToConversation(conversationId: string, onInsert: (msg: any) => void) {
  const channel = supabase
    .channel(`conversation:${conversationId}`)
    .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages', filter: `conversation_id=eq.${conversationId}` }, (payload) => {
      onInsert(payload.new);
    })
    .subscribe();
  return () => supabase.removeChannel(channel);
}
