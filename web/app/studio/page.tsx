"use client"

import { useCallback, useEffect, useState } from "react"

type ResearchItem = {
  id: string
  report_id: string
  platform: string | null
  topic: string
  source_url: string | null
  metric_values: any
  metric_source: string | null
  verification_status: string | null
  notes: string | null
}

type Content = {
  id: string
  title: string
  platform: string | null
  purpose: string | null
  audience: string | null
  topic: string | null
  angle: string | null
  status: string
  created_at: string
}

type Detail = Content & {
  brief: any | null
  script: any | null
  storyboard: any | null
}

const STATUS_FLOW = [
  "Idea", "Briefing", "Scripting", "Storyboarding", "Ready for Review",
]

function Badge({ text }: { text: string }) {
  const map: Record<string, string> = {
    Idea: "bg-slate-100 text-slate-700",
    Briefing: "bg-amber-100 text-amber-800",
    Scripting: "bg-blue-100 text-blue-800",
    Storyboarding: "bg-purple-100 text-purple-800",
    "Ready for Review": "bg-emerald-100 text-emerald-800",
    Approved: "bg-emerald-600 text-white",
    Revision: "bg-orange-100 text-orange-800",
  }
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${map[text] ?? "bg-slate-100 text-slate-700"}`}>
      {text}
    </span>
  )
}

function Section({ n, title, done, children }: { n: number; title: string; done: boolean; children: React.ReactNode }) {
  return (
    <section className="rounded-xl border border-slate-200 bg-white p-5">
      <header className="mb-4 flex items-center gap-3">
        <span className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold ${done ? "bg-emerald-600 text-white" : "bg-slate-200 text-slate-600"}`}>
          {done ? "✓" : n}
        </span>
        <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500">{title}</h3>
      </header>
      {children}
    </section>
  )
}

export default function StudioPage() {
  const [research, setResearch] = useState<ResearchItem[]>([])
  const [contents, setContents] = useState<Content[]>([])
  const [selected, setSelected] = useState<Detail | null>(null)
  const [msg, setMsg] = useState<{ type: "ok" | "err"; text: string } | null>(null)
  const [busy, setBusy] = useState(false)

  const [pickItem, setPickItem] = useState<string>("")
  const [form, setForm] = useState({
    title: "", platform: "tiktok", purpose: "engagement",
    audience: "remaja 18-24", topic: "", angle: "",
  })
  const [brief, setBrief] = useState({ objective: "", key_message: "", tone: "", do: "", dont: "" })
  const [script, setScript] = useState({ hook: "", narasi: "", cta: "", caption: "", hashtags: "", estimasi_durasi: 30 })
  const [scenes, setScenes] = useState([{ scene: 1, durasi: 3, visual: "", teks: "", audio: "", catatan: "" }])

  const loadResearch = useCallback(async () => {
    const r = await fetch("/api/research?with_items=1&limit=20")
    const j = await r.json()
    const flat: ResearchItem[] = []
    for (const rep of j.data ?? []) for (const it of rep.items ?? []) flat.push(it)
    setResearch(flat)
  }, [])

  const loadContents = useCallback(async () => {
    const r = await fetch("/api/content?limit=50")
    const j = await r.json()
    setContents(j.data ?? [])
  }, [])

  useEffect(() => { loadResearch(); loadContents() }, [loadResearch, loadContents])

  const flash = (type: "ok" | "err", text: string) => {
    setMsg({ type, text })
    setTimeout(() => setMsg(null), 4000)
  }

  async function openContent(id: string) {
    const r = await fetch(`/api/content/${id}`)
    const j = await r.json()
    if (!r.ok) return flash("err", j.error ?? "gagal memuat")
    setSelected(j.data)
    setBrief(j.data.brief?.body ?? { objective: "", key_message: "", tone: "", do: "", dont: "" })
    if (j.data.script) {
      setScript({
        hook: j.data.script.hook ?? "", narasi: j.data.script.narasi ?? "",
        cta: j.data.script.cta ?? "", caption: j.data.script.caption ?? "",
        hashtags: j.data.script.hashtags ?? "", estimasi_durasi: j.data.script.estimasi_durasi ?? 30,
      })
    }
    if (j.data.storyboard?.scenes?.length) setScenes(j.data.storyboard.scenes)
  }

  async function createContent(e: React.FormEvent) {
    e.preventDefault()
    if (!form.title.trim()) return flash("err", "Judul konten wajib diisi")
    setBusy(true)
    try {
      const r = await fetch("/api/content", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, research_item_id: pickItem || undefined }),
      })
      const j = await r.json()
      if (!r.ok) return flash("err", j.error ?? "gagal membuat konten")
      flash("ok", "Konten dibuat")
      setForm({ ...form, title: "", topic: "", angle: "" })
      setPickItem("")
      await loadContents()
      await openContent(j.data.id)
    } finally { setBusy(false) }
  }

  async function saveStep(step: "brief" | "script" | "storyboard") {
    if (!selected) return
    setBusy(true)
    try {
      const payload =
        step === "brief" ? { step, body: brief }
        : step === "script" ? { step, ...script }
        : { step, scenes }
      const r = await fetch(`/api/content/${selected.id}/step`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })
      const j = await r.json()
      if (!r.ok) return flash("err", j.error ?? "gagal menyimpan")
      flash("ok", step === "brief" ? "Brief tersimpan" : step === "script" ? "Naskah tersimpan" : "Storyboard tersimpan")
      await openContent(selected.id)
      await loadContents()
    } finally { setBusy(false) }
  }

  const doneBrief = !!selected?.brief
  const doneScript = !!selected?.script
  const doneBoard = !!selected?.storyboard
  const ready = doneBrief && doneScript && doneBoard

  return (
    <div className="min-h-screen bg-slate-100 p-6 md:p-10">
      <div className="mx-auto max-w-5xl">
        {/* Header */}
        <header className="mb-8">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h1 className="text-3xl font-extrabold tracking-tight text-[#0F2440]">Content Studio</h1>
              <p className="mt-1 text-sm text-slate-600">
                Dava — dari ide riset menjadi naskah &amp; storyboard siap produksi.
              </p>
            </div>
            <a href="/research" className="rounded-lg border border-[#0F2440] px-4 py-2 text-sm font-medium text-[#0F2440] hover:bg-[#0F2440] hover:text-white">
              ← Riset
            </a>
          </div>
        </header>

        {msg && (
          <div className={`mb-5 rounded-lg border px-4 py-3 text-sm ${msg.type === "ok" ? "border-emerald-300 bg-emerald-50 text-emerald-800" : "border-red-300 bg-red-50 text-red-700"}`}>
            {msg.text}
          </div>
        )}

        {/* 1. Buat konten dari riset */}
        <Section n={1} title="Pilih ide riset → buat konten" done={!!selected}>
          <form onSubmit={createContent} className="grid gap-3 md:grid-cols-2">
            <div className="md:col-span-2">
              <label className="mb-1 block text-xs font-medium text-slate-600">Ide dari riset (opsional)</label>
              <select
                value={pickItem}
                onChange={(e) => {
                  setPickItem(e.target.value)
                  const it = research.find((x) => x.id === e.target.value)
                  if (it) setForm((f) => ({ ...f, title: f.title || it.topic, topic: it.topic }))
                }}
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
              >
                <option value="">— tanpa ide riset —</option>
                {research.map((r) => (
                  <option key={r.id} value={r.id}>
                    [{r.platform ?? "-"}] {r.topic} · {r.verification_status ?? "Unverified"}
                  </option>
                ))}
              </select>
              {research.length === 0 && (
                <p className="mt-1 text-xs text-slate-500">Belum ada riset. Jalankan riset dulu di halaman Riset.</p>
              )}
            </div>

            <input required value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })}
              placeholder="Judul kerja konten" className="rounded-lg border border-slate-300 px-3 py-2 text-sm" />
            <select value={form.platform} onChange={(e) => setForm({ ...form, platform: e.target.value })}
              className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm">
              <option value="tiktok">TikTok</option>
              <option value="instagram">Instagram</option>
              <option value="youtube">YouTube</option>
            </select>
            <select value={form.purpose} onChange={(e) => setForm({ ...form, purpose: e.target.value })}
              className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm">
              <option value="engagement">Engagement</option>
              <option value="penjualan">Penjualan</option>
              <option value="brand awareness">Brand awareness</option>
              <option value="educational">Educational</option>
            </select>
            <select value={form.audience} onChange={(e) => setForm({ ...form, audience: e.target.value })}
              className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm">
              <option>remaja 18-24</option>
              <option>profesi</option>
              <option>ibu rumah tangga</option>
            </select>
            <input value={form.topic} onChange={(e) => setForm({ ...form, topic: e.target.value })}
              placeholder="Topik" className="rounded-lg border border-slate-300 px-3 py-2 text-sm" />
            <input value={form.angle} onChange={(e) => setForm({ ...form, angle: e.target.value })}
              placeholder="Angle / sudut pandang" className="rounded-lg border border-slate-300 px-3 py-2 text-sm" />

            <button disabled={busy} type="submit"
              className="md:col-span-2 rounded-lg bg-[#DC2626] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#b91c1c] disabled:opacity-60">
              {busy ? "Menyimpan..." : "Buat Konten"}
            </button>
          </form>
        </Section>

        {/* 2. Daftar konten */}
        <div className="mt-6">
          <Section n={2} title="Konten berjalan" done={contents.length > 0}>
            {contents.length === 0 ? (
              <p className="text-sm text-slate-500">Belum ada konten.</p>
            ) : (
              <ul className="divide-y divide-slate-100">
                {contents.map((c) => (
                  <li key={c.id} className="flex flex-wrap items-center justify-between gap-2 py-2.5">
                    <button onClick={() => openContent(c.id)} className="min-w-0 text-left">
                      <p className="truncate text-sm font-medium text-slate-800 hover:text-[#DC2626]">{c.title}</p>
                      <p className="text-xs text-slate-500">{c.platform} · {c.purpose ?? "-"}</p>
                    </button>
                    <div className="flex items-center gap-2">
                      <Badge text={c.status} />
                      <button onClick={() => openContent(c.id)}
                        className="rounded-md border border-slate-300 px-2.5 py-1 text-xs font-medium text-slate-700 hover:border-[#0F2440]">
                        Buka
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </Section>
        </div>

        {/* 3. Pipeline */}
        {selected && (
          <div className="mt-6 space-y-6">
            <div className="rounded-xl border border-slate-200 bg-white p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h2 className="text-lg font-bold text-[#0F2440]">{selected.title}</h2>
                  <p className="text-xs text-slate-500">
                    {selected.platform} · {selected.purpose ?? "-"} · {selected.audience ?? "-"}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge text={selected.status} />
                  {ready && <span className="rounded-full bg-emerald-600 px-2.5 py-0.5 text-xs font-semibold text-white">Siap Review</span>}
                </div>
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                {STATUS_FLOW.map((s, i) => {
                  const active = selected.status === s
                  const passed = STATUS_FLOW.indexOf(selected.status) > i
                  return (
                    <span key={s}
                      className={`rounded-full px-3 py-1 text-xs font-medium ${active ? "bg-[#0F2440] text-white" : passed ? "bg-emerald-100 text-emerald-800" : "bg-slate-100 text-slate-500"}`}>
                      {i + 1}. {s}
                    </span>
                  )
                })}
              </div>
            </div>

            {/* Brief */}
            <Section n={1} title="Content Brief" done={doneBrief}>
              <div className="grid gap-3 md:grid-cols-2">
                <input value={brief.objective ?? ""} onChange={(e) => setBrief({ ...brief, objective: e.target.value })}
                  placeholder="Tujuan konten" className="rounded-lg border border-slate-300 px-3 py-2 text-sm" />
                <input value={brief.tone ?? ""} onChange={(e) => setBrief({ ...brief, tone: e.target.value })}
                  placeholder="Tone (mis. santai, tegas)" className="rounded-lg border border-slate-300 px-3 py-2 text-sm" />
                <textarea value={brief.key_message ?? ""} onChange={(e) => setBrief({ ...brief, key_message: e.target.value })}
                  placeholder="Pesan kunci" rows={2} className="md:col-span-2 rounded-lg border border-slate-300 px-3 py-2 text-sm" />
                <input value={brief.do ?? ""} onChange={(e) => setBrief({ ...brief, do: e.target.value })}
                  placeholder="Wajib ada (do)" className="rounded-lg border border-slate-300 px-3 py-2 text-sm" />
                <input value={brief.dont ?? ""} onChange={(e) => setBrief({ ...brief, dont: e.target.value })}
                  placeholder="Hindari (don't)" className="rounded-lg border border-slate-300 px-3 py-2 text-sm" />
              </div>
              <button disabled={busy} onClick={() => saveStep("brief")}
                className="mt-3 rounded-lg bg-[#0F2440] px-4 py-2 text-sm font-semibold text-white hover:bg-[#1b3a60] disabled:opacity-60">
                {doneBrief ? "Simpan versi brief baru" : "Simpan Brief"}
              </button>
            </Section>

            {/* Script */}
            <Section n={2} title="Naskah" done={doneScript}>
              <div className="space-y-3">
                <input value={script.hook} onChange={(e) => setScript({ ...script, hook: e.target.value })}
                  placeholder="Hook (3 detik pertama)" className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" />
                <textarea value={script.narasi} onChange={(e) => setScript({ ...script, narasi: e.target.value })}
                  placeholder="Narasi / isi utama" rows={4} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" />
                <input value={script.cta} onChange={(e) => setScript({ ...script, cta: e.target.value })}
                  placeholder="CTA" className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" />
                <textarea value={script.caption} onChange={(e) => setScript({ ...script, caption: e.target.value })}
                  placeholder="Caption" rows={2} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" />
                <div className="grid gap-3 md:grid-cols-2">
                  <input value={script.hashtags} onChange={(e) => setScript({ ...script, hashtags: e.target.value })}
                    placeholder="#hashtag1 #hashtag2" className="rounded-lg border border-slate-300 px-3 py-2 text-sm" />
                  <input type="number" min={5} max={180} value={script.estimasi_durasi}
                    onChange={(e) => setScript({ ...script, estimasi_durasi: parseInt(e.target.value) || 30 })}
                    placeholder="Estimasi durasi (detik)" className="rounded-lg border border-slate-300 px-3 py-2 text-sm" />
                </div>
              </div>
              <button disabled={busy} onClick={() => saveStep("script")}
                className="mt-3 rounded-lg bg-[#0F2440] px-4 py-2 text-sm font-semibold text-white hover:bg-[#1b3a60] disabled:opacity-60">
                {doneScript ? "Simpan versi naskah baru" : "Simpan Naskah"}
              </button>
            </Section>

            {/* Storyboard */}
            <Section n={3} title="Storyboard" done={doneBoard}>
              <div className="space-y-3">
                {scenes.map((sc, i) => (
                  <div key={i} className="rounded-lg border border-slate-200 p-3">
                    <div className="mb-2 flex items-center justify-between">
                      <span className="text-xs font-semibold text-slate-500">Scene {i + 1}</span>
                      {scenes.length > 1 && (
                        <button onClick={() => setScenes(scenes.filter((_, x) => x !== i))}
                          className="text-xs text-red-600 hover:underline">Hapus</button>
                      )}
                    </div>
                    <div className="grid gap-2 md:grid-cols-2">
                      <input value={sc.visual} onChange={(e) => {
                        const n = [...scenes]; n[i] = { ...n[i], visual: e.target.value }; setScenes(n)
                      }} placeholder="Visual / aksi" className="rounded-lg border border-slate-300 px-3 py-2 text-sm" />
                      <input value={sc.teks} onChange={(e) => {
                        const n = [...scenes]; n[i] = { ...n[i], teks: e.target.value }; setScenes(n)
                      }} placeholder="Teks di layar" className="rounded-lg border border-slate-300 px-3 py-2 text-sm" />
                      <input value={sc.audio} onChange={(e) => {
                        const n = [...scenes]; n[i] = { ...n[i], audio: e.target.value }; setScenes(n)
                      }} placeholder="Audio / voice-over" className="rounded-lg border border-slate-300 px-3 py-2 text-sm" />
                      <input type="number" min={1} max={30} value={sc.durasi} onChange={(e) => {
                        const n = [...scenes]; n[i] = { ...n[i], durasi: parseInt(e.target.value) || 3 }; setScenes(n)
                      }} placeholder="Durasi (detik)" className="rounded-lg border border-slate-300 px-3 py-2 text-sm" />
                    </div>
                  </div>
                ))}
                <button onClick={() => setScenes([...scenes, { scene: scenes.length + 1, durasi: 3, visual: "", teks: "", audio: "", catatan: "" }])}
                  className="rounded-lg border border-dashed border-slate-400 px-3 py-2 text-xs font-medium text-slate-600 hover:border-[#0F2440]">
                  + Tambah scene
                </button>
              </div>
              <button disabled={busy} onClick={() => saveStep("storyboard")}
                className="mt-3 rounded-lg bg-[#0F2440] px-4 py-2 text-sm font-semibold text-white hover:bg-[#1b3a60] disabled:opacity-60">
                {doneBoard ? "Simpan versi storyboard baru" : "Simpan Storyboard"}
              </button>
            </Section>

            {/* Ringkasan kelengkapan */}
            <div className={`rounded-xl border p-5 ${ready ? "border-emerald-300 bg-emerald-50" : "border-slate-200 bg-white"}`}>
              <h3 className="text-sm font-semibold text-slate-700">Kelengkapan sebelum review</h3>
              <ul className="mt-2 space-y-1 text-sm">
                <li className={doneBrief ? "text-emerald-700" : "text-slate-500"}>{doneBrief ? "✓" : "○"} Brief</li>
                <li className={doneScript ? "text-emerald-700" : "text-slate-500"}>{doneScript ? "✓" : "○"} Naskah (hook, narasi, CTA)</li>
                <li className={doneBoard ? "text-emerald-700" : "text-slate-500"}>{doneBoard ? "✓" : "○"} Storyboard (scenes)</li>
              </ul>
              {ready && <p className="mt-3 text-sm font-medium text-emerald-800">Konten lengkap — siap masuk Approval Room.</p>}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
