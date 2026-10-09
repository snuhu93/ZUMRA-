import { useEffect, useRef, useState } from "react";
import { Room, RoomEvent, Track } from "livekit-client";
import { useT } from "@/i18n";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/lib/supabaseClient";
import RadioRecorder, { RecordingsList } from "@/components/RadioRecorder";
import OpenTalk from "@/components/OpenTalk";

type RoomRow = {
  id: string;
  title: string;
  host_id: string;
  created_at: string;
};

type HandRow = {
  id: string;
  room_id: string;
  user_id: string;
  username: string;
  status: "raised" | "speaking";
};

type Person = {
  id: string;
  name: string;
  speaking: boolean;
  muted: boolean;
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

const smallBtn = (bg: string): React.CSSProperties => ({
  ...btn(bg),
  padding: "6px 10px",
  fontSize: 13,
});

// Turns any error into readable text (also reads the body of edge function errors)
async function explain(e: any): Promise<string> {
  try {
    if (e?.context && typeof e.context.text === "function") {
      const txt = await e.context.text();
      return `${e.message || "Error"}: ${txt}`;
    }
  } catch {
    // ignore
  }
  return e?.message || String(e);
}

function RadioRoom({ room, onLeave }: { room: RoomRow; onLeave: () => void }) {
  const t = useT();
  const { user, profile } = useAuth();
  const [status, setStatus] = useState<"connecting" | "live" | "error">("connecting");
  const [errMsg, setErrMsg] = useState("");
  const [isHost, setIsHost] = useState(false);
  const [count, setCount] = useState(0);
  const [micFailed, setMicFailed] = useState(false);
  const [micOn, setMicOn] = useState(false);
  const [isSpeaker, setIsSpeaker] = useState(false);
  const [hands, setHands] = useState<HandRow[]>([]);
  const [ended, setEnded] = useState(false);
  const [people, setPeople] = useState<Person[]>([]);
  const audioBox = useRef<HTMLDivElement>(null);
  const hostRef = useRef(false);
  const lkRef = useRef<Room | null>(null);
  const userIdRef = useRef<string | undefined>(user?.id);
  userIdRef.current = user?.id;
  const nameRef = useRef<string>(profile?.username || "user");
  nameRef.current = profile?.username || "user";

  const loadHands = async () => {
    const { data } = await supabase
      .from("radio_hands")
      .select("id, room_id, user_id, username, status")
      .eq("room_id", room.id)
      .order("created_at", { ascending: true });
    setHands((data as HandRow[]) || []);
  };

  // Keep the list of raised hands and speakers up to date
  useEffect(() => {
    loadHands();
    const channel = supabase
      .channel(`radio-hands-${room.id}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "radio_hands",
          filter: `room_id=eq.${room.id}`,
        },
        () => {
          loadHands();
        }
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [room.id]);

  useEffect(() => {
    let cancelled = false;
    let heartbeat: ReturnType<typeof setInterval> | undefined;
    const lk = new Room();
    lkRef.current = lk;

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

    // Builds the list of people who can speak (host + approved speakers)
    // with their real speaking / muted state, same idea as Open Talk
    const refreshPeople = () => {
      const local = lk.localParticipant;
      const all = [local, ...Array.from(lk.remoteParticipants.values())];
      const stage = all.filter(
        (p) => p.identity === room.host_id || !!p.permissions?.canPublish
      );
      setPeople(
        stage.map((p) => ({
          id: p.identity,
          name:
            p === local
              ? nameRef.current
              : p.name || "user",
          speaking: p.isSpeaking,
          muted: !p.isMicrophoneEnabled,
        }))
      );
      // Keep the Mute / Unmute button in sync with the real mic state
      if (local.permissions?.canPublish || hostRef.current) {
        setMicOn(local.isMicrophoneEnabled);
      }
    };

    (async () => {
      try {
        const { data, error } = await supabase.functions.invoke("livekit-token", {
          body: { roomId: room.id },
        });
        if (error) throw error;
        if (!data?.token) {
          throw new Error("No token returned: " + JSON.stringify(data));
        }
        if (!data?.url) {
          throw new Error("No LiveKit url returned (check LIVEKIT_URL secret)");
        }
        if (cancelled) return;

        setIsHost(data.isHost);
        hostRef.current = data.isHost;

        const refresh = () => {
          const n = lk.remoteParticipants.size;
          setCount(data.isHost ? n : Math.max(n - 1, 0));
          refreshPeople();
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

        // Speaking indicator and mute state for everyone on stage
        lk.on(RoomEvent.ActiveSpeakersChanged, refreshPeople);
        lk.on(RoomEvent.TrackMuted, refreshPeople);
        lk.on(RoomEvent.TrackUnmuted, refreshPeople);
        lk.on(RoomEvent.LocalTrackPublished, refreshPeople);
        lk.on(RoomEvent.LocalTrackUnpublished, refreshPeople);
        lk.on(RoomEvent.TrackPublished, refreshPeople);
        lk.on(RoomEvent.TrackUnpublished, refreshPeople);

        // When the host approves or removes this person as a speaker
        lk.on(RoomEvent.ParticipantPermissionsChanged, async () => {
          refreshPeople();
          if (hostRef.current) return;
          const can = !!lk.localParticipant.permissions?.canPublish;
          setIsSpeaker(can);
          try {
            await lk.localParticipant.setMicrophoneEnabled(can);
            setMicOn(can);
          } catch {
            setMicFailed(true);
            setMicOn(false);
          }
          refreshPeople();
        });

        await lk.connect(data.url, data.token);

        // Not fatal: some phones block this until the user taps the screen
        try {
          await lk.startAudio();
        } catch (e) {
          console.error("startAudio failed", e);
        }

        if (data.isHost) {
          try {
            await lk.localParticipant.setMicrophoneEnabled(true);
            setMicOn(true);
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
      } catch (e) {
        console.error("Radio room error", e);
        const msg = await explain(e);
        if (!cancelled) {
          setErrMsg(msg);
          setStatus("error");
        }
      }
    })();

    return () => {
      cancelled = true;
      if (heartbeat) clearInterval(heartbeat);
      window.removeEventListener("pagehide", closeIfHost);
      closeIfHost();

      // Remove this person's hand or speaker spot when they leave
      if (!hostRef.current && userIdRef.current) {
        supabase
          .from("radio_hands")
          .delete()
          .eq("room_id", room.id)
          .eq("user_id", userIdRef.current)
          .then(() => {});
      }

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

  const toggleMic = async () => {
    const lk = lkRef.current;
    if (!lk) return;
    const next = !micOn;
    try {
      setMicFailed(false);
      await lk.localParticipant.setMicrophoneEnabled(next);
      setMicOn(next);
    } catch {
      setMicFailed(true);
    }
  };

  const raiseHand = async () => {
    if (!user) return;
    await supabase.from("radio_hands").insert({
      room_id: room.id,
      user_id: user.id,
      username: profile?.username || "",
      status: "raised",
    });
    loadHands();
  };

  const lowerHand = async () => {
    if (!user) return;
    await supabase
      .from("radio_hands")
      .delete()
      .eq("room_id", room.id)
      .eq("user_id", user.id);
    loadHands();
  };

  // Host: allow or remove a speaker. A speaker can also step down themselves (allow = false).
  const setSpeaker = async (userId: string, allow: boolean) => {
    await supabase.functions.invoke("livekit-speaker", {
      body: { roomId: room.id, userId, allow },
    });
    loadHands();
  };

  const declineHand = async (handId: string) => {
    await supabase.from("radio_hands").delete().eq("id", handId);
    loadHands();
  };

  const requests = hands.filter((h) => h.status === "raised");
  const speakers = hands.filter((h) => h.status === "speaking");
  const myHand = hands.find((h) => h.user_id === user?.id);

  return (
    <div style={{ padding: 16, maxWidth: 480, margin: "0 auto" }}>
      <h2 style={{ marginBottom: 4 }}>{room.title}</h2>

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
            🔴 {t("radio.liveNow")} · {count} {t("radio.listeners")}
          </p>
          {isHost && <p>🎙️ {t("radio.youAreHost")}</p>}
          {!isHost && isSpeaker && <p>🎙️ {t("radio.youAreSpeaker")}</p>}
          {micFailed && <p style={{ color: "#dc2626" }}>{t("radio.micError")}</p>}
        </>
      )}

      <div ref={audioBox} />

      {!ended && status === "live" && (
        <div style={{ marginTop: 12 }}>
          {/* Host and speakers can mute or unmute */}
          {(isHost || isSpeaker) && (
            <button onClick={toggleMic} style={btn(micOn ? "#6b7280" : "#16a34a")}>
              {micOn ? t("radio.mute") : t("radio.unmute")}
            </button>
          )}

          {/* Listener controls */}
          {!isHost && !isSpeaker && (
            <>
              {myHand ? (
                <div>
                  <p>✋ {t("radio.handWaiting")}</p>
                  <button onClick={lowerHand} style={btn("#6b7280")}>
                    {t("radio.lowerHand")}
                  </button>
                </div>
              ) : (
                <button onClick={raiseHand} style={btn("#2563eb")}>
                  ✋ {t("radio.raiseHand")}
                </button>
              )}
            </>
          )}

          {!isHost && isSpeaker && (
            <button
              onClick={() => user && setSpeaker(user.id, false)}
              style={{ ...btn("#6b7280"), marginLeft: 8 }}
            >
              {t("radio.stepDown")}
            </button>
          )}

          {/* Rikodin murya (host kaɗai) */}
          {isHost && <RadioRecorder lk={lkRef.current} />}
        </div>
      )}

      {/* People on stage (host + speakers) with live speaking indicator */}
      {!ended && status === "live" && people.length > 0 && (
        <div style={{ marginTop: 20 }}>
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
        </div>
      )}

      {/* Host panel: requests and speakers on stage */}
      {isHost && !ended && status === "live" && (
        <div style={{ marginTop: 20 }}>
          <h3>✋ {t("radio.requests")}</h3>
          {requests.length === 0 ? (
            <p>{t("radio.noRequests")}</p>
          ) : (
            requests.map((h) => (
              <div
                key={h.id}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  padding: 10,
                  border: "1px solid #e5e7eb",
                  borderRadius: 10,
                  marginBottom: 8,
                }}
              >
                <span>@{h.username || "user"}</span>
                <span style={{ display: "flex", gap: 6 }}>
                  <button
                    onClick={() => setSpeaker(h.user_id, true)}
                    style={smallBtn("#16a34a")}
                  >
                    {t("radio.approve")}
                  </button>
                  <button onClick={() => declineHand(h.id)} style={smallBtn("#6b7280")}>
                    {t("radio.decline")}
                  </button>
                </span>
              </div>
            ))
          )}

          {speakers.length > 0 && (
            <>
              <h3 style={{ marginTop: 16 }}>🎙️ {t("radio.onStage")}</h3>
              {speakers.map((h) => (
                <div
                  key={h.id}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    padding: 10,
                    border: "1px solid #e5e7eb",
                    borderRadius: 10,
                    marginBottom: 8,
                  }}
                >
                  <span>@{h.username || "user"}</span>
                  <button
                    onClick={() => setSpeaker(h.user_id, false)}
                    style={smallBtn("#dc2626")}
                  >
                    {t("radio.removeSpeaker")}
                  </button>
                </div>
              ))}
            </>
          )}
        </div>
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

export default function Radio() {
  const t = useT();
  const [rooms, setRooms] = useState<RoomRow[]>([]);
  const [title, setTitle] = useState("");
  const [active, setActive] = useState<RoomRow | null>(null);
  const [failed, setFailed] = useState(false);
  const [tab, setTab] = useState<"radio" | "open">("radio");

  const loadRooms = async () => {
    const cutoff = new Date(Date.now() - STALE_MS).toISOString();
    const { data } = await supabase
      .from("radio_rooms")
      .select("id, title, host_id, created_at")
      .eq("is_live", true)
      .eq("is_open", false)
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

  const tabs = (
    <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
      <button
        onClick={() => setTab("radio")}
        style={btn(tab === "radio" ? "#16a34a" : "#374151")}
      >
        📻 Radio
      </button>
      <button
        onClick={() => setTab("open")}
        style={btn(tab === "open" ? "#16a34a" : "#374151")}
      >
        🎤 {t("open.tab")}
      </button>
    </div>
  );

  if (tab === "open") {
    return (
      <div style={{ padding: 16, maxWidth: 480, margin: "0 auto" }}>
        {tabs}
        <OpenTalk />
      </div>
    );
  }

  return (
    <div style={{ padding: 16, maxWidth: 480, margin: "0 auto" }}>
      {tabs}
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
            background: "#1f2937",
            color: "#ffffff",
            WebkitTextFillColor: "#ffffff",
            caretColor: "#ffffff",
            fontSize: 16,
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

      <RecordingsList />
    </div>
  );
  }
