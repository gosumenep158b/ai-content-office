"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { useSearchParams } from "next/navigation"

type Tugas = {
  id: string
  title: string
  status: string
  priority: string
  due_at: string | null
  created_at: string
  updated_at: string
}

type Divisi = {
  id: string
  nama: string
  role: string
  deskripsi: string
  status: string
  total: number
  selesai: number
  berjalan: number
  tertunda: number
  progress: number
  tugas: Tugas[]
}

type Aktivitas = {
  id: string
  actor: string
  actor_type: string
  action: string
  entity: string
  created_at: string
  alasan: string | null
}

type OfficeData = {
  divisi: Divisi[]
  aktivitas: Aktivitas[]
  ringkasan: { total_tugas: number; selesai: number; berjalan: number; tertunda: number }
}

const AVATAR: Record<string, string> = {
  dika: "from-[#0F2440] to-[#1b3a60]",
  kinan: "from-blue-500 to-blue-700",
  dava: "from-purple-500 to-purple-700",
  yanti: "from-amber-500 to-amber-700",
  anton: "from-emerald-500 to-emerald-700",
}

const ROLE_LABEL: Record<string, string> = {
  Manager: "Manajer / Orkestrator",
  Research: "Periset Tren",
  "Content Strategist": "Strategis Konten",
  "Video Producer": "Produser Video",
  Publisher: "Penerbit / IT",
}

const STATUS_STYLE: Record<string, string> = {
  Completed: "bg-emerald-100 text-emerald-800",
  Cancelled: "bg-slate-100 text-slate-600",
  "In Progress": "bg-blue-100 text-blue-800",
  "In Review": "bg-teal-100 text-teal-800",
  Revision: "bg-amber-100 text-amber-800",
  "Waiting Input": "bg-yellow-100 text-yellow-800",
  Assigned: "bg-indigo-100 text-indigo-800",
  Backlog: "bg-slate-100 text-slate-600",
  Blocked: "bg-red-100 text-red-800",
}

const ACTION_LABEL: Record<string, string> = {
  "task.create": "membuat tugas",
  "task.update": "memperbarui tugas",
  "task.delete": "menghapus tugas",
  "task.submit": "mengirim hasil kerja",
  "content.create": "membuat konten",
  "content.update": "memperbarui konten",
  "content.brief": "menyusun brief",
  "content.script": "menulis naskah",
  "content.storyboard": "membuat storyboard",
  "research.create": "menjalankan riset",
}

function initials(name: string) {
  return name.slice(0, 2).toUpperCase()
}

function waktu(iso: string) {
  return new Date(iso).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })
}

function tanggal(iso: string) {
  return new Date(iso).toLocaleDateString("id-ID", { day: "2-digit", month: "short" })
}

export default function OfficePage() {
  const [data, setData] = useState<OfficeData | null>(null)
  const [selected, setSelected] = useState<string | null>(null)
  const [err, setErr] = useState<string | null>(null)
  const [now, setNow] = useState(() => new Date())

  const load = useCallback(async () => {
    try {
      const r = await fetch("/api/office")
      const j = await r.json()
      if (!r.ok) { setErr(j.error ?? "Gagal memuat data"); return }
      setData(j.data)
      setSelected((prev) => prev ?? j.data?.divisi?.[0]?.id ?? null)
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Gagal memuat data")
    }
  }, [])

  const searchParams = useSearchParams()
  const agentParam = searchParams.get("agent")

  useEffect(() => { load() }, [load])
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 30000)
    return () => clearInterval(t)
  }, [])

  // pilih divisi dari query ?agent=
  useEffect(() => {
    if (!data) return
    if (agentParam && data.divisi.some((d) => d.id === agentParam)) {
      setSelected(agentParam)
    }
  }, [data, agentParam])

  const aktif = useMemo(() => data?.divisi.find((d) => d.id === selected) ?? null, [data, selected])

  const jamWib = now.toLocaleTimeString("id-ID", { timeZone: "Asia/Jakarta", hour: "2-digit", minute: "2-digit" })
  const jamKerja = (() => {
    const h = Number(new Date().toLocaleString("en-GB", { timeZone: "Asia/Jakarta", hour: "2-digit", hour12: false }).slice(0, 2))
    return h >= 8 && h < 17
  })()

  const belum = aktif?.tugas.filter((t) => !["Completed", "Cancelled"].includes(t.status)) ?? []
  const selesai = aktif?.tugas.filter((t) => ["Completed", "Cancelled"].includes(t.status)) ?? []

  const aktivitasAktif = useMemo(() => {
    if (!data || !aktif) return []
    return data.aktivitas.filter((a) => (a.actor ?? "").toLowerCase() === aktif.nama.toLowerCase())
  }, [data, aktif])

  return (
    <div className="p-5 md:p-8">
      {/* Header */}
      <header className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-[#0F2440]">Main Office</h1>
          <p className="mt-1 text-sm text-slate-600">Kantor virtual — siapa sedang mengerjakan apa.</p>
        </div>
        <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white px-4 py-2">
          <span className={`inline-block h-2.5 w-2.5 rounded-full ${jamKerja ? "bg-emerald-500" : "bg-slate-400"}`} />
          <div className="text-xs">
            <p className="font-semibold text-slate-800">{jamWib} WIB</p>
            <p className="text-slate-500">{jamKerja ? "Jam kerja" : "Di luar jam kerja"}</p>
          </div>
        </div>
      </header>

      {err && (
        <div className="mb-5 rounded-lg border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-700">{err}</div>
      )}

      {/* Ringkasan */}
      {data && (
        <div className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-4">
          {[
            { label: "Total tugas", value: data.ringkasan.total_tugas, cls: "text-[#0F2440]" },
            { label: "Selesai", value: data.ringkasan.selesai, cls: "text-emerald-600" },
            { label: "Berjalan", value: data.ringkasan.berjalan, cls: "text-blue-600" },
            { label: "Tertunda", value: data.ringkasan.tertunda, cls: "text-amber-600" },
          ].map((k) => (
            <div key={k.label} className="rounded-xl border border-slate-200 bg-white p-4">
              <p className="text-xs font-medium text-slate-500">{k.label}</p>
              <p className={`mt-1 text-2xl font-extrabold ${k.cls}`}>{k.value}</p>
            </div>
          ))}
        </div>
      )}

      {/* Avatar grid */}
      <section className="mb-6">
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">Tim</h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          {(data?.divisi ?? []).map((d) => {
            const isActive = d.id === selected
            const grad = AVATAR[d.nama.toLowerCase()] ?? "from-slate-500 to-slate-700"
            return (
              <button
                key={d.id}
                onClick={() => setSelected(d.id)}
                className={`group rounded-xl border bg-white p-4 text-left transition ${isActive ? "border-[#DC2626] ring-2 ring-[#DC2626]/20" : "border-slate-200 hover:border-slate-300"}`}
              >
                <div className={`mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br ${grad} text-white text-lg font-bold`}>
                  {initials(d.nama)}
                </div>
                <p className="mt-3 text-center text-sm font-semibold text-slate-900 capitalize">{d.nama}</p>
                <p className="text-center text-[11px] text-slate-500">{ROLE_LABEL[d.role] ?? d.role}</p>
                <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-slate-200">
                  <div className="h-full bg-[#DC2626] transition-all" style={{ width: `${d.progress}%` }} />
                </div>
                <p className="mt-1 text-center text-[10px] text-slate-500">{d.progress}% selesai · {d.total} tugas</p>
              </button>
            )
          })}
          {!data && <p className="col-span-full text-sm text-slate-500">Memuat data kantor…</p>}
        </div>
      </section>

      {/* Panel agen terpilih */}
      {aktif && (
        <div className="grid gap-5 lg:grid-cols-3">
          {/* Tugas */}
          <div className="lg:col-span-2 space-y-4">
            <div className="rounded-xl border border-slate-200 bg-white p-5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h3 className="text-lg font-bold capitalize text-[#0F2440]">{aktif.nama}</h3>
                  <p className="text-xs text-slate-500">{ROLE_LABEL[aktif.role] ?? aktif.role} · {aktif.deskripsi ?? ""}</p>
                </div>
                <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${aktif.status === "active" ? "bg-emerald-100 text-emerald-800" : "bg-slate-100 text-slate-600"}`}>
                  {aktif.status === "active" ? "Aktif" : aktif.status}
                </span>
              </div>
              <div className="mt-4 grid grid-cols-3 gap-2 text-center">
                <div className="rounded-lg bg-emerald-50 p-2">
                  <p className="text-lg font-bold text-emerald-700">{aktif.selesai}</p>
                  <p className="text-[11px] text-emerald-700/80">Selesai</p>
                </div>
                <div className="rounded-lg bg-blue-50 p-2">
                  <p className="text-lg font-bold text-blue-700">{aktif.berjalan}</p>
                  <p className="text-[11px] text-blue-700/80">Berjalan</p>
                </div>
                <div className="rounded-lg bg-amber-50 p-2">
                  <p className="text-lg font-bold text-amber-700">{aktif.tertunda}</p>
                  <p className="text-[11px] text-amber-700/80">Tertunda</p>
                </div>
              </div>
            </div>

            <div className="rounded-xl border border-slate-200 bg-white p-5">
              <h4 className="mb-3 text-sm font-semibold text-slate-700">Belum selesai ({belum.length})</h4>
              {belum.length === 0 ? (
                <p className="text-sm text-slate-500">Tidak ada tugas berjalan.</p>
              ) : (
                <ul className="divide-y divide-slate-100">
                  {belum.map((t) => (
                    <li key={t.id} className="flex flex-wrap items-center justify-between gap-2 py-2">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-slate-800">{t.title}</p>
                        <p className="text-[11px] text-slate-500">
                          {t.priority} · dibuat {tanggal(t.created_at)}
                          {t.due_at ? ` · tenggat ${tanggal(t.due_at)}` : ""}
                        </p>
                      </div>
                      <span className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${STATUS_STYLE[t.status] ?? "bg-slate-100 text-slate-600"}`}>
                        {t.status}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div className="rounded-xl border border-slate-200 bg-white p-5">
              <h4 className="mb-3 text-sm font-semibold text-slate-700">Selesai ({selesai.length})</h4>
              {selesai.length === 0 ? (
                <p className="text-sm text-slate-500">Belum ada tugas selesai.</p>
              ) : (
                <ul className="divide-y divide-slate-100">
                  {selesai.map((t) => (
                    <li key={t.id} className="flex items-center justify-between gap-2 py-2">
                      <p className="truncate text-sm text-slate-600 line-through">{t.title}</p>
                      <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] font-medium text-emerald-800">{t.status}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>

          {/* Aktivitas */}
          <div className="rounded-xl border border-slate-200 bg-white p-5">
            <h4 className="mb-3 text-sm font-semibold text-slate-700">Aktivitas jam kerja</h4>
            {aktivitasAktif.length === 0 ? (
              <p className="text-sm text-slate-500">Belum ada aktivitas tercatat.</p>
            ) : (
              <ol className="relative space-y-4 border-l border-slate-200 pl-4">
                {aktivitasAktif.slice(0, 15).map((a) => (
                  <li key={a.id} className="relative">
                    <span className="absolute -left-[21px] top-1 h-2.5 w-2.5 rounded-full bg-[#DC2626]" />
                    <p className="text-sm text-slate-800">
                      <span className="capitalize font-medium">{a.actor}</span>{" "}
                      {ACTION_LABEL[a.action] ?? a.action}
                      {a.entity ? <span className="text-slate-500"> · {a.entity}</span> : null}
                    </p>
                    <p className="text-[11px] text-slate-500">
                      {waktu(a.created_at)} WIB · {tanggal(a.created_at)}
                    </p>
                  </li>
                ))}
              </ol>
            )}
          </div>
        </div>
      )}
    </div>
  )
}