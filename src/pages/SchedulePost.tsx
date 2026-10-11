import { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "../lib/supabase"; // canza hanyar idan ta bambanta

type ScheduledPost = {
  id: string;
  content: string;
  scheduled_at: string;
  media_urls: string[];
  media_type: "image" | "video" | null;
};

const BUCKET = "post-media";
const MAX_SIZE = 50 * 1024 * 1024; // 50 MB
const MAX_IMAGES = 6;

const t = {
  title: "Tsara lokacin post",
  placeholder: "Rubuta post ɗinka a nan...",
  addMedia: "Ƙara hoto ko bidiyo",
  removeMedia: "Cire",
  mediaHint: "Hotuna har guda 6, ko bidiyo guda ɗaya (har 50 MB).",
  date: "Kwanan wata",
  time: "Lokaci",
  schedule: "Tsara post",
  scheduling: "Ana tsarawa...",
  uploading: "Ana loda fayiloli...",
  listTitle: "Posts ɗin da aka tsara",
  empty: "Babu post da aka tsara tukuna.",
  cancel: "Soke",
  successMsg: "An tsara post ɗin cikin nasara!",
  cancelledMsg: "An soke post ɗin.",
  errEmpty: "Rubuta wani abu ko ka ƙara hoto/bidiyo.",
  errPast: "Lokaci dole ne ya zama nan gaba.",
  errLogin: "Ka shiga (login) tukuna.",
  errGeneric: "Wani abu ya faru. Sake gwadawa.",
  errTooBig: "Fayil ɗin ya wuce 50 MB.",
  errType: "Ana iya ɗaukar hoto ko bidiyo kawai.",
  errMix: "Ba za a haɗa hoto da bidiyo a post ɗaya ba.",
  errOneVideo: "Bidiyo ɗaya kawai ake iya ƙarawa.",
  errMaxImages: "Hotuna har guda 6 kawai.",
  scheduledFor: "Za a wallafa:",
};

// Daga cikakken URL, a fitar da hanyar fayil a cikin bucket
const pathFromUrl = (url: string): string | null => {
  const marker = `/${BUCKET}/`;
  const i = url.indexOf(marker);
  return i === -1 ? null : decodeURIComponent(url.slice(i + marker.length));
};

export default function SchedulePost() {
  const [content, setContent] = useState("");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [posts, setPosts] = useState<ScheduledPost[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Samfurin kallo (preview) na fayilolin da aka zaɓa
  const previews = useMemo(
    () =>
      files.map((f) => ({
        url: URL.createObjectURL(f),
        isVideo: f.type.startsWith("video/"),
      })),
    [files]
  );

  useEffect(() => {
    return () => previews.forEach((p) => URL.revokeObjectURL(p.url));
  }, [previews]);

  const loadScheduled = async () => {
    const { data: userData } = await supabase.auth.getUser();
    const user = userData.user;
    if (!user) return;

    const { data, error: fetchError } = await supabase
      .from("posts")
      .select("id, content, scheduled_at, media_urls, media_type")
      .eq("user_id", user.id)
      .eq("status", "scheduled")
      .order("scheduled_at", { ascending: true });

    if (!fetchError && data) setPosts(data as ScheduledPost[]);
  };

  useEffect(() => {
    loadScheduled();
  }, []);

  const handleFilesPicked = (e: React.ChangeEvent<HTMLInputElement>) => {
    setError(null);
    const picked = Array.from(e.target.files ?? []);
    e.target.value = ""; // don a iya zaɓar fayil iri ɗaya kuma
    if (picked.length === 0) return;

    for (const f of picked) {
      const isImage = f.type.startsWith("image/");
      const isVideo = f.type.startsWith("video/");
      if (!isImage && !isVideo) {
        setError(t.errType);
        return;
      }
      if (f.size > MAX_SIZE) {
        setError(t.errTooBig);
        return;
      }
    }

    const combined = [...files, ...picked];
    const hasVideo = combined.some((f) => f.type.startsWith("video/"));
    const hasImage = combined.some((f) => f.type.startsWith("image/"));

    if (hasVideo && hasImage) {
      setError(t.errMix);
      return;
    }
    if (hasVideo && combined.length > 1) {
      setError(t.errOneVideo);
      return;
    }
    if (hasImage && combined.length > MAX_IMAGES) {
      setError(t.errMaxImages);
      return;
    }

    setFiles(combined);
  };

  const removeFile = (index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSchedule = async () => {
    setError(null);
    setMessage(null);

    if (!content.trim() && files.length === 0) {
      setError(t.errEmpty);
      return;
    }

    const when = new Date(`${date}T${time}`);
    if (!date || !time || isNaN(when.getTime()) || when.getTime() <= Date.now()) {
      setError(t.errPast);
      return;
    }

    setLoading(true);
    const uploadedPaths: string[] = [];

    try {
      const { data: userData } = await supabase.auth.getUser();
      const user = userData.user;
      if (!user) {
        setError(t.errLogin);
        return;
      }

      // 1) Loda fayiloli
      const mediaUrls: string[] = [];
      for (const file of files) {
        const ext = (file.name.split(".").pop() || "bin").toLowerCase();
        const path = `${user.id}/${Date.now()}-${Math.random()
          .toString(36)
          .slice(2, 8)}.${ext}`;

        const { error: upError } = await supabase.storage
          .from(BUCKET)
          .upload(path, file, { contentType: file.type, upsert: false });

        if (upError) throw upError;
        uploadedPaths.push(path);

        const { data: pub } = supabase.storage.from(BUCKET).getPublicUrl(path);
        mediaUrls.push(pub.publicUrl);
      }

      const mediaType: "image" | "video" | null =
        files.length === 0
          ? null
          : files[0].type.startsWith("video/")
          ? "video"
          : "image";

      // 2) Adana post ɗin
      const { error: insertError } = await supabase.from("posts").insert({
        user_id: user.id,
        content: content.trim(),
        status: "scheduled",
        scheduled_at: when.toISOString(),
        media_urls: mediaUrls,
        media_type: mediaType,
      });

      if (insertError) throw insertError;

      setContent("");
      setDate("");
      setTime("");
      setFiles([]);
      setMessage(t.successMsg);
      await loadScheduled();
    } catch (e) {
      // Idan an sami kuskure, a share fayilolin da aka riga aka loda
      if (uploadedPaths.length > 0) {
        await supabase.storage.from(BUCKET).remove(uploadedPaths);
      }
      setError(t.errGeneric);
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = async (post: ScheduledPost) => {
    setError(null);
    setMessage(null);

    const { error: deleteError } = await supabase
      .from("posts")
      .delete()
      .eq("id", post.id)
      .eq("status", "scheduled");

    if (deleteError) {
      setError(t.errGeneric);
      return;
    }

    // A share media ɗin daga storage
    const paths = (post.media_urls ?? [])
      .map(pathFromUrl)
      .filter((p): p is string => !!p);
    if (paths.length > 0) {
      await supabase.storage.from(BUCKET).remove(paths);
    }

    setMessage(t.cancelledMsg);
    setPosts((prev) => prev.filter((p) => p.id !== post.id));
  };

  return (
    <div style={{ maxWidth: 520, margin: "0 auto", padding: 16 }}>
      <h2>{t.title}</h2>

      <textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        placeholder={t.placeholder}
        rows={5}
        style={{ width: "100%", padding: 8, boxSizing: "border-box" }}
      />

      {/* Zaɓar hoto/bidiyo */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*,video/*"
        multiple
        onChange={handleFilesPicked}
        style={{ display: "none" }}
      />
      <button
        type="button"
        onClick={() => fileInputRef.current?.click()}
        disabled={loading}
        style={{ marginTop: 8, padding: "8px 12px" }}
      >
        📎 {t.addMedia}
      </button>
      <div>
        <small>{t.mediaHint}</small>
      </div>

      {previews.length > 0 && (
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: 8,
            marginTop: 8,
          }}
        >
          {previews.map((p, i) => (
            <div key={p.url} style={{ position: "relative" }}>
              {p.isVideo ? (
                <video
                  src={p.url}
                  controls
                  style={{ width: 160, height: 120, objectFit: "cover", borderRadius: 8 }}
                />
              ) : (
                <img
                  src={p.url}
                  alt=""
                  style={{ width: 100, height: 100, objectFit: "cover", borderRadius: 8 }}
                />
              )}
              <button
                type="button"
                onClick={() => removeFile(i)}
                disabled={loading}
                aria-label={t.removeMedia}
                style={{
                  position: "absolute",
                  top: 4,
                  right: 4,
                  borderRadius: "50%",
                  border: "none",
                  width: 24,
                  height: 24,
                  cursor: "pointer",
                }}
              >
                ✕
              </button>
            </div>
          ))}
        </div>
      )}

      <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
        <label style={{ flex: 1 }}>
          {t.date}
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            style={{ width: "100%", boxSizing: "border-box" }}
          />
        </label>
        <label style={{ flex: 1 }}>
          {t.time}
          <input
            type="time"
            value={time}
            onChange={(e) => setTime(e.target.value)}
            style={{ width: "100%", boxSizing: "border-box" }}
          />
        </label>
      </div>

      <button
        onClick={handleSchedule}
        disabled={loading}
        style={{ marginTop: 12, width: "100%", padding: 10 }}
      >
        {loading
          ? files.length > 0
            ? t.uploading
            : t.scheduling
          : t.schedule}
      </button>

      {message && <p style={{ color: "green" }}>{message}</p>}
      {error && <p style={{ color: "red" }}>{error}</p>}

      <h3 style={{ marginTop: 24 }}>{t.listTitle}</h3>
      {posts.length === 0 ? (
        <p>{t.empty}</p>
      ) : (
        <ul style={{ listStyle: "none", padding: 0 }}>
          {posts.map((p) => (
            <li
              key={p.id}
              style={{
                border: "1px solid #ddd",
                borderRadius: 8,
                padding: 10,
                marginBottom: 8,
              }}
            >
              {p.content && <div>{p.content}</div>}

              {p.media_urls?.length > 0 && (
                <div
                  style={{
                    display: "flex",
                    flexWrap: "wrap",
                    gap: 6,
                    margin: "6px 0",
                  }}
                >
                  {p.media_type === "video" ? (
                    <video
                      src={p.media_urls[0]}
                      controls
                      style={{ width: 200, borderRadius: 8 }}
                    />
                  ) : (
                    p.media_urls.map((u) => (
                      <img
                        key={u}
                        src={u}
                        alt=""
                        style={{
                          width: 80,
                          height: 80,
                          objectFit: "cover",
                          borderRadius: 8,
                        }}
                      />
                    ))
                  )}
                </div>
              )}

              <small>
                {t.scheduledFor}{" "}
                {new Date(p.scheduled_at).toLocaleString("ha-NG")}
              </small>
              <div>
                <button onClick={() => handleCancel(p)} style={{ marginTop: 6 }}>
                  {t.cancel}
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
