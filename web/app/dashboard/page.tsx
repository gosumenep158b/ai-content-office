"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
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

export default function DashboardPage() {
  const router = useRouter();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({ title: "", description: "", assignee: "dika", priority: "medium", deadline: "" });
  const [notice, setNotice] = useState<string | null>(null);

  const fetchTasks = useCallback(async () => {
    try {
      const res = await fetch("/api/tasks");
      if (!res.ok) return;
      const json = await res.json();
      if (Array.isArray(json?.data)) setTasks(json.data);
    } catch (e) { console.error(e); }
  }, []);

  useEffect(() => { fetchTasks(); }, [fetchTasks]);

  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title.trim()) return;
    setLoading(true);
    setNotice(null);
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
      setNotice("Tugas berhasil dibuat ✓");
    } catch (err) {
      setNotice(err instanceof Error ? err.message : "Terjadi kesalahan");
    } finally {
      setLoading(false);
    }
  };

  const filtered = tasks.filter((t) =>
    t.title.toLowerCase().includes(search.toLowerCase()) ||
    (t.description ?? "").toLowerCase().includes(search.toLowerCase()));

  const fmtDate = (d: string | null) => d
    ? new Date(d).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" })
    : "—";

  return (
    <div style={{ maxWidth: 880, margin: "0 auto", padding: "28px 20px 60px" }}>
      {/* Top nav */}
      <header style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo-mark.svg" alt="" style={{ width: 30, height: 30 }} />
          <strong style={{ color: "var(--navy-800)" }}>AICO</strong>
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          <a className="btn btn-ghost" href="/tasks">Tugas</a>
          <a className="btn btn-ghost" href="/research">Riset</a>
        </div>
      </header>

      {/* Hero */}
      <section className="page-hero">
        <span className="eyebrow" style={{ color: "var(--red-400)" }}>Ruang kerja harian</span>
        <h1 className="h-page" style={{ marginTop: 8 }}>Selamat datang kembali 👋</h1>
        <p style={{ color: "rgba(255,255,255,.75)", marginTop: 6, fontSize: 15 }}>
          {tasks.length} tugas terdaftar &middot; review harian pukul 14.00 WIB
        </p>
      </section>

      {/* Create form */}
      <section className="surface-card" style={{ padding: 22, marginTop: 22 }}>
        <div className="eyebrow">Tugas baru</div>
        <h2 className="h-section" style={{ marginTop: 8, marginBottom: 14 }}>Buat tugas untuk tim agen</h2>
        {notice && (
          <div role="status" style={{ background: "#E7F6EC", border: "1px solid #B7E2C3", color: "#15803D", borderRadius: 10, padding: "9px 14px", fontSize: 14, marginBottom: 12 }}>
            {notice}
          </div>
        )}
        <form onSubmit={handleCreateTask} className="stack-12">
          <div>
            <label className="field-label" htmlFor="t-title">Judul tugas</label>
            <input id="t-title" className="input" placeholder="Contoh: Riset tren konten pendidikan 24 jam"
              value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required />
          </div>
          <div>
            <label className="field-label" htmlFor="t-desc">Deskripsi</label>
            <input id="t-desc" className="input" placeholder="Detail singkat tujuan tugas (opsional)"
              value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          </div>
          <div className="grid-form">
            <div>
              <label className="field-label" htmlFor="t-agent">Penanggung jawab</label>
              <select id="t-agent" className="input" value={form.assignee} onChange={(e) => setForm({ ...form, assignee: e.target.value })}>
                <option value="dika">Dika — Manajer</option>
                <option value="kinan">Kinan — Periset</option>
                <option value="dava">Dava — Strategis Konten</option>
                <option value="yanti">Yanti — Produser Video</option>
                <option value="anton">Anton — Penerbit</option>
              </select>
            </div>
            <div>
              <label className="field-label" htmlFor="t-prio">Prioritas</label>
              <select id="t-prio" className="input" value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value })}>
                <option value="low">Rendah</option>
                <option value="medium">Sedang</option>
                <option value="high">Tinggi</option>
                <option value="urgent">Darurat</option>
              </select>
            </div>
            <div>
              <label className="field-label" htmlFor="t-due">Tenggat</label>
              <input id="t-due" type="date" className="input" value={form.deadline} onChange={(e) => setForm({ ...form, deadline: e.target.value })} />
            </div>
            <div style={{ display: "flex", alignItems: "flex-end" }}>
              <button type="submit" disabled={loading} className="btn btn-primary" style={{ width: "100%" }}>
                {loading ? "Menyimpan…" : "Buat Tugas"}
              </button>
            </div>
          </div>
        </form>
      </section>

      {/* Task list */}
      <section className="surface-card" style={{ padding: 22, marginTop: 22 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10, marginBottom: 14 }}>
          <div>
            <div className="eyebrow">Aktivitas</div>
            <h2 className="h-section" style={{ marginTop: 6 }}>Daftar Tugas <span className="text-muted" style={{ fontWeight: 500 }}>({tasks.length})</span></h2>
          </div>
          <input className="input" style={{ maxWidth: 260 }} placeholder="Cari tugas…"
            value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>

        {filtered.length === 0 ? (
          <div className="empty-state">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/empty-tasks.svg" alt="" />
            <p style={{ fontWeight: 600, color: "var(--ink)" }}>Belum ada tugas yang cocok</p>
            <p style={{ fontSize: 14 }}>Buat tugas pertama untuk tim agen di form di atas.</p>
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
