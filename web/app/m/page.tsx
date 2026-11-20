"use client"

import { useCallback, useEffect, useRef, useState } from "react"

type Agent = { id: string; name: string; role: string; initials: string; color: string }
type Msg = { id: string; agent: string; sender: string; body: string; created_at: string }

const AGENTS: Agent[] = [
  { id: "lightvela", name: "LightVela", role: "Vision & visual", initials: "LV", color: "#7C3AED" },
  { id: "muse", name: "Muse", role: "Creative & strategy", initials: "MU", color: "#0EA5E9" },
  { id: "cue", name: "Cue", role: "Koordinator", initials: "CU", color: "#F59E0B" },
  { id: "dika_vm", name: "Dika", role: "Manager", initials: "DK", color: "#0F2440" },
  { id: "gemini", name: "Gemini", role: "Analis & riset", initials: "GM", color: "#4285F4" },
  { id: "grok", name: "Grok", role: "Ide & opini", initials: "GK", color: "#111827" },
]

function jam(iso: string) {
  return new Date(iso).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })
}

function hariIni(iso: string) {
  const d = new Date(iso)
  const now = new Date()
  if (d.toDateString() === now.toDateString()) return "Hari ini"
  const y = new Date(now); y.setDate(now.getDate() - 1)
  if (d.toDateString() === y.toDateString()) return "Kemarin"
  return d.toLocaleDateString("id-ID", { day: "2-digit", month: "long" })
}

export default function MobileChat() {
  const [aktif, setAktif] = useState<string>("dika_vm")
  const [msgs, setMsgs] = useState<Msg[]>([])
  const [draft, setDraft] = useState("")
  const [loading, setLoading] = useState(true)
  const [view, setView] = useState<"list" | "chat">("list")
  const bottom = useRef<HTMLDivElement | null>(null)

  const muat = useCallback(async (agent: string) => {
    const r = await fetch(`/api/m/chat?agent=${agent}`)
    const j = await r.json()
    if (!j.error) setMsgs(j.data ?? [])
    setLoading(false)
  }, [])

  useEffect(() => { muat(aktif); const t = setInterval(() => muat(aktif), 5000); return () => clearInterval(t) }, [aktif, muat])
  useEffect(() => { bottom.current?.scrollIntoView({ behavior: "smooth" }) }, [msgs.length, view])

  async function kirim(e: React.FormEvent) {
    e.preventDefault()
    const teks = draft.trim()
    if (!teks) return
    setDraft("")
    await fetch("/api/m/chat", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ agent: aktif, body: teks }),
    })
    await muat(aktif)
  }

  const a = AGENTS.find((x) => x.id === aktif)!

  return (
    <div className="fixed inset-0 flex flex-col bg-[#F2F2F7]" style={{ height: "100dvh" }}>
      {/* header */}
      <header className="flex items-center gap-3 border-b border-black/10 bg-white/90 px-4 py-3 backdrop-blur"
        style={{ paddingTop: "max(0.75rem, env(safe-area-inset-top))" }}>
        {view === "chat" ? (
          <button onClick={() => setView("list")} className="text-[22px] leading-none text-[#007AFF]">‹</button>
        ) : (
          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-[#0F2440]">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round">
              <path d="M12 2L2 7l10 5 10-5-10-5z" /><path d="M2 17l10 5 10-5" />
            </svg>
          </div>
        )}
        <div className="min-w-0 flex-1">
          <p className="truncate text-[16px] font-semibold text-black">
            {view === "chat" ? a.name : "Agent Chat"}
          </p>
          <p className="truncate text-[11px] text-black/45">
            {view === "chat" ? a.role : "LightVela · Muse · Cue · Dika"}
          </p>
        </div>
        {view === "chat" && (
          <div className="flex h-8 w-8 items-center justify-center rounded-full text-white text-[11px] font-bold"
            style={{ background: a.color }}>{a.initials}</div>
        )}
      </header>

      {/* daftar agent */}
      {view === "list" && (
        <div className="flex-1 overflow-y-auto">
          {AGENTS.map((ag) => (
            <button key={ag.id}
              onClick={() => { setAktif(ag.id); setView("chat"); setLoading(true) }}
              className="flex w-full items-center gap-3 border-b border-black/5 bg-white px-4 py-3 text-left active:bg-black/5">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-white text-[13px] font-bold"
                style={{ background: ag.color }}>{ag.initials}</div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-[15px] font-semibold text-black">{ag.name}</p>
                <p className="truncate text-[12px] text-black/45">{ag.role}</p>
              </div>
              <span className="text-black/25">›</span>
            </button>
          ))}
          <p className="px-5 py-4 text-[11px] leading-relaxed text-black/35">
            Tambahkan ke layar utama lewat menu browser → “Add to Home Screen” untuk memakai sebagai aplikasi.
          </p>
        </div>
      )}

      {/* thread */}
      {view === "chat" && (
        <>
          <div className="flex-1 overflow-y-auto px-3 py-3">
            {loading && <p className="py-6 text-center text-[13px] text-black/40">Memuat…</p>}
            {!loading && msgs.length === 0 && (
              <div className="mx-auto mt-10 max-w-xs text-center">
                <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-white text-2xl shadow-sm">💬</div>
                <p className="text-[14px] font-medium text-black/70">Mulai percakapan dengan {a.name}</p>
              </div>
            )}
            {msgs.map((m, i) => {
              const mine = m.sender === "me"
              const prev = msgs[i - 1]
              const beda = !prev || prev.sender !== m.sender
              const bedaHari = !prev || hariIni(prev.created_at) !== hariIni(m.created_at)
              return (
                <div key={m.id}>
                  {bedaHari && <p className="my-3 text-center text-[11px] font-medium text-black/40">{hariIni(m.created_at)}</p>}
                  <div className={`flex items-end gap-2 ${mine ? "justify-end" : "justify-start"} ${beda ? "mt-2.5" : "mt-0.5"}`}>
                    {!mine && (
                      <div className="w-7 shrink-0">
                        {beda ? (
                          <div className="flex h-7 w-7 items-center justify-center rounded-full text-white text-[10px] font-bold"
                            style={{ background: a.color }}>{a.initials}</div>
                        ) : null}
                      </div>
                    )}
                    <div className={`max-w-[78%] flex flex-col ${mine ? "items-end" : "items-start"}`}>
                      <div
                        className={`whitespace-pre-wrap break-words px-3.5 py-2 text-[15.5px] leading-[1.35] ${mine ? "text-white" : "bg-[#E9E9EB] text-black"}`}
                        style={{
                          borderRadius: 18,
                          borderBottomRightRadius: mine ? 6 : 18,
                          borderBottomLeftRadius: mine ? 18 : 6,
                          background: mine ? "linear-gradient(180deg,#0A84FF,#007AFF)" : undefined,
                        }}
                      >{m.body}</div>
                      <span className="mt-0.5 px-1 text-[10px] text-black/30">{jam(m.created_at)}</span>
                    </div>
                  </div>
                </div>
              )
            })}
            <div ref={bottom} />
          </div>

          <form onSubmit={kirim} className="border-t border-black/10 bg-white px-3 pt-2.5"
            style={{ paddingBottom: "max(0.625rem, env(safe-area-inset-bottom))" }}>
            <div className="flex items-end gap-2">
              <div className="flex-1 rounded-[20px] border border-black/10 bg-white px-4 py-2">
                <textarea
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); kirim(e as any) } }}
                  rows={1}
                  placeholder={`Pesan ke ${a.name}`}
                  className="max-h-28 w-full resize-none bg-transparent text-[16px] text-black outline-none placeholder:text-black/35"
                />
              </div>
              <button type="submit" disabled={!draft.trim()} aria-label="Kirim"
                className="mb-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full disabled:opacity-35"
                style={{ background: "linear-gradient(180deg,#0A84FF,#007AFF)" }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 19V5" /><path d="M5 12l7-7 7 7" />
                </svg>
              </button>
            </div>
          </form>
        </>
      )}
    </div>
  )
}