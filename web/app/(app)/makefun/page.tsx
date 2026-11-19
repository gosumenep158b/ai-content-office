"use client"

import { useCallback, useEffect, useState } from "react"

type Row = { key: string; label: string; status: string; note: string | null; pct: number }
type Act = { id: string; agent: string; kind: string; detail: string; created_at: string }
type Agent = { agent_id: string; status: string; progress: number; message: string | null }

const ST: Record<string, [string, string]> = {
  todo: ["bg-slate-100 text-slate-600", "Belum"],
  doing: ["bg-blue-100 text-blue-800", "Dikerjakan"],
  done: ["bg-emerald-100 text-emerald-800", "Selesai"],
  blocked: ["bg-red-100 text-red-700", "Terblokir"],
}

export default function MakeFunPage() {
  const [d, setD] = useState<any>(null)
  const [err, setErr] = useState<string | null>(null)
  const [now, setNow] = useState(() => new Date())

  const load = useCallback(async () => {
    try {
      const r = await fetch("/api/make-fun")
      const j = await r.json()
      if (j.error) setErr(j.error)
      else setD(j.data)
    } catch (e) {
      setErr(e instanceof Error ? e.message : "gagal memuat")
    }
  }, [])

  useEffect(() => { load(); const t = setInterval(load, 60000); return () => clearInterval(t) }, [load])
  useEffect(() => { const t = setInterval(() => setNow(new Date()), 30000); return () => clearInterval(t) }, [])

  const comp = d?.competition
  const sisa = comp?.deadline ? Math.max(0, new Date(comp.deadline).getTime() - now.getTime()) : 0
  const hari = Math.floor(sisa / 86400000)
  const jam = Math.floor((sisa % 86400000) / 3600000)

  const prog = (d?.progress ?? []) as Row[]
  const totalPct = prog.length ? Math.round(prog.reduce((a, p) => a + p.pct, 0) / prog.length) : 0

  return (
    <div className="p-5 md:p-8 bg-slate-50 min-h-screen">
      <div className="max-w-5xl mx-auto">
        <header className="mb-6 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight text-[#0F2440]">make.fun</h1>
            <p className="text-sm text-slate-600">Pemantauan bounty, progres tim, dan hasil.</p>
          </div>
          <a href={`https://make.fun/bounty/${comp?.slug ?? "github-core-clone-01"}`}
            target="_blank" rel="noopener noreferrer"
            className="rounded-lg bg-[#DC2626] px-4 py-2 text-sm font-semibold text-white hover:bg-[#b91c1c]">
            Buka Bounty →
          </a>
        </header>

        {err && (
          <div className="mb-5 rounded-lg border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-700">{err}</div>
        )}

        {comp && (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-6">
            <div className="rounded-xl border border-slate-200 bg-white p-5">
              <p className="text-xs font-medium text-slate-500">Hadiah</p>
              <p className="text-2xl font-extrabold text-[#0F2440]">${comp.rewardAmount ?? 0}</p>
              <p className="text-[11px] text-slate-500">{comp.category} · {(comp.submissionCount ?? 0).toLocaleString()} entri</p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-5">
              <p className="text-xs font-medium text-slate-500">Sisa waktu</p>
              <p className="text-2xl font-extrabold text-[#DC2626]">{hari}h {jam}j</p>
              <p className="text-[11px] text-slate-500">{new Date(comp.deadline).toLocaleString("id-ID")}</p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-5">
              <p className="text-xs font-medium text-slate-500">Progres kita</p>
              <p className="text-2xl font-extrabold text-[#0F2440]">{totalPct}%</p>
              <div className="h-1.5 bg-slate-200 rounded-full mt-2">
                <div className="h-full bg-[#DC2626] rounded-full transition-all" style={{ width: `${totalPct}%` }} />
              </div>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-5">
              <p className="text-xs font-medium text-slate-500">Agen aktif</p>
              <p className="text-2xl font-extrabold text-[#0F2440]">
                {(d?.agents ?? []).filter((a: Agent) => a.status !== "offline").length}/{(d?.agents ?? []).length}
              </p>
              <p className="text-[11px] text-slate-500">terdaftar di kantor</p>
            </div>
          </div>
        )}

        <div className="grid gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2 rounded-xl border border-slate-200 bg-white p-5">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500 mb-4">Checklist pengerjaan</h2>
            {prog.length === 0 ? (
              <p className="text-sm text-slate-500">Belum ada checklist. Jalankan sinkronisasi worker untuk mengisi.</p>
            ) : (
              <ul className="space-y-3">
                {prog.map((p) => {
                  const [cls, label] = ST[p.status] ?? ST.todo
                  return (
                    <li key={p.key} className="rounded-lg border border-slate-200 p-3">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-slate-800">{p.label}</p>
                          {p.note && <p className="text-[11px] text-slate-500 line-clamp-2">{p.note}</p>}
                        </div>
                        <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold ${cls}`}>{label}</span>
                      </div>
                      <div className="mt-2 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                        <div className="h-full bg-[#0F2440] rounded-full" style={{ width: `${p.pct}%` }} />
                      </div>
                    </li>
                  )
                })}
              </ul>
            )}
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-5">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500 mb-4">Aktivitas</h2>
            {(d?.activity ?? []).length === 0 ? (
              <p className="text-sm text-slate-500">Belum ada aktivitas.</p>
            ) : (
              <ol className="relative space-y-3 border-l border-slate-200 pl-4">
                {(d?.activity ?? []).map((a: Act) => (
                  <li key={a.id} className="relative">
                    <span className="absolute -left-[21px] top-1.5 h-2.5 w-2.5 rounded-full bg-[#DC2626]" />
                    <p className="text-xs text-slate-800"><span className="font-semibold">{a.agent}</span> · {a.detail}</p>
                    <p className="text-[10px] text-slate-500">{new Date(a.created_at).toLocaleString("id-ID")}</p>
                  </li>
                ))}
              </ol>
            )}
          </div>
        </div>

        <div className="mt-6 rounded-xl border border-slate-200 bg-white p-5">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500 mb-4">Papan peringkat</h2>
          {(d?.leaderboard ?? []).length === 0 ? (
            <p className="text-sm text-slate-500">Papan peringkat belum tersedia.</p>
          ) : (
            <ol className="divide-y divide-slate-100">
              {(d?.leaderboard ?? []).map((r: any, i: number) => (
                <li key={i} className="flex items-center justify-between py-2.5">
                  <span className="text-sm text-slate-700">{r.place ?? i + 1}. {r.entryTitle ?? r.title ?? "-"}</span>
                  <span className="text-sm font-semibold text-[#0F2440]">{r.score ?? r.pct ?? "-"}</span>
                </li>
              ))}
            </ol>
          )}
        </div>
      </div>
    </div>
  )
}