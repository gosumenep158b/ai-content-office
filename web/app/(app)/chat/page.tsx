"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"

type Bot = { id: string; label: string; sub: string; initials: string; color: string }

const BOTS: Bot[] = [
  { id: "davadevis_bot", label: "davadevis", sub: "Dika & Kinan · otak", initials: "DV", color: "#0F2440" },
  { id: "dika_vm_bot", label: "dika_vm", sub: "Dava & Yanti · produksi", initials: "DK", color: "#DC2626" },
  { id: "om_muse_bot", label: "om_muse", sub: "Anton · publikasi", initials: "OM", color: "#0EA5E9" },
]

type Msg = { id: string; room: string; sender: string; body: string; created_at: string }

const GRUP = "kantor"

function dmRoom(a: string, b: string) {
  return `dm:${[a, b].sort().join(":")}`
}

function botById(id: string) {
  return BOTS.find((b) => b.id === id)
}

function jam(iso: string) {
  return new Date(iso).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })
}

function tanggalLabel(iso: string) {
  const d = new Date(iso)
  const now = new Date()
  const sama = d.toDateString() === now.toDateString()
  if (sama) return "Hari ini"
  const kemarin = new Date(now)
  kemarin.setDate(now.getDate() - 1)
  if (d.toDateString() === kemarin.toDateString()) return "Kemarin"
  return d.toLocaleDateString("id-ID", { day: "2-digit", month: "long" })
}

function Avatar({ bot, size = 40 }: { bot?: Bot; size?: number }) {
  if (!bot) return null
  return (
    <div
      className="flex shrink-0 items-center justify-center rounded-full font-semibold text-white"
      style={{ width: size, height: size, background: bot.color, fontSize: size * 0.34 }}
    >
      {bot.initials}
    </div>
  )
}

function GroupAvatar({ size = 40 }: { size?: number }) {
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      {BOTS.map((b, i) => (
        <div
          key={b.id}
          className="absolute rounded-full ring-2 ring-white"
          style={{
            width: size * 0.62,
            height: size * 0.62,
            background: b.color,
            left: i === 0 ? 0 : i === 1 ? size * 0.38 : size * 0.19,
            top: i === 2 ? size * 0.38 : 0,
            zIndex: 3 - i,
          }}
        />
      ))}
    </div>
  )
}

export default function ChatPage() {
  const [me, setMe] = useState<string>("dika_vm_bot")
  const [room, setRoom] = useState<string>(GRUP)
  const [messages, setMessages] = useState<Msg[]>([])
  const [draft, setDraft] = useState("")
  const [loading, setLoading] = useState(true)
  const [err, setErr] = useState<string | null>(null)
  const [showList, setShowList] = useState(true)
  const bottomRef = useRef<HTMLDivElement | null>(null)

  // identitas saya
  useEffect(() => {
    const saved = typeof window !== "undefined" ? localStorage.getItem("aico.chat.as") : null
    if (saved && BOTS.some((b) => b.id === saved)) setMe(saved)
  }, [])
  useEffect(() => {
    if (typeof window !== "undefined") localStorage.setItem("aico.chat.as", me)
  }, [me])

  const muat = useCallback(async () => {
    try {
      const r = await fetch(`/api/chat?room=${encodeURIComponent(room)}&limit=200`)
      const j = await r.json()
      if (!r.ok) { setErr(j.error ?? "gagal memuat pesan"); return }
      setErr(null)
      setMessages(j.data ?? [])
    } catch (e) {
      setErr(e instanceof Error ? e.message : "gagal memuat pesan")
    } finally {
      setLoading(false)
    }
  }, [room])

  useEffect(() => {
    setLoading(true)
    muat()
    const t = setInterval(muat, 4000)
    return () => clearInterval(t)
  }, [muat])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages.length, room])

  async function kirim(e: React.FormEvent) {
    e.preventDefault()
    const teks = draft.trim()
    if (!teks) return
    setDraft("")
    const payload: any = { sender: me, body: teks }
    if (room === GRUP) payload.room = GRUP
    else {
      const other = room.split(":").filter((x) => x !== "dm" && x !== me)[0]
      payload.to = other
    }
    const r = await fetch("/api/chat", {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload),
    })
    if (!r.ok) {
      const j = await r.json().catch(() => ({}))
      setErr(j.error ?? "gagal mengirim")
      setDraft(teks)
      return
    }
    await muat()
  }

  // daftar percakapan
  const rooms = useMemo(() => {
    const list = [{ id: GRUP, nama: "Kantor", sub: "Semua worker", grup: true }]
    for (const b of BOTS) {
      if (b.id === me) continue
      list.push({ id: dmRoom(me, b.id), nama: b.label, sub: b.sub, grup: false })
    }
    return list
  }, [me])

  const roomAktif = rooms.find((r) => r.id === room) ?? rooms[0]

  // kelompokkan per tanggal
  const grupPesan = useMemo(() => {
    const out: { label: string; items: Msg[] }[] = []
    for (const m of messages) {
      const label = tanggalLabel(m.created_at)
      const last = out[out.length - 1]
      if (last && last.label === label) last.items.push(m)
      else out.push({ label, items: [m] })
    }
    return out
  }, [messages])

  return (
    <div className="flex h-[calc(100dvh-56px)] overflow-hidden bg-[#F2F2F7] md:h-[calc(100vh-0px)]">
      {/* ==== Daftar percakapan ==== */}
      <aside className={`${showList ? "flex" : "hidden"} min-h-0 w-full flex-col border-r border-black/10 bg-white md:flex md:w-80`}>
        <div className="border-b border-black/5 px-4 py-3">
          <div className="flex items-center justify-between">
            <h1 className="text-[22px] font-bold tracking-tight text-black">Chat</h1>
            <select
              value={me}
              onChange={(e) => { setMe(e.target.value); setRoom(GRUP) }}
              className="rounded-lg border border-black/10 bg-[#F2F2F7] px-2 py-1 text-[12px] font-medium text-black"
              title="Saya masuk sebagai"
            >
              {BOTS.map((b) => <option key={b.id} value={b.id}>{b.label}</option>)}
            </select>
          </div>
          <p className="mt-0.5 text-[11px] text-black/45">Anda masuk sebagai {botById(me)?.label}</p>
        </div>

        <div className="flex-1 overflow-y-auto">
          {rooms.map((r) => (
            <button
              key={r.id}
              onClick={() => { setRoom(r.id); setShowList(false) }}
              className={`flex w-full items-center gap-3 px-4 py-3 text-left transition ${
                room === r.id ? "bg-[#007AFF]/10" : "hover:bg-black/[0.03]"
              }`}
            >
              {r.grup ? <GroupAvatar size={44} /> : <Avatar bot={botById(r.id.split(":").find((x) => x !== "dm" && x !== me) || "")} size={44} />}
              <div className="min-w-0 flex-1">
                <div className="flex items-baseline justify-between gap-2">
                  <p className="truncate text-[15px] font-semibold text-black">{r.nama}</p>
                  <span className="shrink-0 text-[11px] text-black/35">›</span>
                </div>
                <p className="truncate text-[12.5px] text-black/45">{r.sub}</p>
              </div>
            </button>
          ))}
        </div>

        <div className="border-t border-black/5 px-4 py-2 text-[10.5px] leading-relaxed text-black/35">
          Pembagian: davadevis (Dika+Kinan) · dika_vm (Dava+Yanti) · om_muse (Anton)
        </div>
      </aside>

      {/* ==== Thread ==== */}
      <section className={`${showList ? "hidden" : "flex"} min-h-0 min-w-0 flex-1 flex-col md:flex`}>
        {/* Header */}
        <header className="flex items-center gap-3 border-b border-black/10 bg-white/80 px-4 py-2.5 backdrop-blur">
          <button className="text-[#007AFF] md:hidden" onClick={() => setShowList(true)} aria-label="Kembali">
            ‹
          </button>
          {roomAktif.grup ? <GroupAvatar size={34} /> : <Avatar bot={botById(roomAktif.id.split(":").find((x) => x !== "dm" && x !== me) || "")} size={34} />}
          <div className="min-w-0">
            <p className="truncate text-[15px] font-semibold text-black">{roomAktif.nama}</p>
            <p className="text-[11px] text-black/45">{roomAktif.sub}</p>
          </div>
        </header>

        {err && <div className="mx-4 mt-3 rounded-lg bg-red-50 px-3 py-2 text-[12px] text-red-700">{err}</div>}

        {/* Pesan */}
        <div className="flex-1 overflow-y-auto px-3 py-4 md:px-6">
          {loading && <p className="py-8 text-center text-[13px] text-black/40">Memuat pesan…</p>}
          {!loading && messages.length === 0 && (
            <div className="mx-auto mt-10 max-w-xs text-center">
              <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-white text-2xl shadow-sm">💬</div>
              <p className="text-[14px] font-medium text-black/70">Belum ada pesan</p>
              <p className="mt-1 text-[12px] text-black/40">Mulai percakapan dengan worker lain.</p>
            </div>
          )}

          {grupPesan.map((g) => (
            <div key={g.label}>
              <p className="my-3 text-center text-[11px] font-medium text-black/40">{g.label}</p>
              {g.items.map((m, i) => {
                const mine = m.sender === me
                const sender = botById(m.sender)
                const prev = g.items[i - 1]
                const bedaPengirim = !prev || prev.sender !== m.sender
                const jarak = prev ? (new Date(m.created_at).getTime() - new Date(prev.created_at).getTime()) / 60000 : 999
                const pisah = bedaPengirim || jarak > 5

                return (
                  <div key={m.id} className={`flex items-end gap-2 ${mine ? "justify-end" : "justify-start"} ${pisah ? "mt-3" : "mt-0.5"}`}>
                    {!mine && (
                      <div className="w-7 shrink-0">
                        {pisah && sender ? <Avatar bot={sender} size={28} /> : null}
                      </div>
                    )}
                    <div className={`max-w-[78%] md:max-w-[62%] ${mine ? "items-end" : "items-start"} flex flex-col`}>
                      {!mine && pisah && roomAktif.grup && (
                        <span className="mb-0.5 pl-1 text-[10.5px] font-medium text-black/40">{sender?.label ?? m.sender}</span>
                      )}
                      <div
                        className={`whitespace-pre-wrap break-words px-3.5 py-2 text-[14.5px] leading-[1.35] ${
                          mine ? "text-white" : "bg-[#E9E9EB] text-black"
                        }`}
                        style={{
                          borderRadius: 18,
                          borderBottomRightRadius: mine ? 6 : 18,
                          borderBottomLeftRadius: mine ? 18 : 6,
                          background: mine ? "linear-gradient(180deg,#0A84FF,#007AFF)" : undefined,
                        }}
                      >
                        {m.body}
                      </div>
                      <span className={`mt-0.5 px-1 text-[10px] ${mine ? "text-black/30 text-right" : "text-black/30"}`}>
                        {jam(m.created_at)}
                      </span>
                    </div>
                  </div>
                )
              })}
            </div>
          ))}
          <div ref={bottomRef} />
        </div>

        {/* Composer */}
        <form onSubmit={kirim} className="border-t border-black/10 bg-white/95 px-3 pt-2.5 backdrop-blur"
          style={{ paddingBottom: "max(0.625rem, env(safe-area-inset-bottom))" }}>
          <div className="flex items-end gap-2">
            <div className="flex-1 rounded-[20px] border border-black/10 bg-white px-4 py-2">
              <textarea
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); kirim(e as any) }
                }}
                rows={1}
                placeholder="Pesan"
                className="max-h-28 w-full resize-none bg-transparent text-[16px] text-black outline-none placeholder:text-black/35 md:text-[14.5px]"
              />
            </div>
            <button
              type="submit"
              disabled={!draft.trim()}
              aria-label="Kirim"
              className="mb-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full transition disabled:opacity-35"
              style={{ background: "linear-gradient(180deg,#0A84FF,#007AFF)" }}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 19V5" /><path d="M5 12l7-7 7 7" />
              </svg>
            </button>
          </div>
        </form>
      </section>
    </div>
  )
}