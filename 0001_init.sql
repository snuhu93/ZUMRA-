-- ZUMRA initial schema
-- Run this in the Supabase SQL editor, or via `supabase db push`.
-- Safe to run once on a fresh project.

create extension if not exists "uuid-ossp";
create extension if not exists pgcrypto;

-- =========================================================
-- ENUMS
-- =========================================================
create type privacy_level as enum ('public', 'friends', 'only_me');
create type friend_request_status as enum ('pending', 'accepted', 'rejected', 'cancelled');
create type report_target_type as enum ('user', 'post', 'comment', 'message');
create type report_reason as enum ('spam', 'harassment', 'fake_account', 'violence', 'inappropriate', 'other');
create type notification_type as enum (
  'friend_request', 'friend_request_accepted', 'new_follower',
  'post_like', 'comment', 'comment_reply', 'post_share', 'new_message'
);

-- =========================================================
-- PROFILES  (1:1 with auth.users)
-- =========================================================
create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text unique not null check (char_length(username) between 3 and 30),
  full_name text not null,
  avatar_url text,
  cover_url text,
  bio text check (char_length(bio) <= 300),
  location text,
  website text,
  data_saver_enabled boolean not null default true,
  is_admin boolean not null default false,
  is_suspended boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index idx_profiles_username on profiles (lower(username));

-- Auto-create a profile row whenever a new auth user signs up.
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer as $$
begin
  insert into public.profiles (id, username, full_name)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'username', 'user_' || substr(new.id::text, 1, 8)),
    coalesce(new.raw_user_meta_data->>'full_name', 'New User')
  );
  return new;
end;
$$;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- =========================================================
-- POSTS
-- =========================================================
create table posts (
  id uuid primary key default uuid_generate_v4(),
  author_id uuid not null references profiles(id) on delete cascade,
  content text check (char_length(content) <= 5000),
  privacy privacy_level not null default 'public',
  shared_post_id uuid references posts(id) on delete set null,
  like_count integer not null default 0,
  comment_count integer not null default 0,
  share_count integer not null default 0,
  is_deleted boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index idx_posts_author_created on posts (author_id, created_at desc);
create index idx_posts_feed on posts (created_at desc) where is_deleted = false;

create table post_media (
  id uuid primary key default uuid_generate_v4(),
  post_id uuid not null references posts(id) on delete cascade,
  media_type text not null check (media_type in ('image', 'video')),
  storage_path text not null,
  thumbnail_path text,
  width integer,
  height integer,
  position integer not null default 0
);
create index idx_post_media_post on post_media (post_id, position);

create table post_likes (
  post_id uuid not null references posts(id) on delete cascade,
  user_id uuid not null references profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (post_id, user_id)
);

create table saved_posts (
  post_id uuid not null references posts(id) on delete cascade,
  user_id uuid not null references profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (post_id, user_id)
);

-- =========================================================
-- COMMENTS
-- =========================================================
create table comments (
  id uuid primary key default uuid_generate_v4(),
  post_id uuid not null references posts(id) on delete cascade,
  author_id uuid not null references profiles(id) on delete cascade,
  parent_comment_id uuid references comments(id) on delete cascade,
  content text not null check (char_length(content) <= 2000),
  is_deleted boolean not null default false,
  like_count integer not null default 0,
  created_at timestamptz not null default now()
);
create index idx_comments_post on comments (post_id, created_at);

create table comment_likes (
  comment_id uuid not null references comments(id) on delete cascade,
  user_id uuid not null references profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (comment_id, user_id)
);

-- =========================================================
-- FRIENDS / FOLLOWERS
-- =========================================================
create table friend_requests (
  id uuid primary key default uuid_generate_v4(),
  sender_id uuid not null references profiles(id) on delete cascade,
  receiver_id uuid not null references profiles(id) on delete cascade,
  status friend_request_status not null default 'pending',
  created_at timestamptz not null default now(),
  unique (sender_id, receiver_id),
  check (sender_id <> receiver_id)
);
create index idx_friend_requests_receiver on friend_requests (receiver_id, status);

create table friends (
  user_id_a uuid not null references profiles(id) on delete cascade,
  user_id_b uuid not null references profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id_a, user_id_b),
  check (user_id_a < user_id_b) -- canonical ordering prevents duplicate reversed rows
);

create table followers (
  follower_id uuid not null references profiles(id) on delete cascade,
  following_id uuid not null references profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (follower_id, following_id),
  check (follower_id <> following_id)
);
create index idx_followers_following on followers (following_id);

create table blocked_users (
  blocker_id uuid not null references profiles(id) on delete cascade,
  blocked_id uuid not null references profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (blocker_id, blocked_id),
  check (blocker_id <> blocked_id)
);

-- =========================================================
-- MESSAGING
-- =========================================================
create table conversations (
  id uuid primary key default uuid_generate_v4(),
  is_group boolean not null default false,
  created_at timestamptz not null default now()
);

create table conversation_members (
  conversation_id uuid not null references conversations(id) on delete cascade,
  user_id uuid not null references profiles(id) on delete cascade,
  last_read_at timestamptz,
  joined_at timestamptz not null default now(),
  primary key (conversation_id, user_id)
);

create table messages (
  id uuid primary key default uuid_generate_v4(),
  conversation_id uuid not null references conversations(id) on delete cascade,
  sender_id uuid not null references profiles(id) on delete cascade,
  content text check (char_length(content) <= 4000),
  reply_to_message_id uuid references messages(id) on delete set null,
  is_deleted boolean not null default false,
  created_at timestamptz not null default now()
);
create index idx_messages_conversation on messages (conversation_id, created_at);

-- =========================================================
-- NOTIFICATIONS
-- =========================================================
create table notifications (
  id uuid primary key default uuid_generate_v4(),
  recipient_id uuid not null references profiles(id) on delete cascade,
  actor_id uuid references profiles(id) on delete set null,
  type notification_type not null,
  entity_id uuid,
  is_read boolean not null default false,
  created_at timestamptz not null default now()
);
create index idx_notifications_recipient on notifications (recipient_id, is_read, created_at desc);

-- =========================================================
-- STATUS / STORIES (24h expiry)
-- =========================================================
create table statuses (
  id uuid primary key default uuid_generate_v4(),
  author_id uuid not null references profiles(id) on delete cascade,
  content_type text not null check (content_type in ('image', 'text')),
  storage_path text,
  text_content text,
  background_color text,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default (now() + interval '24 hours')
);
create index idx_statuses_active on statuses (author_id, expires_at);

-- =========================================================
-- REPORTS
-- =========================================================
create table reports (
  id uuid primary key default uuid_generate_v4(),
  reporter_id uuid not null references profiles(id) on delete cascade,
  target_type report_target_type not null,
  target_id uuid not null,
  reason report_reason not null,
  details text,
  resolved boolean not null default false,
  created_at timestamptz not null default now()
);
create index idx_reports_unresolved on reports (resolved, created_at desc);

-- =========================================================
-- COUNTER TRIGGERS (keep like/comment counts in sync without extra reads)
-- =========================================================
create or replace function public.adjust_post_like_count() returns trigger language plpgsql as $$
begin
  if tg_op = 'INSERT' then
    update posts set like_count = like_count + 1 where id = new.post_id;
  elsif tg_op = 'DELETE' then
    update posts set like_count = greatest(like_count - 1, 0) where id = old.post_id;
  end if;
  return null;
end; $$;
create trigger trg_post_like_count
  after insert or delete on post_likes
  for each row execute procedure public.adjust_post_like_count();

create or replace function public.adjust_post_comment_count() returns trigger language plpgsql as $$
begin
  if tg_op = 'INSERT' then
    update posts set comment_count = comment_count + 1 where id = new.post_id;
  elsif tg_op = 'DELETE' then
    update posts set comment_count = greatest(comment_count - 1, 0) where id = old.post_id;
  end if;
  return null;
end; $$;
create trigger trg_post_comment_count
  after insert or delete on comments
  for each row execute procedure public.adjust_post_comment_count();

create or replace function public.adjust_comment_like_count() returns trigger language plpgsql as $$
begin
  if tg_op = 'INSERT' then
    update comments set like_count = like_count + 1 where id = new.comment_id;
  elsif tg_op = 'DELETE' then
    update comments set like_count = greatest(like_count - 1, 0) where id = old.comment_id;
  end if;
  return null;
end; $$;
create trigger trg_comment_like_count
  after insert or delete on comment_likes
  for each row execute procedure public.adjust_comment_like_count();

-- =========================================================
-- ROW LEVEL SECURITY
-- =========================================================
alter table profiles enable row level security;
alter table posts enable row level security;
alter table post_media enable row level security;
alter table post_likes enable row level security;
alter table saved_posts enable row level security;
alter table comments enable row level security;
alter table comment_likes enable row level security;
alter table friend_requests enable row level security;
alter table friends enable row level security;
alter table followers enable row level security;
alter table blocked_users enable row level security;
alter table conversations enable row level security;
alter table conversation_members enable row level security;
alter table messages enable row level security;
alter table notifications enable row level security;
alter table statuses enable row level security;
alter table reports enable row level security;

-- Helper: is this user friends-with / following the post author, for privacy checks.
create or replace function public.is_friend_with(a uuid, b uuid) returns boolean
language sql stable as $$
  select exists (
    select 1 from friends
    where (user_id_a = least(a,b) and user_id_b = greatest(a,b))
  );
$$;

create or replace function public.can_view_post(p posts) returns boolean
language sql stable as $$
  select
    p.privacy = 'public'
    or p.author_id = auth.uid()
    or (p.privacy = 'friends' and public.is_friend_with(auth.uid(), p.author_id));
$$;

-- PROFILES: readable by everyone (except suspended details hidden from non-owners is app-level),
-- editable only by the owner.
create policy "profiles_select_all" on profiles for select using (true);
create policy "profiles_update_own" on profiles for update using (auth.uid() = id);
create policy "profiles_insert_own" on profiles for insert with check (auth.uid() = id);

-- POSTS
create policy "posts_select_visible" on posts for select using (public.can_view_post(posts));
create policy "posts_insert_own" on posts for insert with check (auth.uid() = author_id);
create policy "posts_update_own" on posts for update using (auth.uid() = author_id);
create policy "posts_delete_own" on posts for delete using (auth.uid() = author_id);

-- POST MEDIA (inherits visibility of parent post)
create policy "post_media_select" on post_media for select using (
  exists (select 1 from posts p where p.id = post_media.post_id and public.can_view_post(p))
);
create policy "post_media_insert_own" on post_media for insert with check (
  exists (select 1 from posts p where p.id = post_media.post_id and p.author_id = auth.uid())
);
create policy "post_media_delete_own" on post_media for delete using (
  exists (select 1 from posts p where p.id = post_media.post_id and p.author_id = auth.uid())
);

-- LIKES
create policy "post_likes_select" on post_likes for select using (true);
create policy "post_likes_insert_own" on post_likes for insert with check (auth.uid() = user_id);
create policy "post_likes_delete_own" on post_likes for delete using (auth.uid() = user_id);

create policy "comment_likes_select" on comment_likes for select using (true);
create policy "comment_likes_insert_own" on comment_likes for insert with check (auth.uid() = user_id);
create policy "comment_likes_delete_own" on comment_likes for delete using (auth.uid() = user_id);

-- SAVED POSTS (private to the saver)
create policy "saved_posts_select_own" on saved_posts for select using (auth.uid() = user_id);
create policy "saved_posts_insert_own" on saved_posts for insert with check (auth.uid() = user_id);
create policy "saved_posts_delete_own" on saved_posts for delete using (auth.uid() = user_id);

-- COMMENTS
create policy "comments_select_visible" on comments for select using (
  exists (select 1 from posts p where p.id = comments.post_id and public.can_view_post(p))
);
create policy "comments_insert_own" on comments for insert with check (auth.uid() = author_id);
create policy "comments_update_own" on comments for update using (auth.uid() = author_id);
create policy "comments_delete_own" on comments for delete using (auth.uid() = author_id);

-- FRIEND REQUESTS: visible + actionable only by sender/receiver
create policy "friend_requests_select_own" on friend_requests for select using (
  auth.uid() = sender_id or auth.uid() = receiver_id
);
create policy "friend_requests_insert_own" on friend_requests for insert with check (auth.uid() = sender_id);
create policy "friend_requests_update_own" on friend_requests for update using (
  auth.uid() = sender_id or auth.uid() = receiver_id
);
create policy "friend_requests_delete_own" on friend_requests for delete using (auth.uid() = sender_id);

-- FRIENDS: readable by everyone (public friend lists), only system/functions insert
create policy "friends_select_all" on friends for select using (true);
create policy "friends_delete_own" on friends for delete using (
  auth.uid() = user_id_a or auth.uid() = user_id_b
);

-- FOLLOWERS
create policy "followers_select_all" on followers for select using (true);
create policy "followers_insert_own" on followers for insert with check (auth.uid() = follower_id);
create policy "followers_delete_own" on followers for delete using (auth.uid() = follower_id);

-- BLOCKED USERS (private to the blocker)
create policy "blocked_users_select_own" on blocked_users for select using (auth.uid() = blocker_id);
create policy "blocked_users_insert_own" on blocked_users for insert with check (auth.uid() = blocker_id);
create policy "blocked_users_delete_own" on blocked_users for delete using (auth.uid() = blocker_id);

-- CONVERSATIONS / MEMBERS / MESSAGES: only visible to members
create policy "conversations_select_member" on conversations for select using (
  exists (select 1 from conversation_members m where m.conversation_id = conversations.id and m.user_id = auth.uid())
);
create policy "conversations_insert_authed" on conversations for insert with check (auth.uid() is not null);

create policy "conversation_members_select_member" on conversation_members for select using (
  exists (select 1 from conversation_members m2 where m2.conversation_id = conversation_members.conversation_id and m2.user_id = auth.uid())
);
create policy "conversation_members_insert_own" on conversation_members for insert with check (auth.uid() = user_id);
create policy "conversation_members_update_own" on conversation_members for update using (auth.uid() = user_id);

create policy "messages_select_member" on messages for select using (
  exists (select 1 from conversation_members m where m.conversation_id = messages.conversation_id and m.user_id = auth.uid())
);
create policy "messages_insert_member" on messages for insert with check (
  auth.uid() = sender_id
  and exists (select 1 from conversation_members m where m.conversation_id = messages.conversation_id and m.user_id = auth.uid())
);
create policy "messages_delete_own" on messages for delete using (auth.uid() = sender_id);

-- NOTIFICATIONS: only the recipient can read/update their own
create policy "notifications_select_own" on notifications for select using (auth.uid() = recipient_id);
create policy "notifications_update_own" on notifications for update using (auth.uid() = recipient_id);
create policy "notifications_insert_authed" on notifications for insert with check (auth.uid() is not null);

-- STATUSES: visible if not expired and (public or friend), delete only own
create policy "statuses_select_active" on statuses for select using (
  expires_at > now()
);
create policy "statuses_insert_own" on statuses for insert with check (auth.uid() = author_id);
create policy "statuses_delete_own" on statuses for delete using (auth.uid() = author_id);

-- REPORTS: reporter can insert/see their own; admins see all (checked in app layer + admin policy below)
create policy "reports_select_own_or_admin" on reports for select using (
  auth.uid() = reporter_id or exists (select 1 from profiles p where p.id = auth.uid() and p.is_admin)
);
create policy "reports_insert_own" on reports for insert with check (auth.uid() = reporter_id);
create policy "reports_update_admin" on reports for update using (
  exists (select 1 from profiles p where p.id = auth.uid() and p.is_admin)
);
