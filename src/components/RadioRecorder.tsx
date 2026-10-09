import { useEffect, useRef, useState } from "react";
import { Room, RoomEvent, Track } from "livekit-client";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/lib/supabaseClient";

type Rec = {
  id: string;
  host_id: string;
  title: string | null;
  file_url: string;
  duration: number;
  created_at: string;
};

type Pending = {
  blob: Blob;
  mime: string;
  url: string;
  seconds: number;
};

const BUCKET = "radio-recordings";

const fmt = (s: number) =>
  `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;

function pickMime() {
  const types = ["audio/webm;codecs=opus", "audio/webm", "audio/mp4"];
  return types.find((t) => MediaRecorder.isTypeSupported(t)) || "";
}

const recBtn = (bg: string): React.CSSProperties => ({
  background: bg,
  color: "#fff",
  border: "none",
  borderRadius: 8,
  padding: "10px 14px",
  cursor: "pointer",
});

// Get the storage file path from a public URL
function pathFromUrl(url: string) {
  const marker = `/${BUCKET}/`;
  const i = url.indexOf(marker);
  if (i === -1) return null;
  return decodeURIComponent(url.slice(i + marker.length).split("?")[0]);
}

// List of recordings (everyone can listen, only the host can share or delete)
export function RecordingsList({ reloadKey = 0 }: { reloadKey?: number }) {
  const { user } = useAuth();
  const [list, setList] = useState<Rec[]>([]);
  const [notice, setNotice] = useState("");
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    supabase
      .from("radio_recordings")
      .select("id, host_id, title, file_url, duration, created_at")
      .order("created_at", { ascending: false })
      .limit(20)
      .then(({ data }) => setList((data as Rec[]) || []));
  }, [reloadKey]);

  const shareRec = async (r: Rec) => {
    setNotice("");
    const title = r.title || "Zumra Radio";
    try {
      if (navigator.share) {
        await navigator.share({ title, text: title, url: r.file_url });
        return;
      }
      await navigator.clipboard.writeText(r.file_url);
      setNotice("Link copied");
    } catch (e: any) {
      // If the person closes the share menu themselves, it is not an error
      if (e?.name === "AbortError") return;
      try {
        await navigator.clipboard.writeText(r.file_url);
        setNotice("Link copied");
      } catch {
        setNotice("Could not share the recording.");
      }
    }
  };

  const deleteRec = async (r: Rec) => {
    if (!user || user.id !== r.host_id) return;
    if (!window.confirm("Delete this recording? This cannot be undone.")) {
      return;
    }
    setNotice("");
    setDeletingId(r.id);
    try {
      // Delete the database row first; .select() confirms a row was removed
      const { data, error } = await supabase
        .from("radio_recordings")
        .delete()
        .eq("id", r.id)
        .eq("host_id", user.id)
        .select("id");
      if (error) throw error;
      if (!data || data.length === 0) {
        throw new Error("Not allowed to delete this recording");
      }

      // Then delete the audio file from storage
      const path = pathFromUrl(r.file_url);
      if (path) {
        const { error: stErr } = await supabase.storage
          .from(BUCKET)
          .remove([path]);
        if (stErr) console.error(stErr);
      }

      setList((prev) => prev.filter((x) => x.id !== r.id));
      setNotice("Recording deleted");
    } catch (e) {
      console.error(e);
      setNotice("Could not delete the recording.");
    }
    setDeletingId(null);
  };

  return (
    <div style={{ marginTop: 24 }}>
      <h3>🎧 Recordings</h3>
      {list.length === 0 && <p>No recordings yet.</p>}
      {notice && <p style={{ color: "#16a34a" }}>{notice}</p>}
      {list.map((r) => (
        <div key={r.id} style={{ marginBottom: 14 }}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              gap: 8,
              marginBottom: 6,
            }}
          >
            <span>
              {r.title} · {fmt(r.duration)}
            </span>
            {user?.id === r.host_id && (
              <div style={{ display: "flex", gap: 6 }}>
                <button
                  onClick={() => shareRec(r)}
                  style={{
                    ...recBtn("#2563eb"),
                    padding: "6px 10px",
                    fontSize: 13,
                  }}
                >
                  📤 Share
                </button>
                <button
                  onClick={() => deleteRec(r)}
                  disabled={deletingId === r.id}
                  style={{
                    ...recBtn("#dc2626"),
                    padding: "6px 10px",
                    fontSize: 13,
                  }}
                >
                  {deletingId === r.id ? "..." : "🗑 Delete"}
                </button>
              </div>
            )}
          </div>
          <audio controls src={r.file_url} style={{ width: "100%" }} />
        </div>
      ))}
    </div>
  );
}

// Record button (host only). After Stop, the host chooses to Save or Discard.
export default function RadioRecorder({
  lk,
  label = "Radio",
}: {
  lk: Room | null;
  label?: string;
}) {
  const { user } = useAuth();
  const [recording, setRecording] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");
  const [pending, setPending] = useState<Pending | null>(null);

  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<any>(null);
  const secondsRef = useRef(0);
  const ctxRef = useRef<AudioContext | null>(null);
  const cleanupRef = useRef<() => void>(() => {});
  const pendingUrlRef = useRef<string>("");

  useEffect(() => {
    return () => {
      clearInterval(timerRef.current);
      cleanupRef.current();
      if (pendingUrlRef.current) URL.revokeObjectURL(pendingUrlRef.current);
    };
  }, []);

  const clearPending = () => {
    if (pendingUrlRef.current) {
      URL.revokeObjectURL(pendingUrlRef.current);
      pendingUrlRef.current = "";
    }
    setPending(null);
  };

  const start = async () => {
    setMsg("");
    if (!lk) {
      setMsg("Room is not ready yet.");
      return;
    }
    try {
      const ctx = new AudioContext();
      await ctx.resume();
      ctxRef.current = ctx;
      const dest = ctx.createMediaStreamDestination();
      const connected = new Set<string>();

      const addTrack = (mt?: MediaStreamTrack | null) => {
        if (!mt || connected.has(mt.id)) return;
        connected.add(mt.id);
        ctx.createMediaStreamSource(new MediaStream([mt])).connect(dest);
      };

      // Host voice
      const localPub = lk.localParticipant.getTrackPublication(
        Track.Source.Microphone
      );
      addTrack(localPub?.track?.mediaStreamTrack);

      // Speakers who are already in the room
      lk.remoteParticipants.forEach((p) => {
        p.audioTrackPublications.forEach((pub) => {
          addTrack(pub.track?.mediaStreamTrack);
        });
      });

      // Speakers who join after recording has started
      const onSub = (track: any) => {
        if (track.kind === Track.Kind.Audio) addTrack(track.mediaStreamTrack);
      };
      lk.on(RoomEvent.TrackSubscribed, onSub);

      cleanupRef.current = () => {
        lk.off(RoomEvent.TrackSubscribed, onSub);
        ctx.close().catch(() => {});
      };

      const mime = pickMime();
      const rec = new MediaRecorder(
        dest.stream,
        mime ? { mimeType: mime } : undefined
      );
      chunksRef.current = [];
      rec.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };
      rec.onstop = () => {
        cleanupRef.current();
        const finalMime = rec.mimeType || mime || "audio/webm";
        const blob = new Blob(chunksRef.current, { type: finalMime });
        if (blob.size === 0) {
          setMsg("Nothing was recorded.");
          return;
        }
        const url = URL.createObjectURL(blob);
        pendingUrlRef.current = url;
        setPending({
          blob,
          mime: finalMime,
          url,
          seconds: secondsRef.current,
        });
      };
      rec.start(1000);
      recorderRef.current = rec;

      secondsRef.current = 0;
      setSeconds(0);
      setRecording(true);
      timerRef.current = setInterval(() => {
        secondsRef.current += 1;
        setSeconds(secondsRef.current);
      }, 1000);
    } catch (e) {
      console.error(e);
      setMsg("Could not start recording.");
    }
  };

  const stop = () => {
    clearInterval(timerRef.current);
    recorderRef.current?.stop();
    setRecording(false);
  };

  // Only runs when the host presses Save
  const save = async () => {
    if (!user || !pending) return;
    setSaving(true);
    setMsg("");
    try {
      const { blob, mime, seconds: dur } = pending;
      const ext = mime.includes("mp4") ? "m4a" : "webm";
      const path = `${user.id}/${Date.now()}.${ext}`;

      const { error: upErr } = await supabase.storage
        .from(BUCKET)
        .upload(path, blob, { contentType: mime });
      if (upErr) throw upErr;

      const { data: pub } = supabase.storage.from(BUCKET).getPublicUrl(path);

      const { error: dbErr } = await supabase.from("radio_recordings").insert({
        host_id: user.id,
        title: label + " " + new Date().toLocaleString(),
        file_url: pub.publicUrl,
        duration: dur,
      });
      if (dbErr) throw dbErr;

      clearPending();
      setMsg("Saved ✅");
    } catch (e) {
      // Keep the recording so the host can try Save again
      console.error(e);
      setMsg("Could not save the recording. Try again.");
    }
    setSaving(false);
  };

  const discard = () => {
    if (!window.confirm("Discard this recording?")) return;
    clearPending();
    setMsg("Recording discarded");
  };

  return (
    <div style={{ marginTop: 16 }}>
      {recording ? (
        <button onClick={stop} style={recBtn("#374151")}>
          ⏹ Stop · {fmt(seconds)}
        </button>
      ) : pending ? (
        <div>
          <p style={{ marginBottom: 6 }}>
            Recording ready · {fmt(pending.seconds)} (not saved yet)
          </p>
          <audio controls src={pending.url} style={{ width: "100%" }} />
          <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
            <button
              onClick={save}
              disabled={saving}
              style={recBtn("#16a34a")}
            >
              {saving ? "Saving..." : "💾 Save"}
            </button>
            <button
              onClick={discard}
              disabled={saving}
              style={recBtn("#6b7280")}
            >
              🗑 Discard
            </button>
          </div>
        </div>
      ) : (
        <button onClick={start} style={recBtn("#dc2626")}>
          🔴 Record
        </button>
      )}
      {msg && <p>{msg}</p>}
    </div>
  );
  }
