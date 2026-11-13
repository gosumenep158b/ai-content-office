"use client"

import { useCallback, useEffect, useState } from "react"
import Link from "next/link"
import { useSearchParams } from "next/navigation"
import { cn } from "@/lib/utils"

type Divisi = {
  id: string
  nama: string
  role: string
  total: number
  selesai: number
  berjalan: number
  tertunda: number
  progress: number
}

const ROLE_COLOR: Record<string, string> = {
  Manager: "bg-[#0F2440]",
  Research: "bg-blue-600",
  "Content Strategist": "bg-purple-600",
  "Video Producer": "bg-amber-600",
  Publisher: "bg-emerald-600",
}

const ROLE_ICON: Record<string, string> = {
  Manager: "M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5",
  Research: "M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z",
  "Content Strategist": "M14.5 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V7.5L14.5 2zM16 2v5h5",
  "Video Producer": "M23 7l-7 5 7 5V7zM1 5h15v14H1z",
  Publisher: "M20 4H4a2 2 0 00-2 2v12a2 2 0 002 2h16a2 2 0 002-2V6a2 2 0 00-2-2zM7 7h10M7 11h10M7 15h6",
}

const ROLE_ORDER: Record<string, number> = {
  Manager: 0,
  Research: 1,
  "Content Strategist": 2,
  "Video Producer": 3,
  Publisher: 4,
}

export default function Sidebar() {
  const [divisi, setDivisi] = useState<Divisi[]>([])
  const [ringkasan, setRingkasan] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const sp = useSearchParams()
  const activeId = sp.get("agent")

  const load = useCallback(async () => {
    try {
      const r = await fetch("/api/office")
      const j = await r.json()
      if (r.ok) {
        const list = [...(j.data?.divisi ?? [])].sort(
          (a: Divisi, b: Divisi) => (ROLE_ORDER[a.role] ?? 99) - (ROLE_ORDER[b.role] ?? 99)
        )
        setDivisi(list)
        setRingkasan(j.data?.ringkasan ?? null)
      }
    } catch {
      /* diamkan — sidebar tetap tampil kosong */
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  return (
    <aside className="hidden lg:flex w-72 shrink-0 flex-col border-r border-slate-200 bg-white sticky top-0 h-screen">
      {/* Brand */}
      <div className="flex items-center gap-3 border-b border-slate-200 p-4">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#0F2440]">
          <svg className="h-5 w-5 text-white" fill="currentColor" viewBox="0 0 24 24">
            <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
          </svg>
        </div>
        <div className="min-w-0">
          <p className="truncate text-sm font-bold text-slate-900">AI Content Office</p>
          <p className="text-[10px] text-slate-500">GO Sumenep</p>
        </div>
      </div>

      {/* Menu divisi */}
      <nav className="flex-1 space-y-1 overflow-y-auto p-3" aria-label="Menu divisi">
        <p className="px-3 pb-1 pt-2 text-[10px] font-bold uppercase tracking-widest text-slate-400">
          Divisi
        </p>

        {loading && <p className="px-3 py-2 text-xs text-slate-400">Memuat…</p>}

        {divisi.map((d) => {
          const aktif = activeId === d.id
          return (
            <Link
              key={d.id}
              href={`/office?agent=${d.id}`}
              className={cn(
                "flex items-center gap-3 rounded-xl px-3 py-2.5 transition",
                aktif ? "bg-slate-100 ring-1 ring-slate-200" : "hover:bg-slate-50"
              )}
            >
              <span className={cn("flex h-8 w-8 shrink-0 items-center justify-center rounded-xl text-white", ROLE_COLOR[d.role] ?? "bg-slate-500")}>
                <svg className="h-4.5 w-4.5" width="18" height="18" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
                  <path d={ROLE_ICON[d.role] ?? ROLE_ICON.Manager} />
                </svg>
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-medium capitalize text-slate-900">{d.nama}</span>
                <span className="block truncate text-[10px] text-slate-500">{d.role}</span>
              </span>
              <span className="flex shrink-0 items-center gap-1">
                <span className="rounded-full bg-emerald-100 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-700">{d.selesai}</span>
                <span className="rounded-full bg-blue-100 px-1.5 py-0.5 text-[10px] font-semibold text-blue-700">{d.berjalan}</span>
                <span className="rounded-full bg-slate-100 px-1.5 py-0.5 text-[10px] font-semibold text-slate-600">{d.tertunda}</span>
              </span>
            </Link>
          )
        })}

        {!loading && divisi.length === 0 && (
          <p className="px-3 py-2 text-xs text-slate-400">Belum ada divisi.</p>
        )}

        {/* Navigasi modul */}
        <p className="px-3 pb-1 pt-4 text-[10px] font-bold uppercase tracking-widest text-slate-400">
          Modul
        </p>
        {[
          { href: "/dashboard", label: "Task Management" },
          { href: "/research", label: "Research Center" },
          { href: "/studio", label: "Content Studio" },
          { href: "/office", label: "Main Office" },
        ].map((m) => (
          <Link key={m.href} href={m.href}
            className="flex items-center gap-3 rounded-xl px-3 py-2 text-sm text-slate-700 hover:bg-slate-50">
            <span className="h-1.5 w-1.5 rounded-full bg-slate-400" />
            {m.label}
          </Link>
        ))}
      </nav>

      {/* Ringkasan */}
      {ringkasan && (
        <div className="border-t border-slate-200 p-3">
          <div className="rounded-lg bg-slate-50 p-3">
            <p className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-slate-500">Ringkasan</p>
            <div className="flex flex-wrap gap-1 text-[10px]">
              <span className="rounded bg-emerald-100 px-2 py-0.5 text-emerald-800">Selesai {ringkasan.selesai}</span>
              <span className="rounded bg-blue-100 px-2 py-0.5 text-blue-800">Berjalan {ringkasan.berjalan}</span>
              <span className="rounded bg-slate-200 px-2 py-0.5 text-slate-700">Tertunda {ringkasan.tertunda}</span>
            </div>
          </div>
        </div>
      )}
    </aside>
  )
}