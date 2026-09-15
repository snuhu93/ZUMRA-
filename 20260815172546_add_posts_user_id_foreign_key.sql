-- Add the missing foreign key on posts.user_id -> auth.users(id
-- This constraint is referenced by the Feed query as posts_user_id_fkey
-- Without it, the Supabase join profiles:profiles!posts_user_id_fkey(...) fails

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'posts_user_id_fkey'
      AND table_name = 'posts'
      AND table_schema = 'public'
  ) THEN
    ALTER TABLE posts
      ADD CONSTRAINT posts_user_id_fkey
      FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
  END IF;
END $$;
