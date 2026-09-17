-- ZUMRA helper functions
-- Run after 0002_storage.sql

create or replace function public.increment_share_count(p_post_id uuid)
returns void language sql security definer as $$
  update posts set share_count = share_count + 1 where id = p_post_id;
$$;

-- Accepting a friend request must: mark it accepted, and create the canonical
-- friends row (smaller uuid first) atomically, so counts/queries stay consistent.
create or replace function public.accept_friend_request(p_request_id uuid)
returns void language plpgsql security definer as $$
declare
  v_sender uuid;
  v_receiver uuid;
begin
  select sender_id, receiver_id into v_sender, v_receiver
  from friend_requests
  where id = p_request_id and receiver_id = auth.uid() and status = 'pending';

  if v_sender is null then
    raise exception 'Friend request not found or not actionable';
  end if;

  update friend_requests set status = 'accepted' where id = p_request_id;

  insert into friends (user_id_a, user_id_b)
  values (least(v_sender, v_receiver), greatest(v_sender, v_receiver))
  on conflict do nothing;

  insert into notifications (recipient_id, actor_id, type, entity_id)
  values (v_sender, v_receiver, 'friend_request_accepted', p_request_id);
end;
$$;

-- Returns mutual friend count between the caller and another user -- used on profile pages.
create or replace function public.mutual_friend_count(p_other_user uuid)
returns integer language sql stable as $$
  select count(*)::int from (
    select user_id_b as friend_id from friends where user_id_a = auth.uid()
    union
    select user_id_a as friend_id from friends where user_id_b = auth.uid()
  ) my_friends
  where friend_id in (
    select user_id_b as friend_id from friends where user_id_a = p_other_user
    union
    select user_id_a as friend_id from friends where user_id_b = p_other_user
  );
$$;

grant execute on function public.increment_share_count(uuid) to authenticated;
grant execute on function public.accept_friend_request(uuid) to authenticated;
grant execute on function public.mutual_friend_count(uuid) to authenticated;
