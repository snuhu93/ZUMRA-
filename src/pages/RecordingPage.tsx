import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { supabase } from "@/lib/supabaseClient";

type Rec = {
  id: string;
  title: string | null;
  file_url: string;
  duration: number;
  created_at: string;
};

const fmt = (s: number) =>
  `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;

// Public page: anyone with the link can listen, even without logging in
export default function RecordingPage() {
  const { id } = useParams();
  const [rec, setRec] = useState<Rec | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) {
      setLoading(false);
      return;
    }
    supabase
      .from("radio_recordings")
      .select("id, title, file_url, duration, created_at")
      .eq("id", id)
      .maybeSingle()
      .then(({ data }) => {
        setRec((data as Rec) || null);
        setLoading(false);
      });
  }, [id]);

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#f8fafc",
        display: "flex",
        justifyContent: "center",
        padding: 16,
      }}
    >
      <div style={{ width: "100%", maxWidth: 480, paddingTop: 32 }}>
        <h2 style={{ marginBottom: 4 }}>📻 Zumra Radio</h2>

        {loading ? (
          <p>...</p>
        ) : !rec ? (
          <p style={{ marginTop: 16 }}>
            An goge wannan recording ɗin ko babu shi. / This recording is no
            longer available.
          </p>
        ) : (
          <div style={{ marginTop: 16 }}>
            <p style={{ fontSize: 18, marginBottom: 4 }}>
              {rec.title || "Zumra Radio"}
            </p>
            <p style={{ color: "#6b7280", marginBottom: 12 }}>
              {fmt(rec.duration)} ·{" "}
              {new Date(rec.created_at).toLocaleDateString()}
            </p>
            <audio
              controls
              preload="none"
              src={rec.file_url}
              style={{ width: "100%" }}
            />
          </div>
        )}

        <Link
          to="/"
          style={{
            display: "block",
            textAlign: "center",
            marginTop: 28,
            background: "#16a34a",
            color: "#fff",
            borderRadius: 10,
            padding: "12px 16px",
            textDecoration: "none",
          }}
        >
          Buɗe Zumra / Open Zumra
        </Link>
      </div>
    </div>
  );
    }
