import { supabase } from '@/lib/supabaseClient';
import { compressImage, compressVideo, isVideoTooLarge } from '@/utils/mediaOptimization';

type Bucket = 'avatars' | 'covers' | 'post-images' | 'post-videos' | 'message-media';

export type VideoStatus =
  | { step: 'compressing' }
  | { step: 'uploading' }
  | { step: 'retrying'; attempt: number; total: number };

const MAX_UPLOAD_ATTEMPTS = 3;
const RETRY_DELAYS_MS = [2000, 4000];
const MIN_STATUS_MS = 800;

const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

/** Network failures and server-side errors are worth retrying; permission/validation errors are not. */
function isRetryable(err: any): boolean {
  const status = Number(err?.statusCode ?? err?.status);
  if (status) return status >= 500 || status === 408 || status === 429;
  return true;
}

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
  onProgress?: (percent: number) => void;
  onStatus?: (status: VideoStatus) => void;
}): Promise<{ path: string; publicUrl: string }> {
  if (params.file.size / (1024 * 1024) > 150) {
    throw new Error('Video is too large. Please choose a file under 150MB.');
  }

  params.onStatus?.({ step: 'compressing' });
  const startedAt = Date.now();
  const file = await compressVideo(params.file, {
    dataSaver: params.dataSaver,
    onProgress: params.onProgress,
  });
  // Keep the "compressing" status visible long enough to be read
  const elapsed = Date.now() - startedAt;
  if (elapsed < MIN_STATUS_MS) await sleep(MIN_STATUS_MS - elapsed);

  if (isVideoTooLarge(file, params.dataSaver)) {
    throw new Error(
      params.dataSaver
        ? 'Video is too large for Data Saver mode (max 25MB). Turn off Data Saver or choose a shorter clip.'
        : 'Video is too large. Please choose a file under 50MB.'
    );
  }

  let lastError: unknown = null;

  for (let attempt = 1; attempt <= MAX_UPLOAD_ATTEMPTS; attempt++) {
    const path = buildPath(params.userId, file.name);

    params.onStatus?.(
      attempt === 1
        ? { step: 'uploading' }
        : { step: 'retrying', attempt, total: MAX_UPLOAD_ATTEMPTS }
    );

    const { error } = await supabase.storage.from('post-videos').upload(path, file, {
      cacheControl: '31536000',
      upsert: false,
      contentType: file.type || 'video/mp4'
    });

    if (!error) {
      const { data } = supabase.storage.from('post-videos').getPublicUrl(path);
      return { path, publicUrl: data.publicUrl };
    }

    lastError = error;
    if (attempt === MAX_UPLOAD_ATTEMPTS || !isRetryable(error)) break;
    await sleep(RETRY_DELAYS_MS[attempt - 1]);
  }

  throw lastError instanceof Error
    ? lastError
    : new Error('Video upload failed. Please check your connection and try again.');
}

export function generateVideoThumbnail(file: File): Promise<File> {
  return new Promise((resolve, reject) => {
    const video = document.createElement('video');
    const url = URL.createObjectURL(file);
    let settled = false;

    const cleanup = () => {
      clearTimeout(timer);
      URL.revokeObjectURL(url);
    };
    const fail = (message: string) => {
      if (settled) return;
      settled = true;
      cleanup();
      reject(new Error(message));
    };

    // Never hang forever on devices that don't fire the video events
    const timer = setTimeout(() => fail('Thumbnail timed out'), 8000);

    video.preload = 'auto';
    video.muted = true;
    video.playsInline = true;
    video.src = url;

    video.onloadeddata = () => {
      const duration = Number.isFinite(video.duration) ? video.duration : 0;
      video.currentTime = Math.min(0.1, duration / 2);
    };

    video.onseeked = () => {
      if (settled) return;
      const canvas = document.createElement('canvas');
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        fail('Could not create canvas context');
        return;
      }
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      canvas.toBlob(
        (blob) => {
          if (settled) return;
          if (!blob) {
            fail('Could not generate thumbnail');
            return;
          }
          settled = true;
          cleanup();
          resolve(new File([blob], 'thumbnail.jpg', { type: 'image/jpeg' }));
        },
        'image/jpeg',
        0.8
      );
    };

    video.onerror = () => fail('Could not load video for thumbnail');
  });
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
