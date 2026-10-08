import { useEffect, useRef, useState } from "react";
import { Room, RoomEvent, Track } from "livekit-client";
import { useT } from "@/i18n";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/lib/supabaseClient";

type OpenRoomRow = {
  id: string;
  title: string;
  host_id: string;
  created_at: string;
};

type Person = {
  id: string;
  name: string;
  speaking: boolean;
  muted: boolean;
};

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

function OpenRoom({
  room,
  onLeave,
}: {
  room: OpenRoomRow;
  onLeave: () => void;
}) {
  const t = useT();
  const { user, profile } = useAuth();
  const [status, setStatus] = useState<"connecting" | "live" | "error">(
    "connecting"
  );
  const [errMsg, setErrMsg] = useState("");
  const [isHost, setIsHost] = useState(false);
  const [micOn, setMicOn] = useState(false);
  const [micFailed, setMicFailed] = useState(false);
  const [people, setPeople] = useState<Person[]>([]);
  const [ended, setEnded] = useState(false);
  const audioBox = useRef<HTMLDivElement>(null);
  const hostRef = useRef(false);
  const lkRef = useRef<Room | null>(null);
  const nameRef = useRef<string>(profile?.username || "user");
  nameRef.current = profile?.username || "user";

  useEffect(() => {
    let cancelled = false;
    let heartbeat: ReturnType<typeof setInterval> | undefined;
    const lk = new Room();
    lkRef.current = lk;

    const closeIfHost = () => {
      if (!hostRef.current) return;
      supabase
        .from("radio_rooms")
        .update({ is_live: false, ended_at: new Date().toISOString() })
        .eq("id", room.id)
        .then(() => {});
    };
    window.addEventListener("pagehide", closeIfHost);

    const channel = supabase
      .channel(`open-room-${room.id}`)
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

    const refresh = () => {
      const all = [
        lk.localParticipant,
        ...Array.from(lk.remoteParticipants.values()),
      ];
      setPeople(
        all.map((p) => ({
          id: p.identity,
          name: p.name || "user",
          speaking: p.isSpeaking,
          muted: !p.isMicrophoneEnabled,
        }))
      );
      // Daidaita maɓallin Unmute da ainihin yanayin makirufo
      setMicOn(lk.localParticipant.isMicrophoneEnabled);
    };

    (async () => {
      try {
        const { data, error } = await supabase.functions.invoke(
          "livekit-open-token",
          { body: { roomId: room.id, name: nameRef.current } }
        );
        if (error) throw error;
        if (!data?.token || !data?.url) {
          throw new Error("No token or url: " + JSON.stringify(data));
        }
        if (cancelled) return;

        setIsHost(data.isHost);
        hostRef.current = data.isHost;

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
          if (participant.identity === room.host_id) {
            setEnded(true);
            lk.disconnect();
          }
        });
        lk.on(RoomEvent.ActiveSpeakersChanged, refresh);
        lk.on(RoomEvent.TrackMuted, refresh);
        lk.on(RoomEvent.TrackUnmuted, refresh);
        lk.on(RoomEvent.LocalTrackPublished, refresh);
        lk.on(RoomEvent.LocalTrackUnpublished, refresh);

        await lk.connect(data.url, data.token);

        try {
          await lk.startAudio();
        } catch (e) {
          console.error("startAudio failed", e);
        }

        if (data.isHost) {
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
      } catch (e: any) {
        console.error("Open room error", e);
        if (!cancelled) {
          setErrMsg(e?.message || String(e));
          setStatus("error");
        }
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

  const toggleMic = async () => {
    const lk = lkRef.current;
    if (!lk) return;
    const next = !lk.localParticipant.isMicrophoneEnabled;
    try {
      setMicFailed(false);
      await lk.localParticipant.setMicrophoneEnabled(next);
      setMicOn(next);
    } catch {
      setMicFailed(true);
    }
  };

  const endRoom = async () => {
    await supabase
      .from("radio_rooms")
      .update({ is_live: false, ended_at: new Date().toISOString() })
      .eq("id", room.id);
    hostRef.current = false;
    onLeave();
  };

  return (
    <div>
      <h2 style={{ marginBottom: 4 }}>🎤 {room.title}</h2>

      {ended ? (
        <p>{t("radio.ended")}</p>
      ) : status === "connecting" ? (
        <p>{t("radio.connecting")}</p>
      ) : status === "error" ? (
        <>
          <p>{t("radio.error")}</p>
          {errMsg && (
            <p
              style={{
                color: "#dc2626",
                fontSize: 13,
                wordBreak: "break-word",
              }}
            >
              {errMsg}
            </p>
          )}
        </>
      ) : (
        <>
          <p style={{ color: "#16a34a", fontWeight: 600 }}>
            🔴 {t("open.live")} · {people.length} {t("open.inside")}
          </p>
          {isHost && <p>👑 {t("radio.youAreHost")}</p>}
          {micFailed && (
            <p style={{ color: "#dc2626" }}>{t("radio.micError")}</p>
          )}
        </>
      )}

      <div ref={audioBox} />

      {!ended && status === "live" && (
        <>
          <button
            onClick={toggleMic}
            style={{
              ...btn(micOn ? "#dc2626" : "#16a34a"),
              width: "100%",
              fontSize: 16,
              margin: "8px 0 16px",
            }}
          >
            {micOn ? "🔇 " + t("radio.mute") : "🎙️ " + t("radio.unmute")}
          </button>

          <h3>{t("open.people")}</h3>
          {people.map((p) => {
            const isSelf = p.id === user?.id;
            const icon = p.muted ? "🔇" : p.speaking ? "🔊" : "🎙️";
            return (
              <div
                key={p.id}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  padding: 10,
                  border: p.speaking
                    ? "2px solid #16a34a"
                    : "1px solid #e5e7eb",
                  borderRadius: 10,
                  marginBottom: 8,
                }}
              >
                <span>
                  @{p.name}
                  {isSelf ? " " + t("open.you") : ""}
                  {p.id === room.host_id ? " 👑" : ""}
                </span>
                {isSelf ? (
                  <button
                    type="button"
                    onClick={toggleMic}
                    aria-label={micOn ? t("radio.mute") : t("radio.unmute")}
                    style={{
                      background: "transparent",
                      border: "none",
                      cursor: "pointer",
                      fontSize: 22,
                      padding: 6,
                      lineHeight: 1,
                    }}
                  >
                    {icon}
                  </button>
                ) : (
                  <span style={{ fontSize: 22, padding: 6, lineHeight: 1 }}>
                    {icon}
                  </span>
                )}
              </div>
            );
          })}
        </>
      )}

      <div style={{ display: "flex", gap: 8, marginTop: 20 }}>
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

export default function OpenTalk() {
  const t = useT();
  const [rooms, setRooms] = useState<OpenRoomRow[]>([]);
  const [title, setTitle] = useState("");
  const [active, setActive] = useState<OpenRoomRow | null>(null);
  const [failed, setFailed] = useState(false);

  const loadRooms = async () => {
    const cutoff = new Date(Date.now() - STALE_MS).toISOString();
    const { data } = await supabase
      .from("radio_rooms")
      .select("id, title, host_id, created_at")
      .eq("is_live", true)
      .eq("is_open", true)
      .gt("last_seen", cutoff)
      .order("created_at", { ascending: false });
    setRooms(data || []);
  };

  useEffect(() => {
    loadRooms();
    const channel = supabase
      .channel("open-rooms-list")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "radio_rooms" },
        () => {
          loadRooms();
        }
      )
      .subscribe();
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
      .insert({ title: title.trim(), host_id: user.id, is_open: true })
      .select("id, title, host_id, created_at")
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
      <OpenRoom
        room={active}
        onLeave={() => {
          setActive(null);
          loadRooms();
        }}
      />
    );
  }

  return (
    <div>
      <h2>🎤 {t("open.title")}</h2>
      <p style={{ fontSize: 14, opacity: 0.8 }}>{t("open.hint")}</p>

      <div style={{ display: "flex", gap: 8, margin: "12px 0 24px" }}>
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder={t("open.placeholder")}
          style={{
            flex: 1,
            padding: 10,
            borderRadius: 8,
            border: "1px solid #d1d5db",
            background: "#1f2937",
            color: "#ffffff",
            WebkitTextFillColor: "#ffffff",
            caretColor: "#ffffff",
            fontSize: 16,
          }}
        />
        <button onClick={startRoom} style={btn("#16a34a")}>
          {t("open.start")}
        </button>
      </div>
      {failed && <p style={{ color: "#dc2626" }}>{t("radio.error")}</p>}

      <h3>{t("open.rooms")}</h3>
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
              {t("open.join")}
            </button>
          </div>
        ))
      )}
    </div>
  );
    }
