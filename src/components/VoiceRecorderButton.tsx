import { useEffect, useRef, useState } from "react";
import { supabase } from "../lib/supabaseClient";

type Props = {
  conversationId: string;
  onSent?: () => void;
};

const SAMPLE_RATE = 16000;
const MAX_SECONDS = 120;

// Rubuta WAV (16-bit, mono) daga samfurin sauti
function encodeWav(samples: Float32Array, sampleRate: number): Blob {
  const buffer = new ArrayBuffer(44 + samples.length * 2);
  const view = new DataView(buffer);

  const writeStr = (offset: number, str: string) => {
    for (let i = 0; i < str.length; i++) {
      view.setUint8(offset + i, str.charCodeAt(i));
    }
  };

  writeStr(0, "RIFF");
  view.setUint32(4, 36 + samples.length * 2, true);
  writeStr(8, "WAVE");
  writeStr(12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true); // PCM
  view.setUint16(22, 1, true); // mono
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  writeStr(36, "data");
  view.setUint32(40, samples.length * 2, true);

  let offset = 44;
  for (let i = 0; i < samples.length; i++, offset += 2) {
    const s = Math.max(-1, Math.min(1, samples[i]));
    view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7fff, true);
  }

  return new Blob([buffer], { type: "audio/wav" });
}

// Mayar da naɗin wayar (webm/mp4/ogg) zuwa WAV mai 16kHz
async function blobToWav(blob: Blob): Promise<Blob> {
  const arrayBuffer = await blob.arrayBuffer();
  const AudioCtx =
    window.AudioContext || (window as any).webkitAudioContext;
  const ctx = new AudioCtx();
  const decoded = await ctx.decodeAudioData(arrayBuffer);
  await ctx.close();

  const length = Math.max(1, Math.ceil(decoded.duration * SAMPLE_RATE));
  const offline = new OfflineAudioContext(1, length, SAMPLE_RATE);
  const source = offline.createBufferSource();
  source.buffer = decoded;
  source.connect(offline.destination);
  source.start();
  const rendered = await offline.startRendering();

  return encodeWav(rendered.getChannelData(0), SAMPLE_RATE);
}

export default function VoiceRecorderButton({ conversationId, onSent }: Props) {
  const [recording, setRecording] = useState(false);
  const [sending, setSending] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const [error, setError] = useState("");

  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<number | null>(null);
  const cancelledRef = useRef(false);

  const clearTimer = () => {
    if (timerRef.current !== null) {
      window.clearInterval(timerRef.current);
      timerRef.current = null;
    }
  };

  useEffect(() => {
    return () => {
      clearTimer();
      if (recorderRef.current && recorderRef.current.state !== "inactive") {
        cancelledRef.current = true;
        recorderRef.current.stop();
      }
    };
  }, []);

  const sendVoice = async (rawBlob: Blob) => {
    setSending(true);
    setError("");
    let uploadedPath = "";
    try {
      const wav = await blobToWav(rawBlob);

      const { data: userData } = await supabase.auth.getUser();
      const user = userData.user;
      if (!user) throw new Error("Ba ka shiga ba");

      uploadedPath = `${user.id}/${crypto.randomUUID()}.wav`;
      const { error: upErr } = await supabase.storage
        .from("voice-messages")
        .upload(uploadedPath, wav, { contentType: "audio/wav" });
      if (upErr) throw upErr;

      const { error: insErr } = await supabase.from("messages").insert({
        conversation_id: conversationId,
        sender_id: user.id,
        content: "",
        audio_path: uploadedPath,
      });
      if (insErr) throw insErr;

      onSent?.();
    } catch (e) {
      console.error(e);
      // Idan saka saƙo ya gaza, a goge muryar da aka loda
      if (uploadedPath) {
        await supabase.storage.from("voice-messages").remove([uploadedPath]);
      }
      setError("Ba a iya aika murya ba, a sake gwadawa.");
    } finally {
      setSending(false);
    }
  };

  const startRecording = async () => {
    setError("");
    cancelledRef.current = false;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      chunksRef.current = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      recorder.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        clearTimer();
        setRecording(false);
        if (cancelledRef.current) return;
        const blob = new Blob(chunksRef.current, {
          type: recorder.mimeType || "audio/webm",
        });
        if (blob.size === 0) return;
        await sendVoice(blob);
      };

      recorder.start();
      recorderRef.current = recorder;
      setRecording(true);
      setSeconds(0);

      timerRef.current = window.setInterval(() => {
        setSeconds((s) => {
          if (s + 1 >= MAX_SECONDS) {
            recorderRef.current?.stop();
          }
          return s + 1;
        });
      }, 1000);
    } catch {
      setError("Ba a sami izinin makirufo ba.");
    }
  };

  const stopAndSend = () => {
    recorderRef.current?.stop();
  };

  const cancelRecording = () => {
    cancelledRef.current = true;
    recorderRef.current?.stop();
  };

  const fmt = (s: number) =>
    `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;

  return (
    <div style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
      {!recording && (
        <button
          type="button"
          onClick={startRecording}
          disabled={sending}
          aria-label="Naɗa murya"
        >
          {sending ? "Ana aikawa..." : "🎤"}
        </button>
      )}

      {recording && (
        <>
          <span style={{ color: "red" }}>● {fmt(seconds)}</span>
          <button type="button" onClick={cancelRecording} aria-label="Soke">
            ✖
          </button>
          <button type="button" onClick={stopAndSend} aria-label="Aika">
            ➤
          </button>
        </>
      )}

      {error && <span style={{ color: "red", fontSize: 12 }}>{error}</span>}
    </div>
  );
  }
