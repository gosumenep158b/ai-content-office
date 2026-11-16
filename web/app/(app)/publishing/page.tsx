"use client"

import { useCallback, useEffect, useState } from "react"

type Content = {
  id: string
  title: string
  platform: string | null
  status: string
}

type Pub = {
  id: string
  content_id: string | null
  status: string
  caption: string | null
  hashtags: string | null
  akun: string | null
  url: string | null
  published_at: string | null
  content?: { id: string; title: string; platform: string | null }
}

const STATUS_STYLE: Record<string, string> = {
  Draft: "bg-slate-100 text-slate-600",
  "Package Ready": "bg-blue-100 text-blue-800",
  "Awaiting Owner Confirmation": "bg-amber-100 text-amber-800",
  Published: "bg-emerald-100 text-emerald-800",
  "Failed/Cancelled": "bg-red-100 text-red-700",
}

export default function PublishingPage() {
  const [contents, setContents] = useState<Content[]>([])
  const [pubs, setPubs] = useState<Pub[]>([])
  const [pilih, setPilih] = useState("")
  const [form, setForm] = useState({ caption: "", hashtags: "", akun: "tiktok@go.sumenep" })
  const [konfirmasi, setKonfirmasi] = useState<Record<string, { url: string; akun: string }>>({})
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState<{ t: "ok" | "err"; m: string } | null>(null)

  const muat = useCallback(async () => {
    const [c, p] = await Promise.all([
      fetch("/api/content?limit=100").then((r) => r.json()),
      fetch("/api/publications").then((r) => r.json()),
    ])
    const approved = (c.data ?? []).filter((x: Content) => x.status === "Approved")
    setContents(approved)
    setPubs(p.data ?? [])
    if (!pilih && approved[0]) setPilih(approved[0].id)
  }, [pilih])

  useEffect(() => { muat() }, [muat])

  async function siapkanPaket(e: React.FormEvent) {
    e.preventDefault()
    if (!pilih) return setMsg({ t: "err", m: "Pilih konten Approved dulu" })
    setBusy(true)
    try {
      const r = await fetch("/api/publications", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content_id: pilih, ...form }),
      })
      const j = await r.json()
      if (!r.ok) return setMsg({ t: "err", m: j.error ?? "gagal menyiapkan paket" })
      setMsg({ t: "ok", m: "Paket publikasi siap — unggah manual ke TikTok, lalu konfirmasi URL-nya." })
      setForm({ caption: "", hashtags: "", akun: "tiktok@go.sumenep" })
      await muat()
    } finally { setBusy(false) }
  }

  async function terbitkan(p: Pub) {
    const k = konfirmasi[p.id] ?? { url: "", akun: p.akun ?? "" }
    if (!k.url.trim()) return setMsg({ t: "err", m: "URL konten wajib diisi setelah unggah manual" })
    setBusy(true)
    try {
      const r = await fetch("/api/publications", {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: p.id, status: "Published", url: k.url.trim(), akun: k.akun }),
      })
      const j = await r.json()
      if (!r.ok) return setMsg({ t: "err", m: j.error ?? "gagal menyimpan konfirmasi" })
      setMsg({ t: "ok", m: "Publikasi tercatat. Snapshot analytics bisa diisi di halaman Analytics." })
      await muat()
    } finally { setBusy(false) }
  }

  return (
    <div className="min-h-screen bg-slate-100 p-6 md:p-8">
      <header className="mb-6">
        <h1 className="text-3xl font-extrabold tracking-tight text-[#0F2440]">Publishing Center</h1>
        <p className="mt-1 text-sm text-slate-600">
          Anton menyiapkan paket unggah; Owner mengunggah manual ke TikTok lalu mengonfirmasi URL.
        </p>
      </header>

      {msg && (
        <div className={`mb-5 rounded-lg border px-4 py-3 text-sm ${msg.t === "ok" ? "border-emerald-300 bg-emerald-50 text-emerald-800" : "border-red-300 bg-red-50 text-red-700"}`}>
          {msg.m}
        </div>
      )}

      {/* Siapkan paket */}
      <section className="mb-6 rounded-xl border border-slate-200 bg-white p-5">
        <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-slate-500">1. Siapkan paket unggah</h2>
        {contents.length === 0 ? (
          <p className="text-sm text-slate-500">
            Belum ada konten berstatus <b>Approved</b>. Setujui konten di Approval Room dulu.
          </p>
        ) : (
          <form onSubmit={siapkanPaket} className="grid gap-3 md:grid-cols-2">
            <select value={pilih} onChange={(e) => setPilih(e.target.value)}
              className="md:col-span-2 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm">
              {contents.map((c) => (
                <option key={c.id} value={c.id}>{c.title} — {c.platform}</option>
              ))}
            </select>
            <textarea value={form.caption} onChange={(e) => setForm({ ...form, caption: e.target.value })}
              rows={3} placeholder="Caption final" className="rounded-lg border border-slate-300 px-3 py-2 text-sm" />
            <textarea value={form.hashtags} onChange={(e) => setForm({ ...form, hashtags: e.target.value })}
              rows={3} placeholder="#hashtag1 #hashtag2" className="rounded-lg border border-slate-300 px-3 py-2 text-sm" />
            <input value={form.akun} onChange={(e) => setForm({ ...form, akun: e.target.value })}
              placeholder="Akun tujuan" className="rounded-lg border border-slate-300 px-3 py-2 text-sm" />
            <button disabled={busy} type="submit"
              className="rounded-lg bg-[#0F2440] px-4 py-2 text-sm font-semibold text-white hover:bg-[#1b3a60] disabled:opacity-60">
              {busy ? "Menyiapkan..." : "Siapkan Paket"}
            </button>
          </form>
        )}
      </section>

      {/* Konfirmasi Owner */}
      <section className="rounded-xl border border-slate-200 bg-white p-5">
        <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-slate-500">2. Unggah manual &amp; konfirmasi Owner</h2>
        {pubs.length === 0 ? (
          <p className="text-sm text-slate-500">Belum ada paket publikasi.</p>
        ) : (
          <ul className="space-y-3">
            {pubs.map((p) => {
              const siap = p.status === "Package Ready" || p.status === "Awaiting Owner Confirmation"
              const k = konfirmasi[p.id] ?? { url: p.url ?? "", akun: p.akun ?? "" }
              return (
                <li key={p.id} className="rounded-lg border border-slate-200 p-4">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-slate-800">{p.content?.title ?? "(tanpa judul)"}</p>
                      <p className="text-[11px] text-slate-500">
                        {p.content?.platform ?? "-"} · {p.akun ?? "akun belum diisi"}
                        {p.published_at ? ` · tayang ${new Date(p.published_at).toLocaleString("id-ID")}` : ""}
                      </p>
                    </div>
                    <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-medium ${STATUS_STYLE[p.status] ?? "bg-slate-100 text-slate-600"}`}>
                      {p.status}
                    </span>
                  </div>

                  {p.caption && <p className="mt-2 line-clamp-2 text-[12px] text-slate-600">{p.caption}</p>}
                  {p.hashtags && <p className="text-[11px] text-slate-500">{p.hashtags}</p>}

                  {siap && (
                    <div className="mt-3 grid gap-2 md:grid-cols-[1fr_auto_auto]">
                      <input
                        value={k.url}
                        onChange={(e) => setKonfirmasi({ ...konfirmasi, [p.id]: { ...k, url: e.target.value } })}
                        placeholder="https://www.tiktok.com/@akun/video/…"
                        className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
                      />
                      <input
                        value={k.akun}
                        onChange={(e) => setKonfirmasi({ ...konfirmasi, [p.id]: { ...k, akun: e.target.value } })}
                        placeholder="akun"
                        className="w-40 rounded-lg border border-slate-300 px-3 py-2 text-sm"
                      />
                      <button disabled={busy} onClick={() => terbitkan(p)}
                        className="rounded-lg bg-[#DC2626] px-4 py-2 text-sm font-semibold text-white hover:bg-[#b91c1c] disabled:opacity-60">
                        Konfirmasi Terbit
                      </button>
                    </div>
                  )}

                  {p.status === "Published" && p.url && (
                    <a href={p.url} target="_blank" rel="noopener noreferrer"
                      className="mt-2 inline-block text-[12px] font-medium text-[#0F2440] underline">
                      Buka konten →
                    </a>
                  )}
                </li>
              )
            })}
          </ul>
        )}
      </section>
    </div>
  )
}