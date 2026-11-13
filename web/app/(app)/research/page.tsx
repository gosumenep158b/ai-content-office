"use client"

import { useCallback, useEffect, useState } from "react"

type Item = {
  id?: string
  platform: string
  topic: string
  source_url: string
  published_at: string
  metric_views: string
  verification_status: string
  notes: string
}

type Report = {
  id: string
  periode: string
  platform: string | null
  summary: string | null
  created_by: string | null
  created_at: string
  items: any[]
}

const PLATFORMS = ["tiktok", "instagram", "threads"]
const VERIF = ["Verified", "Estimated", "Unverified", "Unavailable"]

const emptyItem = (): Item => ({
  platform: "tiktok", topic: "", source_url: "", published_at: "",
  metric_views: "", verification_status: "Unverified", notes: "",
})

function VerifBadge({ v }: { v: string }) {
  const map: Record<string, string> = {
    Verified: "bg-emerald-100 text-emerald-800",
    Estimated: "bg-amber-100 text-amber-800",
    Unverified: "bg-slate-100 text-slate-600",
    Unavailable: "bg-red-100 text-red-700",
  }
  return <span className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${map[v] ?? map.Unverified}`}>{v}</span>
}

export default function ResearchPage() {
  const [reports, setReports] = useState<Report[]>([])
  const [periode, setPeriode] = useState(() => `24h ${new Date().toISOString().slice(0, 10)}`)
  const [summary, setSummary] = useState("")
  const [items, setItems] = useState<Item[]>([emptyItem()])
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState<{ type: "ok" | "err"; text: string } | null>(null)

  const load = useCallback(async () => {
    const r = await fetch("/api/research?with_items=1&limit=20")
    const j = await r.json()
    if (r.ok) setReports(j.data ?? [])
  }, [])

  useEffect(() => { load() }, [load])

  function flash(type: "ok" | "err", text: string) {
    setMsg({ type, text })
    setTimeout(() => setMsg(null), 4000)
  }

  function updateItem(i: number, patch: Partial<Item>) {
    const n = [...items]
    n[i] = { ...n[i], ...patch }
    setItems(n)
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    const valid = items.filter((it) => it.topic.trim())
    if (!valid.length) return flash("err", "Minimal satu temuan dengan topik")
    setBusy(true)
    try {
      const r = await fetch("/api/research", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          periode,
          platform: valid.length === 1 ? valid[0].platform : null,
          summary: summary || null,
          items: valid.map((it) => ({
            platform: it.platform,
            topic: it.topic,
            source_url: it.source_url || null,
            published_at: it.published_at || null,
            metric_values: it.metric_views ? { views: Number(it.metric_views) } : null,
            metric_source: it.metric_views ? "input manual" : null,
            verification_status: it.verification_status,
            notes: it.notes || null,
          })),
        }),
      })
      const j = await r.json()
      if (!r.ok) return flash("err", j.error ?? "gagal menyimpan riset")
      flash("ok", `Riset tersimpan — ${j.data.items?.length ?? 0} temuan`)
      setItems([emptyItem()])
      setSummary("")
      await load()
    } finally { setBusy(false) }
  }

  return (
    <div className="min-h-screen bg-slate-100 p-6 md:p-10">
      <div className="mx-auto max-w-4xl">
        <header className="mb-8">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h1 className="text-3xl font-extrabold tracking-tight text-[#0F2440]">Research Center</h1>
              <p className="mt-1 text-sm text-slate-600">
                Kinan — riset tren 24 jam dengan sumber &amp; status verifikasi.
              </p>
            </div>
            <a href="/studio" className="rounded-lg bg-[#DC2626] px-4 py-2 text-sm font-semibold text-white hover:bg-[#b91c1c]">
              Content Studio →
            </a>
          </div>
        </header>

        {msg && (
          <div className={`mb-5 rounded-lg border px-4 py-3 text-sm ${msg.type === "ok" ? "border-emerald-300 bg-emerald-50 text-emerald-800" : "border-red-300 bg-red-50 text-red-700"}`}>
            {msg.text}
          </div>
        )}

        <form onSubmit={submit} className="rounded-xl border border-slate-200 bg-white p-5">
          <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-slate-500">Riset baru</h2>

          <div className="grid gap-3 md:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-600">Periode</label>
              <input value={periode} onChange={(e) => setPeriode(e.target.value)}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-600">Ringkasan (opsional)</label>
              <input value={summary} onChange={(e) => setSummary(e.target.value)}
                placeholder="Kesimpulan singkat riset" className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" />
            </div>
          </div>

          <div className="mt-5 space-y-4">
            {items.map((it, i) => (
              <div key={i} className="rounded-lg border border-slate-200 p-4">
                <div className="mb-3 flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-500">Temuan {i + 1}</span>
                  {items.length > 1 && (
                    <button type="button" onClick={() => setItems(items.filter((_, x) => x !== i))}
                      className="text-xs text-red-600 hover:underline">Hapus</button>
                  )}
                </div>
                <div className="grid gap-3 md:grid-cols-2">
                  <select value={it.platform} onChange={(e) => updateItem(i, { platform: e.target.value })}
                    className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm">
                    {PLATFORMS.map((p) => <option key={p} value={p}>{p}</option>)}
                  </select>
                  <input value={it.topic} onChange={(e) => updateItem(i, { topic: e.target.value })}
                    placeholder="Topik / tren" className="rounded-lg border border-slate-300 px-3 py-2 text-sm" />
                  <input value={it.source_url} onChange={(e) => updateItem(i, { source_url: e.target.value })}
                    placeholder="URL sumber" className="md:col-span-2 rounded-lg border border-slate-300 px-3 py-2 text-sm" />
                  <input value={it.metric_views} onChange={(e) => updateItem(i, { metric_views: e.target.value })}
                    type="number" placeholder="Views (opsional)" className="rounded-lg border border-slate-300 px-3 py-2 text-sm" />
                  <select value={it.verification_status} onChange={(e) => updateItem(i, { verification_status: e.target.value })}
                    className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm">
                    {VERIF.map((v) => <option key={v} value={v}>{v}</option>)}
                  </select>
                  <input value={it.notes} onChange={(e) => updateItem(i, { notes: e.target.value })}
                    placeholder="Catatan / alasan potensi viral" className="md:col-span-2 rounded-lg border border-slate-300 px-3 py-2 text-sm" />
                </div>
              </div>
            ))}
            <button type="button" onClick={() => setItems([...items, emptyItem()])}
              className="rounded-lg border border-dashed border-slate-400 px-3 py-2 text-xs font-medium text-slate-600 hover:border-[#0F2440]">
              + Tambah temuan
            </button>
          </div>

          <button disabled={busy} type="submit"
            className="mt-5 w-full rounded-lg bg-[#0F2440] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#1b3a60] disabled:opacity-60">
            {busy ? "Menyimpan..." : "Simpan Riset"}
          </button>
        </form>

        <div className="mt-8">
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">Riwayat riset</h2>
          {reports.length === 0 ? (
            <p className="rounded-xl border border-slate-200 bg-white p-5 text-sm text-slate-500">
              Belum ada riset tersimpan.
            </p>
          ) : (
            <div className="space-y-4">
              {reports.map((r) => (
                <div key={r.id} className="rounded-xl border border-slate-200 bg-white p-5">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <p className="text-sm font-semibold text-[#0F2440]">{r.periode}</p>
                      <p className="text-xs text-slate-500">
                        {r.platform ?? "multi-platform"} · {r.created_by ?? "kinan"} · {new Date(r.created_at).toLocaleString("id-ID")}
                      </p>
                    </div>
                    <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-600">
                      {r.items.length} temuan
                    </span>
                  </div>
                  {r.summary && <p className="mt-2 text-sm text-slate-600">{r.summary}</p>}
                  {r.items.length > 0 && (
                    <ul className="mt-3 divide-y divide-slate-100">
                      {r.items.map((it: any) => (
                        <li key={it.id} className="flex flex-wrap items-center justify-between gap-2 py-2">
                          <div className="min-w-0">
                            <p className="truncate text-sm text-slate-800">{it.topic}</p>
                            <p className="text-xs text-slate-500">
                              {it.platform}
                              {it.metric_values?.views ? ` · ${Number(it.metric_values.views).toLocaleString("id-ID")} views` : ""}
                              {it.source_url ? " · ada sumber" : ""}
                            </p>
                          </div>
                          <VerifBadge v={it.verification_status ?? "Unverified"} />
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
