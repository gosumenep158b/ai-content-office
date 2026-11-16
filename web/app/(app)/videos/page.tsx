"use client"

import { useCallback, useEffect, useMemo, useState } from "react"

type Video = {
  id: string
  content_id: string | null
  status: string
  file_path: string | null
  checksum: string | null
  catatan: string | null
  spec: any
  created_at: string
}

type Content = { id: string; title: string; platform: string | null }

const STATUS_STYLE: Record<string, string> = {
  draft: "bg-slate-100 text-slate-600",
  preview: "bg-blue-100 text-blue-800",
  revision: "bg-amber-100 text-amber-800",
  final: "bg-emerald-100 text-emerald-800",
}

function bisaDiputar(path: string | null) {
  if (!path) return false
  return /^https?:\/\//i.test(path) || path.startsWith("/")
}

export default function VideosPage() {
  const [videos, setVideos] = useState<Video[]>([])
  const [contents, setContents] = useState<Record<string, Content>>({})
  const [filter, setFilter] = useState<string>("all")
  const [loading, setLoading] = useState(true)
  const [err, setErr] = useState<string | null>(null)
  const [aktif, setAktif] = useState<Video | null>(null)

  const muat = useCallback(async () => {
    try {
      const [v, c] = await Promise.all([
        fetch("/api/videos").then((r) => r.json()),
        fetch("/api/content?limit=100").then((r) => r.json()),
      ])
      if (v.error) { setErr(v.error); return }
      setVideos(v.data ?? [])
      const map: Record<string, Content> = {}
      for (const x of c.data ?? []) map[x.id] = x
      setContents(map)
    } catch (e) {
      setErr(e instanceof Error ? e.message : "gagal memuat video")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { muat() }, [muat])

  const daftar = useMemo(
    () => (filter === "all" ? videos : videos.filter((v) => v.status === filter)),
    [videos, filter],
  )

  const jumlah = useMemo(() => {
    const c: Record<string, number> = { all: videos.length }
    for (const v of videos) c[v.status] = (c[v.status] ?? 0) + 1
    return c
  }, [videos])

  return (
    <div className="min-h-screen bg-slate-100 p-5 md:p-8">
      <header className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-[#0F2440]">Video Library</h1>
          <p className="mt-1 text-sm text-slate-600">Semua versi video yang sudah dirender Yanti.</p>
        </div>
        <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-slate-700 ring-1 ring-slate-200">
          {videos.length} versi
        </span>
      </header>

      {err && (
        <div className="mb-5 rounded-lg border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-700">{err}</div>
      )}

      {/* Filter status */}
      <div className="mb-5 flex flex-wrap gap-2">
        {[
          ["all", "Semua"], ["draft", "Draft"], ["preview", "Preview"],
          ["revision", "Revisi"], ["final", "Final"],
        ].map(([k, label]) => (
          <button
            key={k}
            onClick={() => setFilter(k)}
            className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${
              filter === k ? "bg-[#0F2440] text-white" : "bg-white text-slate-600 ring-1 ring-slate-200 hover:bg-slate-50"
            }`}
          >
            {label} {jumlah[k] ? `(${jumlah[k]})` : ""}
          </button>
        ))}
      </div>

      {loading && <p className="text-sm text-slate-500">Memuat video…</p>}

      {!loading && daftar.length === 0 && (
        <div className="rounded-xl border border-slate-200 bg-white p-10 text-center">
          <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-slate-100 text-2xl">🎬</div>
          <p className="text-sm font-medium text-slate-700">Belum ada video</p>
          <p className="mt-1 text-xs text-slate-500">
            Video muncul setelah worker Yanti merender storyboard konten.
          </p>
        </div>
      )}

      {/* Grid video */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {daftar.map((v) => {
          const c = v.content_id ? contents[v.content_id] : undefined
          const playable = bisaDiputar(v.file_path)
          return (
            <article key={v.id} className="overflow-hidden rounded-xl border border-slate-200 bg-white">
              <button
                onClick={() => setAktif(v)}
                className="relative block w-full bg-slate-900"
                style={{ aspectRatio: "9 / 16" }}
                title={c?.title ?? "video"}
              >
                {playable ? (
                  <video
                    src={v.file_path!}
                    className="absolute inset-0 h-full w-full object-cover"
                    muted
                    playsInline
                    preload="metadata"
                  />
                ) : (
                  <span className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-slate-400">
                    <span className="text-3xl">🎞️</span>
                    <span className="px-4 text-center text-[11px]">
                      {v.file_path ? "file lokal worker — belum dihosting" : "belum ada file"}
                    </span>
                  </span>
                )}
                <span className={`absolute left-2 top-2 rounded-full px-2 py-0.5 text-[10.5px] font-semibold ${STATUS_STYLE[v.status] ?? "bg-white/90 text-slate-700"}`}>
                  {v.status}
                </span>
              </button>

              <div className="p-3">
                <p className="truncate text-sm font-semibold text-slate-800">
                  {c?.title ?? "Konten tidak diketahui"}
                </p>
                <p className="mt-0.5 text-[11px] text-slate-500">
                  {c?.platform ?? "-"} · {new Date(v.created_at).toLocaleString("id-ID", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}
                </p>
                {v.catatan && <p className="mt-1 line-clamp-2 text-[11px] text-slate-500">{v.catatan}</p>}
                <div className="mt-2 flex items-center gap-2">
                  <a href={`/studio`} className="text-[11px] font-medium text-[#0F2440] underline">Buka studio</a>
                  {playable && (
                    <a href={v.file_path!} target="_blank" rel="noopener noreferrer"
                      className="text-[11px] font-medium text-[#DC2626] underline">Unduh</a>
                  )}
                </div>
              </div>
            </article>
          )
        })}
      </div>

      {/* Modal putar */}
      {aktif && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
          onClick={() => setAktif(null)}>
          <div className="w-full max-w-sm" onClick={(e) => e.stopPropagation()}>
            <div className="overflow-hidden rounded-2xl bg-black" style={{ aspectRatio: "9 / 16" }}>
              {bisaDiputar(aktif.file_path) ? (
                <video src={aktif.file_path!} controls autoPlay playsInline className="h-full w-full" />
              ) : (
                <div className="flex h-full flex-col items-center justify-center gap-3 p-6 text-center text-slate-300">
                  <span className="text-4xl">🎞️</span>
                  <p className="text-sm">File video ada di worker, belum dihosting.</p>
                  <p className="text-[11px] text-slate-400 break-all">{aktif.file_path ?? "-"}</p>
                </div>
              )}
            </div>
            <button onClick={() => setAktif(null)}
              className="mt-3 w-full rounded-lg bg-white/90 py-2 text-sm font-semibold text-slate-800">
              Tutup
            </button>
          </div>
        </div>
      )}
    </div>
  )
}