"use client";

import { useState, useEffect } from "react";
import { DIVISI, fmtWaktu } from "@/lib/office";

type Agent = {
  id: string; nama: string; role: string; status: string; deskripsi: string | null;
  stats: { total: number; selesai: number; aktif: number; progress: number };
  aktivitas: { t: string; teks: string; sumber: string }[];
  last_activity: string | null;
};
type Feed = { t: string; agent: string; teks: string };

const STATUS_LABEL: Record<string, { label: string; color: string }> = {
  bekerja: { label: "Sedang bekerja", color: "#15803D" },
  siaga: { label: "Siaga (ada tugas aktif)", color: "#B45309" },
  idle: { label: "Tidak ada tugas", color: "var(--muted)" },
};

export default function OfficePage() {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [feed, setFeed] = useState<Feed[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch("/api/office");
        const j = await res.json();
        if (Array.isArray(j?.data)) setAgents(j.data);
        if (Array.isArray(j?.feed)) setFeed(j.feed);
      } catch { /* ignore */ } finally { setLoading(false); }
    };
    load();
    const iv = setInterval(load, 30000);
    return () => clearInterval(iv);
  }, []);

  const bekerja = agents.filter((a) => a.status === "bekerja").length;

  return (
    <div style={{ maxWidth: 960, margin: "0 auto" }}>
      <section className="page-hero" style={{ padding: 24 }}>
        <span className="eyebrow" style={{ color: "var(--gold)" }}>Main Office</span>
        <h1 className="h-page" style={{ marginTop: 6 }}>Ruang kerja tim agen 🏢</h1>
        <p style={{ color: "rgba(255,255,255,.75)", marginTop: 6, fontSize: 15 }}>
          {agents.length} pekerja · {bekerja} sedang aktif · diperbarui otomatis tiap 30 detik
        </p>
      </section>

      <div className="office-grid" style={{ marginTop: 18 }}>
        {agents.map((a) => {
          const meta = Object.entries(DIVISI).find(([, d]) => d.nama.toLowerCase() === a.nama.toLowerCase())?.[1];
          const warna = meta?.warna ?? "var(--navy-700)";
          const emoji = meta?.emoji ?? "🤖";
          const st = STATUS_LABEL[a.status] ?? STATUS_LABEL.idle;
          return (
            <div key={a.id} className="surface-card surface-card--lift office-card" style={{ padding: 18 }}>
              <span className="office-status" style={{ background: st.color }} title={st.label} />
              <div className="office-avatar" style={{ background: warna }}>{a.nama.charAt(0)}</div>
              <div style={{ fontWeight: 800, marginTop: 10, fontSize: 16 }}>{emoji} {a.nama}</div>
              <div className="text-muted" style={{ fontSize: 12.5 }}>{a.role}</div>
              <div style={{ fontSize: 12, fontWeight: 700, color: st.color, marginTop: 6 }}>{st.label}</div>
              <div className="text-muted office-activity">
                {a.aktivitas[0]?.teks ? a.aktivitas[0].teks.slice(0, 110) : "Belum ada aktivitas 12 jam terakhir"}
              </div>
              <div className="progress-track" style={{ marginTop: 8 }}>
                <div className="progress-fill" style={{ width: `${a.stats.progress}%` }} />
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, marginTop: 6 }}>
                <span className="text-muted">{a.stats.selesai}/{a.stats.total} tugas selesai</span>
                <span className="text-muted">{a.stats.progress}%</span>
              </div>
              <a href={`/divisi/${a.nama.toLowerCase()}`} className="btn btn-ghost" style={{ width: "100%", marginTop: 12, fontSize: 13, textAlign: "center", display: "inline-block" }}>
                Buka dashboard divisi →
              </a>
            </div>
          );
        })}
      </div>

      <section className="surface-card" style={{ padding: 20, marginTop: 18 }}>
        <div className="eyebrow">Aktivitas kantor (12 jam terakhir)</div>
        <h2 className="h-section" style={{ marginTop: 6 }}>Timeline bersama</h2>
        {loading ? (
          <p className="text-muted" style={{ fontSize: 14 }}>Memuat…</p>
        ) : feed.length === 0 ? (
          <p className="text-muted" style={{ fontSize: 14 }}>Belum ada aktivitas — agen baru mulai bekerja saat ada tugas masuk.</p>
        ) : (
          <div style={{ marginTop: 8 }}>
            {feed.map((f, i) => (
              <div className="activity-item" key={i}>
                <div className="activity-time">{fmtWaktu(f.t)}</div>
                <div style={{ fontSize: 13.5, minWidth: 0 }}>
                  <strong style={{ textTransform: "capitalize" }}>{f.agent || "sistem"}</strong> — {f.teks || "memperbarui tugas"}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
