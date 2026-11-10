# Brand Guide — AI Virtual Content Office

Panduan identitas visual produk. Acuan: PRD AI Virtual Content Office v1.0 §21 (Premium AI Agency Dashboard — latar putih/abu muda, sidebar navy gelap, aksen merah) dan scaffold aplikasi yang sudah memakai `bg-gray-50`, teks `gray-900`, dan aksen `red-600`.

> Brand ini milik produk **AI Virtual Content Office**. Bukan logo GO — produk ini berbeda, jadi aturan logo GO tidak berlaku di sini.

## Palet

| Nama | Hex | Pakai |
|---|---|---|
| Navy | `#0F2440` | Sidebar, latar gelap, teks judul, latar logo |
| Navy 2 | `#1B3A5C` | Gradasi / elemen sekunder di atas navy |
| Merah | `#DC2626` | Aksen utama — CTA, progress, penekanan (sama dengan `red-600` Tailwind) |
| Amber | `#F59E0B` | Aksen sekunder — sorotan kecil, jangan dipakai bersamaan dengan merah dalam satu elemen |
| Abu muda | `#F9FAFB` | Latar aplikasi (`gray-50`) |
| Abu garis | `#E5E7EB` | Border kartu (`gray-200`) |
| Teks | `#111827` | Teks utama (`gray-900`) |
| Teks redup | `#6B7280` | Teks sekunder (`gray-500`) |
| Putih | `#FFFFFF` | Kartu, teks di atas navy |

## Tipografi

- **Font:** Inter, fallback `system-ui, -apple-system, "Segoe UI", sans-serif`.
- **Judul:** 800 (ExtraBold), tracking −1% — contoh: `AI Virtual`.
- **Sub-judul / label:** 700 (Bold), huruf kapital + letter-spacing untuk label pendek — contoh: `CONTENT OFFICE`.
- **Isi:** 400/500, `#111827` di atas `#F9FAFB` atau putih.
- **Subtitle video (burned-in):** Inter tebal 64 px pada kanvas 1080 — lihat `docs/video/faceless-preview-design.md`.

## Logo

| File | Kegunaan |
|---|---|
| `logo.svg` | Lockup horizontal (mark + wordmark) — header, login, dokumen |
| `logo-mark.svg` | Mark saja — avatar, sidebar kecil, watermark |
| `favicon.svg` | Favicon — salin ke `web/app/icon.svg` (konvensi Next.js App Router) |

**Konsep mark:** kotak navy membulat + segitiga play putih (video) + tiga garis naskah (konten), garis tengah merah (aksen).

### Aturan pakai logo

- **Ruang aman:** minimal setinggi segitiga play di semua sisi.
- **Ukuran minimum digital:** mark 32 px, lockup 160 px lebar.
- **Jangan:** mengubah warna, memanjangkan/menggepengkan, menambah efek (bayangan, gradasi di luar palet), menaruh di atas latar ramai tanpa kontras, atau memotong mark.
- **Latar yang diizinkan:** putih, `#F9FAFB`, navy `#0F2440`. Di atas navy, pakai versi mark dengan garis putih tetap terbaca (sudah bawaan SVG).

## Ilustrasi empty state

| File | Kegunaan |
|---|---|
| `empty-tasks.svg` | Daftar task kosong (Task Management, Dashboard) |
| `empty-research.svg` | Belum ada laporan/item riset (Research Center) |
| `empty-video.svg` | Belum ada video/preview (Video Production) |

Ilustrasi tanpa teks — caption ditulis oleh aplikasi sesuai konteks dan bahasa pengguna. Ukuran tampil yang disarankan: lebar 240–320 px di desktop, 200 px di mobile.

## Ekspor PNG

Semua aset disimpan sebagai **SVG** (teks, bisa di-push lewat GitHub connector). Bila butuh PNG (misalnya untuk media sosial atau dokumen):

```bash
# contoh dengan rsvg-convert (librsvg) atau inkscape
rsvg-convert -w 1024 -h 1024 docs/assets/logo-mark.svg -o logo-mark-1024.png
rsvg-convert -w 512 -h 512 docs/assets/favicon.svg -o favicon-512.png
```

Jangan commit PNG hasil ekspor ke repo kecuali tim memutuskan — SVG adalah sumber kebenaran.

## Integrasi ke `web/` (untuk tim UI — @dika_vm_bot)

- Favicon: salin `favicon.svg` ke `web/app/icon.svg`.
- Logo sidebar/topbar: pakai `logo-mark.svg` (kecil) atau `logo.svg` (header login).
- Empty state: pakai `empty-*.svg` di komponen daftar kosong.
- Warna sudah selaras dengan scaffold (`gray-50`, `red-600`); navy `#0F2440` dipakai untuk sidebar gelap sesuai PRD §21.
