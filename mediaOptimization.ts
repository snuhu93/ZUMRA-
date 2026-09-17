import imageCompression from 'browser-image-compression';

// Central place for all "shrink this before it touches the network" logic.
// Every upload path (avatar, cover, post images, status) should go through
// compressImage() rather than uploading the raw file picked by the user.

interface CompressOptions {
  dataSaver: boolean;
  /** Rough target -- profile pics need less than feed images. */
  kind: 'avatar' | 'cover' | 'post' | 'status';
}

const PRESETS: Record<CompressOptions['kind'], { maxSizeMB: number; maxWidthOrHeight: number }> = {
  avatar: { maxSizeMB: 0.15, maxWidthOrHeight: 480 },
  cover: { maxSizeMB: 0.35, maxWidthOrHeight: 1280 },
  post: { maxSizeMB: 0.5, maxWidthOrHeight: 1600 },
  status: { maxSizeMB: 0.3, maxWidthOrHeight: 1080 }
};

export async function compressImage(file: File, options: CompressOptions): Promise<File> {
  const preset = PRESETS[options.kind];
  // Data Saver squeezes further: smaller dimensions, smaller file size.
  const maxSizeMB = options.dataSaver ? preset.maxSizeMB * 0.6 : preset.maxSizeMB;
  const maxWidthOrHeight = options.dataSaver ? Math.round(preset.maxWidthOrHeight * 0.75) : preset.maxWidthOrHeight;

  try {
    return await imageCompression(file, {
      maxSizeMB,
      maxWidthOrHeight,
      useWebWorker: true,
      fileType: 'image/webp'
    });
  } catch (err) {
    // If compression fails for any reason, fall back to the original file
    // rather than blocking the upload entirely.
    // eslint-disable-next-line no-console
    console.error('Image compression failed, using original file', err);
    return file;
  }
}

export function isVideoTooLarge(file: File, dataSaver: boolean): boolean {
  const limitMB = dataSaver ? 25 : 50;
  return file.size / (1024 * 1024) > limitMB;
}

/** Build a Supabase Storage transform URL for responsive, on-the-fly resized images. */
export function optimizedImageUrl(publicUrl: string, width: number, quality = 70): string {
  if (!publicUrl) return publicUrl;
  const separator = publicUrl.includes('?') ? '&' : '?';
  return `${publicUrl}${separator}width=${width}&quality=${quality}&resize=cover`;
}
