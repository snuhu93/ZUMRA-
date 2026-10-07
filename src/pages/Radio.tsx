import { useEffect, useRef, useState } from "react";
import { Room, RoomEvent, Track } from "livekit-client";
import { useT } from "@/i18n";
import { supabase } from "@/lib/supabaseClient";

type RoomRow = {
  id: string;
  title: string;
  host_id: string;
  created_at: string;
};

// A room is hidden from the list if its host has not sent a heartbeat for this long
const STALE_MS = 60_000;
const HEARTBEAT_MS = 30_000;

const btn = (bg: string): React.CSSProperties => ({
  background: bg,
  color: "#fff",
  border: "none",
  borderRadius: 8,
  padding: "10px 14px",
  cursor: "pointer",
});

function RadioRoom({ room, onLeave }: { room: RoomRow; onLeave: () => void }) {
  const t = useT();
  const [status, setStatus] = useState<"connecting" | "live" | "error">("connecting");
  const [isHost, setIsHost] = useState(false);
  const [count, setCount] = useState(0);
  const [micFailed, setMicFailed] = useState(false);
  const [ended, setEnded] = useState(false);
  const audioBox = useRef<HTMLDivElement>(null);
  const hostRef = useRef(false);

  useEffect(() => {
    let cancelled = false;
    let heartbeat: ReturnType<typeof setInterval> | undefined;
    const lk = new Room();

    // Marks the room as ended in the database (only does something for the host)
    const closeIfHost = () => {
      if (!hostRef.current) return;
      supabase
        .from("radio_rooms")
        .update({ is_live: false, ended_at: new Date().toISOString() })
        .eq("id", room.id)
        .then(() => {});
    };

    window.addEventListener("pagehide", closeIfHost);

    // Listen for the room being ended
    const channel = supabase
      .channel(`radio-room-${room.id}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "radio_rooms",
          filter: `id=eq.${room.id}`,
        },
        (payload) => {
          const row = payload.new as { is_live?: boolean };
          if (row.is_live === false) {
            setEnded(true);
            lk.disconnect();
          }
        }
      )
      .subscribe();

    (async () => {
      try {
        const { data, error } = await supabase.functions.invoke("livekit-token", {
          body: { roomId: room.id },
        });
        if (error || !data?.token) throw new Error("token");
        if (cancelled) return;

        setIsHost(data.isHost);
        hostRef.current = data.isHost;

        const refresh = () => {
          const n = lk.remoteParticipants.size;
          setCount(data.isHost ? n : Math.max(n - 1, 0));
        };

        lk.on(RoomEvent.TrackSubscribed, (track) => {
          if (track.kind === Track.Kind.Audio) {
            audioBox.current?.appendChild(track.attach());
          }
        });
        lk.on(RoomEvent.TrackUnsubscribed, (track) => {
          track.detach().forEach((el) => el.remove());
        });
        lk.on(RoomEvent.ParticipantConnected, refresh);
        lk.on(RoomEvent.ParticipantDisconnected, (participant) => {
          refresh();
          // If the host leaves, listeners see the room as ended right away
          if (participant.identity === room.host_id) {
            setEnded(true);
            lk.disconnect();
          }
        });

        await lk.connect(data.url, data.token);
        await lk.startAudio();

        if (data.isHost) {
          try {
            await lk.localParticipant.setMicrophoneEnabled(true);
          } catch {
            setMicFailed(true);
          }

          // Heartbeat so the room disappears from the list if the host vanishes
          heartbeat = setInterval(() => {
            supabase
              .from("radio_rooms")
              .update({ last_seen: new Date().toISOString() })
              .eq("id", room.id)
              .then(() => {});
          }, HEARTBEAT_MS);
        }

        refresh();
        setStatus("live");
      } catch {
        if (!cancelled) setStatus("error");
      }
    })();

    return () => {
      cancelled = true;
      if (heartbeat) clearInterval(heartbeat);
      window.removeEventListener("pagehide", closeIfHost);
      closeIfHost();
      lk.disconnect();
      supabase.removeChannel(channel);
    };
  }, [room.id, room.host_id]);

  const endRoom = async () => {
    await supabase
      .from("radio_rooms")
      .update({ is_live: false, ended_at: new Date().toISOString() })
      .eq("id", room.id);
    hostRef.current = false;
    onLeave();
  };

  return (
    <div style={{ padding: 16, maxWidth: 480, margin: "0 auto" }}>
      <h2 style={{ marginBottom: 4 }}>{room.title}</h2>

      {ended ? (
        <p>{t("radio.ended")}</p>
      ) : status === "connecting" ? (
        <p>{t("radio.connecting")}</p>
      ) : status === "error" ? (
        <p>{t("radio.error")}</p>
      ) : (
        <>
          <p style={{ color: "#16a34a", fontWeight: 600 }}>
            🔴 {t("radio.liveNow")} · {count} {t("radio.listeners")}
          </p>
          {isHost && <p>🎙️ {t("radio.youAreHost")}</p>}
          {micFailed && <p style={{ color: "#dc2626" }}>{t("radio.micError")}</p>}
        </>
      )}

      <div ref={audioBox} />

      <div style={{ display: "flex", gap: 8, marginTop: 16 }}>
        {isHost && !ended ? (
          <button onClick={endRoom} style={btn("#dc2626")}>
            {t("radio.endRoom")}
          </button>
        ) : (
          <button onClick={onLeave} style={btn("#6b7280")}>
            {t("radio.leave")}
          </button>
        )}
      </div>
    </div>
  );
}

export default function Radio() {
  const t = useT();
  const [rooms, setRooms] = useState<RoomRow[]>([]);
  const [title, setTitle] = useState("");
  const [active, setActive] = useState<RoomRow | null>(null);
  const [failed, setFailed] = useState(false);

  const loadRooms = async () => {
    const cutoff = new Date(Date.now() - STALE_MS).toISOString();
    const { data } = await supabase
      .from("radio_rooms")
      .select("id, title, host_id, created_at")
      .eq("is_live", true)
      .gt("last_seen", cutoff)
      .order("created_at", { ascending: false });
    setRooms(data || []);
  };

  useEffect(() => {
    loadRooms();

    const channel = supabase
      .channel("radio-rooms-list")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "radio_rooms" },
        () => {
          loadRooms();
        }
      )
      .subscribe();

    // Re-check periodically so stale rooms drop off the list
    const interval = setInterval(loadRooms, HEARTBEAT_MS);

    return () => {
      clearInterval(interval);
      supabase.removeChannel(channel);
    };
  }, []);

  const startRoom = async () => {
    if (!title.trim()) return;
    setFailed(false);

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    const { data, error } = await supabase
      .from("radio_rooms")
      .insert({ title: title.trim(), host_id: user.id })
      .select()
      .single();

    if (error || !data) {
      setFailed(true);
      return;
    }
    setTitle("");
    setActive(data);
  };

  if (active) {
    return (
      <RadioRoom
        room={active}
        onLeave={() => {
          setActive(null);
          loadRooms();
        }}
      />
    );
  }

  return (
    <div style={{ padding: 16, maxWidth: 480, margin: "0 auto" }}>
      <h2>📻 {t("radio.title")}</h2>

      <div style={{ display: "flex", gap: 8, margin: "12px 0 24px" }}>
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder={t("radio.roomTitle")}
          style={{
            flex: 1,
            padding: 10,
            borderRadius: 8,
            border: "1px solid #d1d5db",
          }}
        />
        <button onClick={startRoom} style={btn("#16a34a")}>
          {t("radio.goLive")}
        </button>
      </div>
      {failed && <p style={{ color: "#dc2626" }}>{t("radio.error")}</p>}

      <h3>{t("radio.liveNow")}</h3>
      {rooms.length === 0 ? (
        <p>{t("radio.noRooms")}</p>
      ) : (
        rooms.map((r) => (
          <div
            key={r.id}
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              padding: 12,
              border: "1px solid #e5e7eb",
              borderRadius: 10,
              marginBottom: 8,
            }}
          >
            <span>🔴 {r.title}</span>
            <button onClick={() => setActive(r)} style={btn("#2563eb")}>
              {t("radio.listen")}
            </button>
          </div>
        ))
      )}
    </div>
  );
        }
