import { useEffect, useRef, useState } from "react";
import { supabase } from "../lib/supabase";
import { useAuth } from "../context/AuthContext";

type Rec = {
  id: string;
  title: string | null;
  file_url: string;
  duration: number;
  created_at: string;
};

const fmt = (s: number) =>
  `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;

function pickMime() {
  const types = ["audio/webm;codecs=opus", "audio/webm", "audio/mp4"];
  return types.find((t) => MediaRecorder.isTypeSupported(t)) || "";
}

export default function RadioRecorder() {
  const { user } = useAuth() as any;
  const [recording, setRecording] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const [saving, setSaving] = useState(false);
  const [list, setList] = useState<Rec[]>([]);
  const [msg, setMsg] = useState("");

  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const timerRef = useRef<any>(null);
  const secondsRef = useRef(0);

  const load = async () => {
    const { data } = await supabase
      .from("radio_recordings")
      .select("id,title,file_url,duration,created_at")
      .order("created_at", { ascending: false })
      .limit(20);
    setList((data as Rec[]) || []);
  };

  useEffect(() => {
    load();
    return () => {
      clearInterval(timerRef.current);
      streamRef.current?.getTracks().forEach((t) => t.stop());
    };
  }, []);

  const start = async () => {
    setMsg("");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      const mime = pickMime();
      const rec = new MediaRecorder(stream, mime ? { mimeType: mime } : undefined);
      chunksRef.current = [];
      rec.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };
      rec.onstop = () => save(rec.mimeType || mime || "audio/webm");
      rec.start(1000);
      recorderRef.current = rec;
      secondsRef.current = 0;
      setSeconds(0);
      setRecording(true);
      timerRef.current = setInterval(() => {
        secondsRef.current += 1;
        setSeconds(secondsRef.current);
      }, 1000);
    } catch {
      setMsg("Ba a sami izinin makirufo ba.");
    }
  };

  const stop = () => {
    clearInterval(timerRef.current);
    recorderRef.current?.stop();
    streamRef.current?.getTracks().forEach((t) => t.stop());
    setRecording(false);
  };

  const save = async (mime: string) => {
    setSaving(true);
    try {
      const blob = new Blob(chunksRef.current, { type: mime });
      const ext = mime.includes("mp4") ? "m4a" : "webm";
      const path = `${user.id}/${Date.now()}.${ext}`;

      const { error: upErr } = await supabase.storage
        .from("radio-recordings")
        .upload(path, blob, { contentType: mime });
      if (upErr) throw upErr;

      const { data: pub } = supabase.storage
        .from("radio-recordings")
        .getPublicUrl(path);

      const { error: dbErr } = await supabase.from("radio_recordings").insert({
        host_id: user.id,
        title: "Rikodin Radio " + new Date().toLocaleDateString(),
        file_url: pub.publicUrl,
        duration: secondsRef.current,
      });
      if (dbErr) throw dbErr;

      setMsg("An ajiye rikodin ✅");
      load();
    } catch (e) {
      setMsg("Ba a iya ajiyewa ba. Sake gwadawa.");
    }
    setSaving(false);
  };

  return (
    <div style={{ marginTop: 20 }}>
      {!recording ? (
        <button
          onClick={start}
          disabled={saving}
          style={{
            padding: "12px 20px",
            borderRadius: 8,
            background: "#dc2626",
            color: "#fff",
            border: "none",
            fontSize: 16,
          }}
        >
          {saving ? "Ana ajiyewa..." : "🔴 Fara Rikodi"}
        </button>
      ) : (
        <button
          onClick={stop}
          style={{
            padding: "12px 20px",
            borderRadius: 8,
            background: "#374151",
            color: "#fff",
            border: "none",
            fontSize: 16,
          }}
        >
          ⏹ Tsayar · {fmt(seconds)}
        </button>
      )}

      {msg && <p>{msg}</p>}

      <h3 style={{ marginTop: 24 }}>Rikodin da aka yi</h3>
      {list.length === 0 && <p>Babu rikodi tukuna.</p>}
      {list.map((r) => (
        <div key={r.id} style={{ marginBottom: 14 }}>
          <div>
            {r.title} · {fmt(r.duration)}
          </div>
          <audio controls src={r.file_url} style={{ width: "100%" }} />
        </div>
      ))}
    </div>
  );
                 }
