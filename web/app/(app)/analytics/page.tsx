"use client";

import { useState, useEffect, useCallback } from "react";

type Summary = {
  publication_id: string; title: string; platform: string; posted_at: string | null;
  views: number | null; likes: number | null; comments: number | null; shares: number | null;
  saves: number | null; growth_views: number; snapshots: number; url: string | null;
};
type Pub = { id: string; caption: string | null; akun: string | null; url: string | null; status: string | null };

export default function AnalyticsPage() {
  const [rows, setRows] = useState<Summary[]>([]);
  const [pubs, setPubs] = useState<Pub[]>([]);
  const [form, setForm] = useState({ publication_id: "", views: "", likes: "", comments: "", shares: "", saves: "" });
  const [msg, setMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const r = await fetch("/api/analytics");
      const j = await r.json();
      if (Array.isArray(j?.data)) setRows(j.data);
      if (Array.isArray(j?.publications)) setPubs(j.publications);
    } catch {} finally { setLoading(false); }
  }, []);
  useEffect(() => { load(); const iv = setInterval(load, 30000); return () => clearInterval(iv); }, [load]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.publication_id || !form.views) { setMsg("Pilih publikasi & isi views."); return; }
    const r = await fetch("/api/analytics", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        publication_id: form.publication_id,
        views: +form.views || 0, likes: +form.likes || 0, comments: +form.comments || 0,
        shares: +form.shares || 0, saves: +form.saves || 0, input_by: "owner",
      }),
    });
    if (r.ok) {
      setMsg("Snapshot tersimpan ✅");
      setForm({ publication_id: "", views: "", likes: "", comments: "", shares: "", saves: "" });
      load();
    } else setMsg("Gagal menyimpan.");
  };

  const totalViews = rows.reduce((a, r) => a + (r.views ?? 0), 0);
  const totalLikes = rows.reduce((a, r) => a + (r.likes ?? 0), 0);

  const Stat = ({ l, v, c }: { l: string; v: number | string; c?: string }) => (
    <div className="surface-card" style={{ padding: 16, flex: "1 1 130px" }}>
      <div className="text-muted" style={{ fontSize: 12.5 }}>{l}</div>
      <div style={{ fontSize: 26, fontWeight: 800, color: c ?? "var(--navy-800)", marginTop: 2 }}>{v}</div>
    </div>
  );

  return (
    <div style={{ maxWidth: 960, margin: "0 auto" }}>
      <section className="page-hero" style={{ padding: 24 }}>
        <span className="eyebrow" style={{ color: "var(--gold)" }}>Analytics</span>
        <h1 className="h-page" style={{ marginTop: 6 }}>Performa Konten 📊</h1>
        <p style={{ color: "rgba(255,255,255,.75)", marginTop: 6, fontSize: 15 }}>
          View, like, komentar &amp; share semua konten yang sudah dipublikasikan.
        </p>
      </section>

      <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginTop: 18 }}>
        <Stat l="Publikasi terpantau" v={rows.length} />
        <Stat l="Total views" v={totalViews.toLocaleString("id-ID")} c="var(--red-600)" />
        <Stat l="Total likes" v={totalLikes.toLocaleString("id-ID")} c="#B45309" />
      </div>

      <section className="surface-card" style={{ padding: 20, marginTop: 14 }}>
        <div className="eyebrow">Per publikasi</div>
        {loading ? <p className="text-muted" style={{ fontSize: 14 }}>Memuat…</p> : rows.length === 0 ? (
          <p className="text-muted" style={{ fontSize: 14, marginTop: 10 }}>
            Belum ada data — tambahkan snapshot pertama lewat form di bawah setelah konten di-upload.
          </p>
        ) : (
          <div className="stack-12" style={{ marginTop: 10 }}>
            {rows.map((r) => (
              <div key={r.publication_id} className="row-card">
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontWeight: 700, fontSize: 14.5 }}>{r.title}</div>
                  <div className="text-muted" style={{ fontSize: 12.5 }}>{r.platform} · {r.snapshots} snapshot</div>
                  <div style={{ display: "flex", gap: 10, marginTop: 8, flexWrap: "wrap", fontSize: 13 }}>
                    <span className="badge badge-medium">👁 {((r.views ?? 0)).toLocaleString("id-ID")} views</span>
                    <span className="badge badge-low">❤️ {((r.likes ?? 0)).toLocaleString("id-ID")}</span>
                    <span className="badge" style={{ background: "#EEF2F7", color: "var(--navy-700)" }}>💬 {r.comments ?? 0}</span>
                    <span className="badge" style={{ background: "#EEF2F7", color: "var(--navy-700)" }}>🔁 {r.shares ?? 0}</span>
                    {r.url && <a href={r.url} target="_blank" rel="noreferrer" style={{ fontSize: 12.5, color: "var(--red-600)" }}>buka posting ↗</a>}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="surface-card" style={{ padding: 20, marginTop: 14 }}>
        <div className="eyebrow">Input statistik manual</div>
        <h2 className="h-section" style={{ marginTop: 6, marginBottom: 12 }}>Catat performa postingan</h2>
        {msg && <div role="status" style={{ background: "#E7F6EC", border: "1px solid #B7E2C3", color: "#15803D", borderRadius: 10, padding: "9px 14px", fontSize: 14, marginBottom: 12 }}>{msg}</div>}
        <form onSubmit={submit} className="stack-12">
          <div>
            <label className="field-label" htmlFor="a-pub">Publikasi</label>
            <select id="a-pub" className="input" value={form.publication_id} onChange={(e) => setForm({ ...form, publication_id: e.target.value })}>
              <option value="">— pilih publikasi —</option>
              {pubs.map((p) => <option key={p.id} value={p.id}>{(p.caption ?? "(tanpa caption)").slice(0, 50)} — {p.akun ?? "?"}</option>)}
            </select>
          </div>
          <div className="grid-form">
            {(["views", "likes", "comments", "shares", "saves"] as const).map((f) => (
              <div key={f}>
                <label className="field-label" htmlFor={"a-" + f}>{f.charAt(0).toUpperCase() + f.slice(1)}</label>
                <input id={"a-" + f} type="number" min="0" className="input" value={(form as any)[f]}
                  onChange={(e) => setForm({ ...form, [f]: e.target.value })} />
              </div>
            ))}
            <div style={{ display: "flex", alignItems: "flex-end" }}>
              <button type="submit" className="btn btn-primary" style={{ width: "100%" }}>Simpan</button>
            </div>
          </div>
        </form>
        <p className="text-muted" style={{ fontSize: 12.5, marginTop: 10 }}>
          Tips: input setiap 1–3 hari setelah posting — pertumbuhan antar snapshot otomatis dihitung.
        </p>
      </section>
    </div>
  );
}
