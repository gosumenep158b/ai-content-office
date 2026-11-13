"use client";

import { useState, useEffect, useCallback } from "react";
// eslint-disable-next-line @next/next/no-img-element

type Task = {
  id: string;
  title: string;
  description: string | null;
  priority: "low" | "medium" | "high" | "urgent";
  status: string;
  due_at: string | null;
};

const PRIO_LABEL: Record<string, string> = { low: "Rendah", medium: "Sedang", high: "Tinggi", urgent: "Darurat" };
const STATUS_ID: Record<string, string> = {
  Backlog: "Antrean", Assigned: "Ditugaskan", "In Progress": "Dikerjakan",
  "Waiting Input": "Menunggu Input", "In Review": "Ditinjau", Revision: "Revisi",
  Completed: "Selesai", Blocked: "Terhambat", Cancelled: "Dibatalkan",
};

export default function TasksPage() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("semua");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({ title: "", description: "", assignee: "dika", priority: "medium", deadline: "" });

  const fetchTasks = useCallback(async () => {
    try {
      const res = await fetch("/api/tasks");
      if (!res.ok) return;
      const json = await res.json();
      if (Array.isArray(json?.data)) setTasks(json.data);
    } catch (e) { console.error(e); }
  }, []);

  useEffect(() => { fetchTasks(); }, [fetchTasks]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, assigned_agent_id: form.assignee, due_at: form.deadline || null }),
        credentials: "include",
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Gagal membuat tugas");
      if (json?.data) setTasks((t) => [json.data, ...t]);
      setForm({ title: "", description: "", assignee: "dika", priority: "medium", deadline: "" });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Terjadi kesalahan");
    } finally {
      setLoading(false);
    }
  };

  const filtered = tasks.filter((t) => {
    const q = search.toLowerCase();
    const matchQ = t.title.toLowerCase().includes(q) || (t.description ?? "").toLowerCase().includes(q);
    const matchF = filter === "semua" || t.status === filter;
    return matchQ && matchF;
  });

  const fmtDate = (d: string | null) => d
    ? new Date(d).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" })
    : "—";

  return (
    <div style={{ maxWidth: 880, margin: "0 auto", padding: "28px 20px 60px" }}>
      <header style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo-mark.svg" alt="" style={{ width: 30, height: 30 }} />
          <strong style={{ color: "var(--navy-800)" }}>AICO</strong>
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          <a className="btn btn-ghost" href="/dashboard">Dasbor</a>
          <a className="btn btn-ghost" href="/research">Riset</a>
        </div>
      </header>

      <section className="page-hero">
        <span className="eyebrow" style={{ color: "var(--red-400)" }}>Manajemen tugas</span>
        <h1 className="h-page" style={{ marginTop: 8 }}>Tugas Tim Agen</h1>
        <p style={{ color: "rgba(255,255,255,.75)", marginTop: 6, fontSize: 15 }}>
          Bagikan pekerjaan, pantau tenggat, dan kirim hasil untuk ditinjau.
        </p>
      </section>

      <section className="surface-card" style={{ padding: 22, marginTop: 22 }}>
        <div className="eyebrow">Tugas baru</div>
        <h2 className="h-section" style={{ marginTop: 8, marginBottom: 14 }}>Buat tugas</h2>
        {error && (
          <div role="alert" style={{ background: "#FDE8E8", border: "1px solid #F5B5B5", color: "#B91C1C", borderRadius: 10, padding: "9px 14px", fontSize: 14, marginBottom: 12 }}>
            {error}
          </div>
        )}
        <form onSubmit={handleCreate} className="stack-12">
          <div>
            <label className="field-label" htmlFor="tk-title">Judul tugas</label>
            <input id="tk-title" className="input" placeholder="Judul yang jelas & spesifik"
              value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required />
          </div>
          <div>
            <label className="field-label" htmlFor="tk-desc">Deskripsi</label>
            <input id="tk-desc" className="input" placeholder="Detail singkat (opsional)"
              value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          </div>
          <div className="grid-form">
            <div>
              <label className="field-label" htmlFor="tk-agent">Penanggung jawab</label>
              <select id="tk-agent" className="input" value={form.assignee} onChange={(e) => setForm({ ...form, assignee: e.target.value })}>
                <option value="dika">Dika — Manajer</option>
                <option value="kinan">Kinan — Periset</option>
                <option value="dava">Dava — Strategis Konten</option>
                <option value="yanti">Yanti — Produser Video</option>
                <option value="anton">Anton — Penerbit</option>
              </select>
            </div>
            <div>
              <label className="field-label" htmlFor="tk-prio">Prioritas</label>
              <select id="tk-prio" className="input" value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value })}>
                <option value="low">Rendah</option>
                <option value="medium">Sedang</option>
                <option value="high">Tinggi</option>
                <option value="urgent">Darurat</option>
              </select>
            </div>
            <div>
              <label className="field-label" htmlFor="tk-due">Tenggat</label>
              <input id="tk-due" type="date" className="input" value={form.deadline} onChange={(e) => setForm({ ...form, deadline: e.target.value })} />
            </div>
            <div style={{ display: "flex", alignItems: "flex-end" }}>
              <button type="submit" disabled={loading} className="btn btn-primary" style={{ width: "100%" }}>
                {loading ? "Menyimpan…" : "Buat Tugas"}
              </button>
            </div>
          </div>
        </form>
      </section>

      <section className="surface-card" style={{ padding: 22, marginTop: 22 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10, marginBottom: 14 }}>
          <div>
            <div className="eyebrow">Aktivitas</div>
            <h2 className="h-section" style={{ marginTop: 6 }}>Semua Tugas <span className="text-muted" style={{ fontWeight: 500 }}>({filtered.length})</span></h2>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <select className="input" style={{ maxWidth: 160 }} value={filter} onChange={(e) => setFilter(e.target.value)}>
              <option value="semua">Semua status</option>
              {Object.entries(STATUS_ID).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
            <input className="input" style={{ maxWidth: 200 }} placeholder="Cari tugas…"
              value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
        </div>

        {filtered.length === 0 ? (
          <div className="empty-state">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/empty-tasks.svg" alt="" />
            <p style={{ fontWeight: 600, color: "var(--ink)" }}>Tidak ada tugas di sini</p>
            <p style={{ fontSize: 14 }}>Ubah filter/pencarian, atau buat tugas baru di atas.</p>
          </div>
        ) : (
          <div className="stack-12">
            {filtered.map((t) => (
              <div key={t.id} className="row-card">
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontWeight: 700, fontSize: 15 }}>{t.title}</div>
                  {t.description && <div className="text-muted" style={{ fontSize: 13.5, marginTop: 2 }}>{t.description}</div>}
                  <div style={{ display: "flex", gap: 8, marginTop: 8, flexWrap: "wrap", alignItems: "center" }}>
                    <span className={`badge badge-${t.priority} badge-dot`}>{PRIO_LABEL[t.priority] ?? t.priority}</span>
                    <span className="badge" style={{ background: "#EEF2F7", color: "var(--navy-700)" }}>{STATUS_ID[t.status] ?? t.status}</span>
                    <span className="text-muted" style={{ fontSize: 12.5 }}>Tenggat: {fmtDate(t.due_at)}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
