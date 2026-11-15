import { NextResponse } from 'next/server'

// Callback OAuth TikTok — wiring penuh menyusul (token exchange & simpan).
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const code = searchParams.get('code') ?? ''
  const err = searchParams.get('error')
  const html = `<!doctype html><html lang="id"><body style="font-family:system-ui;max-width:520px;margin:60px auto;padding:0 20px">
  <h1 style="font-size:22px">${err ? 'Koneksi gagal' : 'TikTok terhubung ✅'}</h1>
  <p style="color:#667">${err ? 'Error: ' + err : code ? 'Kode otorisasi diterima. Lanjutkan di aplikasi AI Content Office.' : 'Tidak ada kode yang diterima.'}</p>
  <a href="https://ai-content-office.vercel.app/analytics" style="color:#DC2626">← Kembali ke aplikasi</a>
  </body></html>`
  return new NextResponse(html, { headers: { 'Content-Type': 'text/html; charset=utf-8' } })
}
