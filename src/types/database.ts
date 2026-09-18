// Hand-written types mirroring supabase/migrations/*.sql
// (Run `supabase gen types typescript` later to auto-generate/replace this.)

export type PrivacyLevel = 'public' | 'friends' | 'only_me';
export type FriendRequestStatus = 'pending' | 'accepted' | 'rejected' | 'cancelled';
export type ReportTargetType = 'user' | 'post' | 'comment' | 'message';
export type ReportReason = 'spam' | 'harassment' | 'fake_account' | 'violence' | 'inappropriate' | 'other';
export type NotificationType =
  | 'friend_request'
  | 'friend_request_accepted'
  | 'new_follower'
  | 'post_like'
  | 'comment'
  | 'comment_reply'
  | 'post_share'
  | 'new_message';

export interface Profile {
  id: string; // = auth.users.id
  username: string;
  full_name: string;
  avatar_url: string | null;
  cover_url: string | null;
  bio: string | null;
  location: string | null;
  website: string | null;
  data_saver_enabled: boolean;
  is_admin: boolean;
  is_suspended: boolean;
  created_at: string;
}

export interface Post {
  id: string;
  author_id: string;
  content: string | null;
  privacy: PrivacyLevel;
  shared_post_id: string | null;
  like_count: number;
  comment_count: number;
  share_count: number;
  created_at: string;
  updated_at: string;
}

export interface PostMedia {
  id: string;
  post_id: string;
  media_type: 'image' | 'video';
  storage_path: string;
  thumbnail_path: string | null;
  width: number | null;
  height: number | null;
  position: number;
}

export interface Comment {
  id: string;
  post_id: string;
  author_id: string;
  parent_comment_id: string | null;
  content: string;
  like_count: number;
  created_at: string;
}

export interface Notification {
  id: string;
  recipient_id: string;
  actor_id: string | null;
  type: NotificationType;
  entity_id: string | null;
  is_read: boolean;
  created_at: string;
}

export interface Conversation {
  id: string;
  is_group: boolean;
  created_at: string;
}

export interface Message {
  id: string;
  conversation_id: string;
  sender_id: string;
  content: string | null;
  reply_to_message_id: string | null;
  created_at: string;
}

// Minimal Supabase Database generic so supabase-js typed calls compile.
// Expand per-table Row/Insert/Update shapes as the schema stabilizes.
export interface Database {
  public: {
    Tables: {
      [key: string]: {
        Row: Record<string, unknown>;
        Insert: Record<string, unknown>;
        Update: Record<string, unknown>;
      };
    };
  };
}
