"use client";

import { useParams } from "next/navigation";
import { useState, useEffect, useCallback } from "react";
import { DIVISI, STATUS_ID, fmtWaktu } from "@/lib/office";

type Task = {
  id: string; title: string; description: string | null; status: string;
  priority: string; due_at: string | null; updated_at: string; created_at: string;
};
type Msg = { payload: string; created_at: string; sender: string };

export default function DivisiPage() {
  const params = useParams<{ key: string }>();
  const key = params.key;
  const div = DIVISI[key];
  const [tasks, setTasks] = useState<Task[]>([]);
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [r1, r2] = await Promise.all([
        fetch("/api/tasks"),
        fetch(`/api/office`),
      ]);
      const j1 = await r1.json();
      const all: any[] = Array.isArray(j1?.data) ? j1.data : [];
      setTasks(all.filter((t) => t.assigned_agent?.nama?.toLowerCase() === key));
      const j2 = await r2.json();
      const mine = (j2?.data as any[] | undefined)?.find((a) => a.nama.toLowerCase() === key);
      setMsgs((mine?.aktivitas ?? []) as any);
    } catch { /* ignore */ } finally { setLoading(false); }
  }, [key]);

  useEffect(() => { if (div) load(); const iv = setInterval(load, 30000); return () => clearInterval(iv); }, [div, load]);

  if (!div) return <div className="surface-card" style={{ padding: 24 }}>Divisi tidak ditemukan.</div>;

  const done = tasks.filter((t) => ["Completed", "In Review"].includes(t.status));
  const wip = tasks.filter((t) => ["In Progress", "Assigned", "Revision", "Waiting Input", "Blocked"].includes(t.status));
  const backlog = tasks.filter((t) => ["Backlog"].includes(t.status));
  const progress = tasks.length ? Math.round(((done.length + wip.filter(t=>t.status==='Waiting Input').length*0.5) / tasks.length) * 100) : 0;

  const Stat = ({ label, value, warna }: { label: string; value: number | string; warna?: string }) => (
    <div className="surface-card" style={{ padding: 16, flex: "1 1 120px" }}>
      <div className="text-muted" style={{ fontSize: 12.5 }}>{label}</div>
      <div style={{ fontSize: 26, fontWeight: 800, color: warna ?? "var(--navy-800)", marginTop: 2 }}>{value}</div>
    </div>
  );

  const TaskRow = ({ t }: { t: Task }) => (
    <div className="row-card">
      <div style={{ minWidth: 0 }}>
        <div style={{ fontWeight: 700, fontSize: 14.5 }}>{t.title}</div>
        <div style={{ display: "flex", gap: 8, marginTop: 6, flexWrap: "wrap", alignItems: "center" }}>
          <span className="badge" style={{ background: "#EEF2F7", color: "var(--navy-700)" }}>{STATUS_ID[t.status] ?? t.status}</span>
          <span className={`badge badge-${t.priority} badge-dot`}>{t.priority}</span>
          <span className="text-muted" style={{ fontSize: 12 }}>Update: {fmtWaktu(t.updated_at)}</span>
        </div>
      </div>
    </div>
  );

  return (
    <div style={{ maxWidth: 960, margin: "0 auto" }}>
      <section className="page-hero" style={{ padding: 24 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <div style={{ width: 56, height: 56, borderRadius: 16, background: "rgba(255,255,255,.12)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 28 }}>{div.emoji}</div>
          <div>
            <span className="eyebrow" style={{ color: "var(--gold)" }}>Divisi</span>
            <h1 className="h-page">{div.nama} — {div.role}</h1>
            <p style={{ color: "rgba(255,255,255,.75)", fontSize: 14, marginTop: 4 }}>
              {done.length} selesai · {wip.length} dikerjakan · {backlog.length} antre
            </p>
          </div>
        </div>
      </section>

      <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginTop: 18 }}>
        <Stat label="Total tugas" value={tasks.length} />
        <Stat label="Selesai / Review" value={done.length} warna="#15803D" />
        <Stat label="Sedang dikerjakan" value={wip.length} warna="#B45309" />
        <Stat label="Progress" value={`${progress}%`} warna="var(--red-600)" />
      </div>

      <div className="surface-card" style={{ padding: 18, marginTop: 14 }}>
        <div className="eyebrow">Progress divisi</div>
        <div className="progress-track" style={{ marginTop: 10 }}>
          <div className="progress-fill" style={{ width: `${progress}%` }} />
        </div>
      </div>

      <section className="surface-card" style={{ padding: 20, marginTop: 14 }}>
        <div className="eyebrow">Log aktivitas agen</div>
        {msgs.length === 0 ? (
          <p className="text-muted" style={{ fontSize: 14, marginTop: 10 }}>Belum ada aktivitas dalam 12 jam terakhir.</p>
        ) : (
          <div style={{ marginTop: 6 }}>
            {msgs.map((m, i) => {
              let teks = ""; try { const p = JSON.parse(m.payload); teks = p.catatan || (p.hasil ? String(p.hasil).slice(0, 160) : ""); } catch { teks = String(m.payload).slice(0, 160); }
              return (
                <div className="activity-item" key={i}>
                  <div className="activity-time">{fmtWaktu((m as any).t ?? m.created_at)}</div>
                  <div style={{ fontSize: 13.5, minWidth: 0 }}>{teks || "Update tugas"}</div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {([["Sedang dikerjakan", wip], ["Menunggu review", done.filter(t=>t.status==="In Review")], ["Selesai", done.filter(t=>t.status==="Completed")], ["Antrean", backlog]] as const).map(([label, list]) => (
        <section className="surface-card" style={{ padding: 20, marginTop: 14 }} key={label}>
          <div className="eyebrow">{label}</div>
          <h2 className="h-section" style={{ marginTop: 6, marginBottom: 12 }}>{label} <span className="text-muted" style={{ fontWeight: 500 }}>({list.length})</span></h2>
          {list.length === 0 ? <p className="text-muted" style={{ fontSize: 14 }}>Kosong.</p> : <div className="stack-12">{list.map((t) => <TaskRow key={t.id} t={t} />)}</div>}
        </section>
      ))}
      {loading && <p className="text-muted" style={{ fontSize: 13, marginTop: 10 }}>Memuat…</p>}
    </div>
  );
}
