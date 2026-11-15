"use client"

import { useCallback, useEffect, useState } from "react"

type Scene = {
  scene?: number
  durasi?: number
  visual?: string
  teks?: string
  audio?: string
  catatan?: string
}

type Item = {
  id: string
  title: string
  platform: string | null
  purpose: string | null
  audience: string | null
  topic: string | null
  angle: string | null
  status: string
  brief: { body?: any } | null
  script: { hook?: string; narasi?: string; cta?: string; caption?: string; hashtags?: string; estimasi_durasi?: number } | null
  storyboard: { scenes?: Scene[] } | null
}

const KEPUTUSAN = [
  { key: "Approved", label: "Approved", warna: "bg-emerald-600 hover:bg-emerald-700", ket: "Lanjut produksi video (Yanti)" },
  { key: "Revision", label: "Revision", warna: "bg-amber-500 hover:bg-amber-600", ket: "Kembali ke Dava dengan catatan" },
  { key: "Rejected", label: "Rejected", warna: "bg-red-600 hover:bg-red-700", ket: "Tutup / kembali ke ide" },
]

export default function ApprovalRoomPage() {
  const [items, setItems] = useState<Item[]>([])
  const [aktif, setAktif] = useState<Item | null>(null)
  const [catatan, setCatatan] = useState("")
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState<{ t: "ok" | "err"; m: string } | null>(null)
  const [loading, setLoading] = useState(true)

  const muat = useCallback(async () => {
    try {
      const r = await fetch("/api/approvals")
      const j = await r.json()
      if (!r.ok) { setMsg({ t: "err", m: j.error ?? "gagal memuat" }); return }
      setItems(j.data ?? [])
      setAktif((prev) => (prev ? (j.data ?? []).find((x: Item) => x.id === prev.id) ?? (j.data?.[0] ?? null) : (j.data?.[0] ?? null)))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { muat() }, [muat])

  async function putuskan(decision: string) {
    if (!aktif) return
    if ((decision === "Revision" || decision === "Rejected") && !catatan.trim()) {
      setMsg({ t: "err", m: "Catatan wajib untuk Revision / Rejected" })
      return
    }
    setBusy(true)
    try {
      const r = await fetch("/api/approvals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content_id: aktif.id, decision, catatan: catatan.trim() || undefined }),
      })
      const j = await r.json()
      if (!r.ok) { setMsg({ t: "err", m: j.error ?? "gagal menyimpan keputusan" }); return }
      const t = j.data?.task
      setMsg({
        t: "ok",
        m: `${decision}. ${t ? `Task diteruskan: "${t.title}"` : "Tidak ada task turunan."}`,
      })
      setCatatan("")
      await muat()
    } finally {
      setBusy(false)
    }
  }

  const scenes = aktif?.storyboard?.scenes ?? []
  const totalDurasi = scenes.reduce((a, s) => a + (s.durasi ?? 0), 0)

  return (
    <div className="min-h-screen bg-slate-100 p-6 md:p-8">
      <header className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-[#0F2440]">Approval Room</h1>
          <p className="mt-1 text-sm text-slate-600">
            Dika meninjau konten siap tayang — Approved, Revision, atau Rejected.
          </p>
        </div>
        <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-800">
          {items.length} menunggu review
        </span>
      </header>

      {msg && (
        <div className={`mb-5 rounded-lg border px-4 py-3 text-sm ${msg.t === "ok" ? "border-emerald-300 bg-emerald-50 text-emerald-800" : "border-red-300 bg-red-50 text-red-700"}`}>
          {msg.m}
        </div>
      )}

      {loading && <p className="text-sm text-slate-500">Memuat antrean review…</p>}

      {!loading && items.length === 0 && (
        <div className="rounded-xl border border-slate-200 bg-white p-10 text-center">
          <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-slate-100 text-2xl">🗂️</div>
          <p className="text-sm font-medium text-slate-700">Tidak ada konten menunggu review</p>
          <p className="mt-1 text-xs text-slate-500">Konten akan muncul di sini setelah Dava menyelesaikan naskah &amp; storyboard.</p>
        </div>
      )}

      {items.length > 0 && (
        <div className="grid gap-5 lg:grid-cols-12">
          {/* Antrean */}
          <aside className="lg:col-span-4">
            <div className="rounded-xl border border-slate-200 bg-white p-3">
              <p className="px-2 pb-2 text-[11px] font-bold uppercase tracking-widest text-slate-400">Antrean</p>
              <ul className="space-y-1">
                {items.map((it) => (
                  <li key={it.id}>
                    <button
                      onClick={() => { setAktif(it); setCatatan("") }}
                      className={`w-full rounded-lg px-3 py-2.5 text-left transition ${aktif?.id === it.id ? "bg-[#0F2440] text-white" : "hover:bg-slate-50"}`}
                    >
                      <p className={`truncate text-sm font-semibold ${aktif?.id === it.id ? "text-white" : "text-slate-800"}`}>{it.title}</p>
                      <p className={`text-[11px] ${aktif?.id === it.id ? "text-white/60" : "text-slate-500"}`}>
                        {it.platform} · {(it.storyboard?.scenes ?? []).length} scene
                      </p>
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          </aside>

          {/* Detail */}
          {aktif && (
            <section className="space-y-4 lg:col-span-8">
              {/* Header konten */}
              <div className="rounded-xl border border-slate-200 bg-white p-5">
                <h2 className="text-xl font-bold text-[#0F2440]">{aktif.title}</h2>
                <p className="mt-1 text-xs text-slate-500">
                  {aktif.platform} · {aktif.purpose ?? "-"} · {aktif.audience ?? "-"}
                </p>
                <div className="mt-3 flex flex-wrap gap-2 text-[11px]">
                  <span className="rounded-full bg-slate-100 px-2 py-0.5 text-slate-600">Topik: {aktif.topic ?? "-"}</span>
                  <span className="rounded-full bg-slate-100 px-2 py-0.5 text-slate-600">Angle: {aktif.angle ?? "-"}</span>
                  <span className="rounded-full bg-amber-100 px-2 py-0.5 font-medium text-amber-800">{aktif.status}</span>
                </div>
              </div>

              {/* Naskah */}
              <div className="rounded-xl border border-slate-200 bg-white p-5">
                <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">Naskah</h3>
                {aktif.script ? (
                  <div className="space-y-3 text-sm">
                    <div>
                      <p className="text-[11px] font-semibold uppercase text-slate-400">Hook (3 detik)</p>
                      <p className="mt-0.5 rounded-lg bg-red-50 px-3 py-2 font-medium text-red-900">{aktif.script.hook}</p>
                    </div>
                    <div>
                      <p className="text-[11px] font-semibold uppercase text-slate-400">Narasi</p>
                      <p className="mt-0.5 whitespace-pre-wrap rounded-lg bg-slate-50 px-3 py-2 text-slate-800">{aktif.script.narasi}</p>
                    </div>
                    <div className="grid gap-3 md:grid-cols-2">
                      <div>
                        <p className="text-[11px] font-semibold uppercase text-slate-400">CTA</p>
                        <p className="mt-0.5 rounded-lg bg-slate-50 px-3 py-2 text-slate-800">{aktif.script.cta}</p>
                      </div>
                      <div>
                        <p className="text-[11px] font-semibold uppercase text-slate-400">Caption</p>
                        <p className="mt-0.5 rounded-lg bg-slate-50 px-3 py-2 text-slate-800">{aktif.script.caption}</p>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-3 text-[11px] text-slate-500">
                      {aktif.script.hashtags && <span>🏷️ {aktif.script.hashtags}</span>}
                      {aktif.script.estimasi_durasi && <span>⏱️ ±{aktif.script.estimasi_durasi} detik</span>}
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-slate-500">Naskah belum ada.</p>
                )}
              </div>

              {/* Storyboard */}
              <div className="rounded-xl border border-slate-200 bg-white p-5">
                <div className="mb-3 flex items-center justify-between">
                  <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500">Storyboard</h3>
                  {scenes.length > 0 && (
                    <span className="text-[11px] text-slate-500">{scenes.length} scene · ±{totalDurasi}s</span>
                  )}
                </div>
                {scenes.length === 0 ? (
                  <p className="text-sm text-slate-500">Storyboard belum ada.</p>
                ) : (
                  <ol className="space-y-2">
                    {scenes.map((s, i) => (
                      <li key={i} className="rounded-lg border border-slate-200 p-3">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-[#0F2440]">Scene {s.scene ?? i + 1}</span>
                          <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[11px] text-slate-600">{s.durasi ?? "?"}s</span>
                        </div>
                        <p className="mt-1 text-sm text-slate-800">{s.visual || "—"}</p>
                        {s.teks && <p className="mt-0.5 text-[12px] text-slate-500">Teks: {s.teks}</p>}
                        {s.audio && <p className="text-[12px] text-slate-500">Audio: {s.audio}</p>}
                      </li>
                    ))}
                  </ol>
                )}
              </div>

              {/* Keputusan */}
              <div className="rounded-xl border border-slate-200 bg-white p-5">
                <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">Keputusan Dika</h3>
                <textarea
                  value={catatan}
                  onChange={(e) => setCatatan(e.target.value)}
                  rows={3}
                  placeholder="Catatan review (wajib untuk Revision/Rejected)"
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-[#0F2440]"
                />
                <div className="mt-3 grid gap-2 sm:grid-cols-3">
                  {KEPUTUSAN.map((k) => (
                    <button
                      key={k.key}
                      disabled={busy}
                      onClick={() => putuskan(k.key)}
                      className={`rounded-lg px-3 py-2.5 text-sm font-semibold text-white transition disabled:opacity-60 ${k.warna}`}
                      title={k.ket}
                    >
                      {k.label}
                    </button>
                  ))}
                </div>
                <p className="mt-2 text-[11px] text-slate-500">
                  Approved → konten lanjut ke Yanti (video). Revision → kembali ke Dava.
                </p>
              </div>
            </section>
          )}
        </div>
      )}
    </div>
  )
}