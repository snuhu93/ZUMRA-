-- ZUMRA admin capabilities
-- Run after 0003_functions.sql

-- Allow admins to update any profile (for suspension) and delete/hide any post.
create policy "profiles_update_admin" on profiles for update using (
  exists (select 1 from profiles me where me.id = auth.uid() and me.is_admin)
);
create policy "posts_update_admin" on posts for update using (
  exists (select 1 from profiles me where me.id = auth.uid() and me.is_admin)
);
create policy "posts_delete_admin" on posts for delete using (
  exists (select 1 from profiles me where me.id = auth.uid() and me.is_admin)
);

create or replace function public.admin_suspend_user(p_user_id uuid, p_suspended boolean)
returns void language plpgsql security definer as $$
begin
  if not exists (select 1 from profiles where id = auth.uid() and is_admin) then
    raise exception 'Not authorized';
  end if;
  update profiles set is_suspended = p_suspended where id = p_user_id;
end;
$$;

create or replace function public.admin_delete_post(p_post_id uuid)
returns void language plpgsql security definer as $$
begin
  if not exists (select 1 from profiles where id = auth.uid() and is_admin) then
    raise exception 'Not authorized';
  end if;
  update posts set is_deleted = true where id = p_post_id;
end;
$$;

create or replace function public.admin_resolve_report(p_report_id uuid)
returns void language plpgsql security definer as $$
begin
  if not exists (select 1 from profiles where id = auth.uid() and is_admin) then
    raise exception 'Not authorized';
  end if;
  update reports set resolved = true where id = p_report_id;
end;
$$;

-- Basic platform stats for the admin dashboard.
create or replace function public.admin_platform_stats()
returns table(total_users bigint, total_posts bigint, total_reports_open bigint) language sql security definer as $$
  select
    (select count(*) from profiles) as total_users,
    (select count(*) from posts where is_deleted = false) as total_posts,
    (select count(*) from reports where resolved = false) as total_reports_open
  where exists (select 1 from profiles where id = auth.uid() and is_admin);
$$;

grant execute on function public.admin_suspend_user(uuid, boolean) to authenticated;
grant execute on function public.admin_delete_post(uuid) to authenticated;
grant execute on function public.admin_resolve_report(uuid) to authenticated;
grant execute on function public.admin_platform_stats() to authenticated;
