-- ZUMRA: ensure the posts -> auth.users relationship exists.
-- The app feed no longer depends on this relationship for loading posts,
-- but keeping the constraint makes the database schema consistent.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'posts_user_id_fkey'
      AND table_name = 'posts'
      AND table_schema = 'public'
  ) THEN
    ALTER TABLE public.posts
      ADD CONSTRAINT posts_user_id_fkey
      FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
  END IF;
END $$;
