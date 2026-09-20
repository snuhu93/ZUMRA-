import { supabase } from '@/lib/supabaseClient';
import { compressImage, isVideoTooLarge } from '@/utils/mediaOptimization';

type Bucket = 'avatars' | 'covers' | 'post-images' | 'post-videos' | 'message-media';

/** Every object is stored under {userId}/... so storage RLS policies can enforce ownership. */
function buildPath(userId: string, fileName: string, prefix?: string) {
  const ext = fileName.split('.').pop() || 'bin';
  const unique = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
  return prefix ? `${userId}/${prefix}/${unique}` : `${userId}/${unique}`;
}

export async function uploadImage(params: {
  file: File;
  userId: string;
  bucket: Extract<Bucket, 'avatars' | 'covers' | 'post-images'>;
  kind: 'avatar' | 'cover' | 'post' | 'status';
  dataSaver: boolean;
}): Promise<{ path: string; publicUrl: string }> {
  const compressed = await compressImage(params.file, { kind: params.kind, dataSaver: params.dataSaver });
  const path = buildPath(params.userId, params.file.name.replace(/\.[^.]+$/, '.webp'));

  const { error } = await supabase.storage.from(params.bucket).upload(path, compressed, {
    cacheControl: '31536000',
    upsert: false,
    contentType: 'image/webp'
  });
  if (error) throw error;

  const { data } = supabase.storage.from(params.bucket).getPublicUrl(path);
  return { path, publicUrl: data.publicUrl };
}

export async function uploadVideo(params: {
  file: File;
  userId: string;
  dataSaver: boolean;
}): Promise<{ path: string; publicUrl: string }> {
  if (isVideoTooLarge(params.file, params.dataSaver)) {
    throw new Error(
      params.dataSaver
        ? 'Video is too large for Data Saver mode (max 25MB). Turn off Data Saver or choose a shorter clip.'
        : 'Video is too large. Please choose a file under 100MB.'
    );
  }
  const path = buildPath(params.userId, params.file.name);
  const { error } = await supabase.storage.from('post-videos').upload(path, params.file, {
    cacheControl: '31536000',
    upsert: false,
    contentType: params.file.type || 'video/mp4'
  });
  if (error) throw error;
  const { data } = supabase.storage.from('post-videos').getPublicUrl(path);
  return { path, publicUrl: data.publicUrl };
}

export async function uploadMessageMedia(params: { file: File; userId: string; conversationId: string; dataSaver: boolean }) {
  const isImage = params.file.type.startsWith('image/');
  const path = `${params.conversationId}/${params.userId}/${Date.now()}-${params.file.name}`;
  const body = isImage ? await compressImage(params.file, { kind: 'post', dataSaver: params.dataSaver }) : params.file;
  const { error } = await supabase.storage.from('message-media').upload(path, body, { upsert: false });
  if (error) throw error;
  return path;
}

export function getPublicUrl(bucket: Bucket, path: string | null): string | null {
  if (!path) return null;
  const { data } = supabase.storage.from(bucket).getPublicUrl(path);
  return data.publicUrl;
}

export async function deleteFile(bucket: Bucket, path: string) {
  const { error } = await supabase.storage.from(bucket).remove([path]);
  if (error) throw error;
    }
