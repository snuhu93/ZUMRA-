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
export interface VideoCompressOptions {
  dataSaver: boolean;
  onProgress?: (percent: number) => void;
}

/**
 * Sake matse bidiyo a browser kafin a loda shi. Idan bidiyon ya riga ya
 * kankanta ko matsewar ta kasa, ana mayar da fayil din asali.
 */
export async function compressVideo(
  file: File,
  options: VideoCompressOptions
): Promise<File> {
  const sizeMB = file.size / (1024 * 1024);
  if (sizeMB <= 10 || typeof MediaRecorder === 'undefined') return file;
  try {
    return await recompress(file, options);
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('Video compression failed, using original file', err);
    return file;
  }
}

async function recompress(file: File, options: VideoCompressOptions): Promise<File> {
  const url = URL.createObjectURL(file);
  const video = document.createElement('video');
  video.src = url;
  video.playsInline = true;
  video.preload = 'auto';

  try {
    await new Promise<void>((resolve, reject) => {
      video.onloadedmetadata = () => resolve();
      video.onerror = () => reject(new Error('Cannot read video'));
    });

    const maxSide = options.dataSaver ? 480 : 720;
    const scale = Math.min(1, maxSide / Math.min(video.videoWidth, video.videoHeight));
    const width = Math.round((video.videoWidth * scale) / 2) * 2;
    const height = Math.round((video.videoHeight * scale) / 2) * 2;

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) return file;

    const stream = canvas.captureStream(30);

    // Sauti: ana daukar ta ba tare da an kunna ta a lasifika ba
    let audioCtx: AudioContext | null = null;
    try {
      audioCtx = new AudioContext();
      const source = audioCtx.createMediaElementSource(video);
      const dest = audioCtx.createMediaStreamDestination();
      source.connect(dest);
      dest.stream.getAudioTracks().forEach((t) => stream.addTrack(t));
      await audioCtx.resume();
    } catch {
      /* ci gaba ba tare da sauti ba */
    }

    const mimeType = [
      'video/mp4;codecs=avc1,mp4a.40.2',
      'video/webm;codecs=vp9,opus',
      'video/webm;codecs=vp8,opus',
      'video/webm',
    ].find((m) => MediaRecorder.isTypeSupported(m));
    if (!mimeType) return file;

    const recorder = new MediaRecorder(stream, {
      mimeType,
      videoBitsPerSecond: options.dataSaver ? 1_000_000 : 1_800_000,
      audioBitsPerSecond: 96_000,
    });
    const chunks: Blob[] = [];
    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) chunks.push(e.data);
    };

    const done = new Promise<void>((resolve) => {
      recorder.onstop = () => resolve();
    });

    recorder.start(1000);
    let stopped = false;
    const finish = () => {
      if (stopped) return;
      stopped = true;
      recorder.stop();
    };
    video.onended = finish;
    // Kariya: idan wani abu ya tsaya, a dakatar bayan lokaci mai ma'ana
    const timeout = setTimeout(finish, (video.duration * 1.5 + 10) * 1000);

    const draw = () => {
      if (stopped) return;
      ctx.drawImage(video, 0, 0, width, height);
      if (video.duration) {
        options.onProgress?.(Math.min(99, Math.round((video.currentTime / video.duration) * 100)));
      }
      requestAnimationFrame(draw);
    };
    await video.play();
    draw();
    await done;
    clearTimeout(timeout);
    audioCtx?.close();

    const blob = new Blob(chunks, { type: mimeType.split(';')[0] });
    if (blob.size === 0 || blob.size >= file.size) return file;

    const ext = mimeType.startsWith('video/mp4') ? 'mp4' : 'webm';
    const name = file.name.replace(/\.[^.]+$/, '') + '.' + ext;
    options.onProgress?.(100);
    return new File([blob], name, { type: blob.type });
  } finally {
    URL.revokeObjectURL(url);
  }
}
