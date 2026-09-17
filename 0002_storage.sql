-- ZUMRA storage buckets + policies
-- Run after 0001_init.sql

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('avatars', 'avatars', true, 5242880, array['image/jpeg','image/png','image/webp']),
  ('covers', 'covers', true, 8388608, array['image/jpeg','image/png','image/webp']),
  ('post-images', 'post-images', true, 10485760, array['image/jpeg','image/png','image/webp']),
  ('post-videos', 'post-videos', true, 52428800, array['video/mp4','video/webm']),
  ('message-media', 'message-media', false, 10485760, array['image/jpeg','image/png','image/webp','video/mp4'])
on conflict (id) do nothing;

-- Public read for public buckets
create policy "public_read_avatars" on storage.objects for select using (bucket_id = 'avatars');
create policy "public_read_covers" on storage.objects for select using (bucket_id = 'covers');
create policy "public_read_post_images" on storage.objects for select using (bucket_id = 'post-images');
create policy "public_read_post_videos" on storage.objects for select using (bucket_id = 'post-videos');

-- Uploads: a user may only write into a folder prefixed with their own user id,
-- e.g. avatars/{user_id}/photo.jpg -- enforced via the storage.foldername() path segment.
create policy "own_folder_insert_avatars" on storage.objects for insert with check (
  bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text
);
create policy "own_folder_insert_covers" on storage.objects for insert with check (
  bucket_id = 'covers' and (storage.foldername(name))[1] = auth.uid()::text
);
create policy "own_folder_insert_post_images" on storage.objects for insert with check (
  bucket_id = 'post-images' and (storage.foldername(name))[1] = auth.uid()::text
);
create policy "own_folder_insert_post_videos" on storage.objects for insert with check (
  bucket_id = 'post-videos' and (storage.foldername(name))[1] = auth.uid()::text
);

-- message-media: private bucket, readable only by conversation members
create policy "message_media_select_member" on storage.objects for select using (
  bucket_id = 'message-media'
  and exists (
    select 1 from conversation_members cm
    where cm.user_id = auth.uid()
    and cm.conversation_id::text = (storage.foldername(name))[1]
  )
);
create policy "message_media_insert_own" on storage.objects for insert with check (
  bucket_id = 'message-media' and (storage.foldername(name))[2] = auth.uid()::text
);

-- Deletes: only the uploader (their own folder) can delete their files.
create policy "own_folder_delete_avatars" on storage.objects for delete using (
  bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text
);
create policy "own_folder_delete_covers" on storage.objects for delete using (
  bucket_id = 'covers' and (storage.foldername(name))[1] = auth.uid()::text
);
create policy "own_folder_delete_post_images" on storage.objects for delete using (
  bucket_id = 'post-images' and (storage.foldername(name))[1] = auth.uid()::text
);
create policy "own_folder_delete_post_videos" on storage.objects for delete using (
  bucket_id = 'post-videos' and (storage.foldername(name))[1] = auth.uid()::text
);
create policy "message_media_delete_own" on storage.objects for delete using (
  bucket_id = 'message-media' and (storage.foldername(name))[2] = auth.uid()::text
);
