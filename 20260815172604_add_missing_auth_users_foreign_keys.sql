-- Add all missing foreign keys to auth.users
-- These were defined in the schema migration but never created in the database

DO $$
BEGIN
  -- comments.user_id
  IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'comments_user_id_fkey' AND table_name = 'comments' AND table_schema = 'public') THEN
    ALTER TABLE comments ADD CONSTRAINT comments_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
  END IF;

  -- likes.user_id
  IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'likes_user_id_fkey' AND table_name = 'likes' AND table_schema = 'public') THEN
    ALTER TABLE likes ADD CONSTRAINT likes_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
  END IF;

  -- follows.follower_id
  IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'follows_follower_id_fkey' AND table_name = 'follows' AND table_schema = 'public') THEN
    ALTER TABLE follows ADD CONSTRAINT follows_follower_id_fkey FOREIGN KEY (follower_id) REFERENCES auth.users(id) ON DELETE CASCADE;
  END IF;

  -- follows.following_id
  IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'follows_following_id_fkey' AND table_name = 'follows' AND table_schema = 'public') THEN
    ALTER TABLE follows ADD CONSTRAINT follows_following_id_fkey FOREIGN KEY (following_id) REFERENCES auth.users(id) ON DELETE CASCADE;
  END IF;

  -- messages.sender_id
  IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'messages_sender_id_fkey' AND table_name = 'messages' AND table_schema = 'public') THEN
    ALTER TABLE messages ADD CONSTRAINT messages_sender_id_fkey FOREIGN KEY (sender_id) REFERENCES auth.users(id) ON DELETE CASCADE;
  END IF;

  -- messages.recipient_id
  IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'messages_recipient_id_fkey' AND table_name = 'messages' AND table_schema = 'public') THEN
    ALTER TABLE messages ADD CONSTRAINT messages_recipient_id_fkey FOREIGN KEY (recipient_id) REFERENCES auth.users(id) ON DELETE CASCADE;
  END IF;

  -- notifications.user_id
  IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'notifications_user_id_fkey' AND table_name = 'notifications' AND table_schema = 'public') THEN
    ALTER TABLE notifications ADD CONSTRAINT notifications_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
  END IF;

  -- notifications.actor_id
  IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'notifications_actor_id_fkey' AND table_name = 'notifications' AND table_schema = 'public') THEN
    ALTER TABLE notifications ADD CONSTRAINT notifications_actor_id_fkey FOREIGN KEY (actor_id) REFERENCES auth.users(id) ON DELETE CASCADE;
  END IF;
END $$;
