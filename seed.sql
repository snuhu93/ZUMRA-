-- ZUMRA demo/seed data (OPTIONAL)
-- This creates a few fictional profiles and posts so you can see ZUMRA
-- working with content. Clearly labeled as demo data.
--
-- IMPORTANT: This inserts into `profiles` directly using fixed UUIDs, which
-- normally only get created via the auth.users trigger. These demo profiles
-- are NOT linked to real auth.users rows, so you cannot log in as them --
-- they only exist to populate the feed for a UI test. Run this against a
-- dev/staging project only, never production.

insert into profiles (id, username, full_name, bio, avatar_url, is_admin, data_saver_enabled)
values
  ('00000000-0000-0000-0000-000000000001', 'demo_amina', 'Amina Yusuf (Demo)', 'Loves photography and tea. [DEMO ACCOUNT]', null, false, true),
  ('00000000-0000-0000-0000-000000000002', 'demo_chidi', 'Chidi Okafor (Demo)', 'Building things on ZUMRA. [DEMO ACCOUNT]', null, false, true),
  ('00000000-0000-0000-0000-000000000003', 'demo_admin', 'ZUMRA Admin (Demo)', 'Platform administrator. [DEMO ACCOUNT]', null, true, false)
on conflict (id) do nothing;

insert into posts (id, author_id, content, privacy)
values
  ('10000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', 'Good morning ZUMRA! [DEMO POST] This is what a text post looks like.', 'public'),
  ('10000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000002', 'Just joined ZUMRA -- excited to connect with everyone here. [DEMO POST]', 'public')
on conflict (id) do nothing;
