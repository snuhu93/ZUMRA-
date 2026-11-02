import { supabase } from '@/lib/supabaseClient';
import {
  compressImage,
  compressVideo,
  isVideoTooLarge,
  MAX_VIDEO_MB,
  MAX_VIDEO_MB_DATA_SAVER,
} from '@/utils/mediaOptimization';

type Bucket = 'avatars' | 'covers' | 'post-images' | 'post-videos' | 'message-media';

export type VideoStatus =
  | { step: 'compressing' }
  | { step: 'uploading' }
  | { step: 'retrying'; attempt: number; total: number };

const MAX_UPLOAD_ATTEMPTS = 3;
const RETRY_DELAYS_MS = [2000, 4000];
const MIN_STATUS_MS = 800;

// Video thumbnail limits
const THUMB_MAX_SIDE = 480;
const THUMB_GENERATE_TIMEOUT_MS = 6000;
const THUMB_TOTAL_TIMEOUT_MS = 20000;

const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

/** Rejects if the promise takes longer than `ms`. */
function withTimeout<T>(promise: Promise<T>, ms: number, message: string): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(message)), ms);
    promise.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (error) => {
        clearTimeout(timer);
        reject(error);
      }
    );
  });
}

/** True when the request never reached the server (offline, paused project, DNS, CORS, wrong URL). */
function isNetworkError(err: any): boolean {
  const msg = String(err?.message ?? '').toLowerCase();
  return (
    msg.includes('failed to fetch') ||
    msg.includes('network request failed') ||
    msg.includes('networkerror') ||
    msg.includes('load failed')
  );
}

/** Turns raw errors into messages a person can understand. */
export function toFriendlyError(err: unknown): Error {
  if (isNetworkError(err)) {
    return new Error(
      'Cannot reach the server. Check your internet connection and try again. If it keeps happening, the server may be paused or unreachable.'
    );
  }
  if (err instanceof Error) return err;
  const message = (err as any)?.message;
  return new Error(typeof message === 'string' && message ? message : 'Upload failed. Please try again.');
}

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

  let lastError: unknown = null;

  for (let attempt = 1; attempt <= MAX_UPLOAD_ATTEMPTS; attempt++) {
    const path = buildPath(params.userId, params.file.name.replace(/\.[^.]+$/, '.webp'));

    const { error } = await supabase.storage.from(params.bucket).upload(path, compressed, {
      cacheControl: '31536000',
      upsert: false,
      contentType: 'image/webp'
    });

    if (!error) {
      const { data } = supabase.storage.from(params.bucket).getPublicUrl(path);
      return { path, publicUrl: data.publicUrl };
    }

    lastError = error;
    if (attempt === MAX_UPLOAD_ATTEMPTS || !isRetryable(error)) break;
    await sleep(RETRY_DELAYS_MS[attempt - 1]);
  }

  throw toFriendlyError(lastError);
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
        ? `Video is too large for Data Saver mode (max ${MAX_VIDEO_MB_DATA_SAVER}MB). Turn off Data Saver or choose a shorter clip.`
        : `Video is too large. Please choose a file under ${MAX_VIDEO_MB}MB.`
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

  throw lastError
    ? toFriendlyError(lastError)
    : new Error('Video upload failed. Please check your connection and try again.');
}

/**
 * Grabs one small frame (max 480px) from a video file as a JPEG.
 * Fails fast (6 seconds) instead of hanging on phones that cannot decode the video.
 */
export function generateVideoThumbnail(file: File): Promise<File> {
  return new Promise((resolve, reject) => {
    const video = document.createElement('video');
    const url = URL.createObjectURL(file);
    let settled = false;
    let seeking = false;

    const cleanup = () => {
      clearTimeout(timer);
      video.onloadedmetadata = null;
      video.onloadeddata = null;
      video.onseeked = null;
      video.onerror = null;
      video.pause();
      URL.revokeObjectURL(url);
    };
    const fail = (message: string) => {
      if (settled) return;
      settled = true;
      cleanup();
      reject(new Error(message));
    };

    // Never hang forever on devices that don't fire the video events
    const timer = setTimeout(() => fail('Thumbnail timed out'), THUMB_GENERATE_TIMEOUT_MS);

    const capture = () => {
      if (settled) return;
      const vw = video.videoWidth;
      const vh = video.videoHeight;
      if (!vw || !vh) {
        fail('Video has no picture size');
        return;
      }
      // Shrink the frame so low-end phones don't run out of memory
      const scale = Math.min(1, THUMB_MAX_SIDE / Math.max(vw, vh));
      const canvas = document.createElement('canvas');
      canvas.width = Math.max(1, Math.round(vw * scale));
      canvas.height = Math.max(1, Math.round(vh * scale));
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        fail('Could not create canvas context');
        return;
      }
      try {
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      } catch {
        fail('Could not draw the video frame');
        return;
      }
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
        0.75
      );
    };

    video.preload = 'auto';
    video.muted = true;
    video.playsInline = true;
    video.src = url;

    // Some Android phones don't load any frame until play() is called
    video.onloadedmetadata = () => {
      const p = video.play();
      if (p && typeof p.catch === 'function') p.catch(() => undefined);
    };

    video.onloadeddata = () => {
      if (settled || seeking) return;
      seeking = true;
      video.pause();
      const duration = Number.isFinite(video.duration) ? video.duration : 0;
      const target = Math.min(0.5, duration / 2);
      // If there is nothing to seek to, take the frame we already have
      if (target <= 0 || Math.abs(video.currentTime - target) < 0.01) {
        capture();
        return;
      }
      video.currentTime = target;
    };

    video.onseeked = () => capture();
    video.onerror = () => fail('Could not load video for thumbnail');
  });
}

/**
 * Creates and uploads a video thumbnail. It never throws and never takes longer
 * than 20 seconds: if anything goes wrong it returns undefined and the video is
 * posted without a thumbnail.
 */
export async function createVideoThumbnail(params: {
  file: File;
  userId: string;
  dataSaver: boolean;
}): Promise<string | undefined> {
  try {
    return await withTimeout(
      (async () => {
        const thumbFile = await generateVideoThumbnail(params.file);
        const { path } = await uploadImage({
          file: thumbFile,
          userId: params.userId,
          bucket: 'post-images',
          kind: 'post',
          dataSaver: params.dataSaver,
        });
        return path;
      })(),
      THUMB_TOTAL_TIMEOUT_MS,
      'Thumbnail took too long'
    );
  } catch (err) {
    console.error('Thumbnail skipped', err);
    return undefined;
  }
}

export async function uploadMessageMedia(params: { file: File; userId: string; conversationId: string; dataSaver: boolean }) {
  const isImage = params.file.type.startsWith('image/');
  const path = `${params.conversationId}/${params.userId}/${Date.now()}-${params.file.name}`;
  const body = isImage ? await compressImage(params.file, { kind: 'post', dataSaver: params.dataSaver }) : params.file;
  const { error } = await supabase.storage.from('message-media').upload(path, body, { upsert: false });
  if (error) throw toFriendlyError(error);
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
