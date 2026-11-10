# Template Konten — `content_scripts` & `storyboards`

Template dan skema untuk output Dava (Content Strategist), memetakan langsung ke tabel di migrasi `001_initial_schema.sql`. Acuan: PRD AI Virtual Content Office v1.0 — §9, §12, Lampiran A.

## Isi folder

| File | Kegunaan |
|---|---|
| `script-template.md` | Template naskah + contoh terisi (60 detik) + checklist handoff |
| `storyboard-template.md` | Template storyboard + contoh terisi (pasangan naskah contoh) + checklist handoff |
| `script.schema.json` | JSON Schema validasi `content_scripts` (dipakai backend, PRD §10) |
| `storyboard.schema.json` | JSON Schema validasi `storyboards` (dipakai backend, PRD §10) |

## Pemetaan ke database

### `content_scripts`

| Template | Kolom |
|---|---|
| Judul kerja | `contents.title` |
| Hook | `hook` |
| Narasi | `narasi` |
| CTA | `cta` |
| Caption | `caption` |
| Hashtag | `hashtags` |
| Estimasi durasi | `estimasi_durasi` (detik, integer) |
| Versi | `version` |
| Catatan perubahan | `catatan_perubahan` |
| Dibuat oleh | `created_by` (default `dava`) |

### `storyboards`

| Template | Kolom |
|---|---|
| Scene | `scenes[].scene` |
| Durasi | `scenes[].durasi` |
| Visual | `scenes[].visual` |
| Teks | `scenes[].teks` |
| Audio | `scenes[].audio` |
| Catatan | `scenes[].catatan` |
| Versi | `version` |

`scenes` disimpan sebagai JSONB: `[{scene, durasi, visual, teks, audio, catatan}]`.

## Aturan pakai

1. **Satu ide besar per video.** Naskah dan storyboard selalu berpasangan untuk satu `content_id` yang sama.
2. **Total durasi storyboard = `estimasi_durasi` naskah (±2 detik).** Dicek backend saat menyimpan.
3. **Durasi rekomendasi 30–90 detik** (Lampiran A PRD, dapat diubah atas arahan Dika). Skema membolehkan 15–180 detik; di luar itu butuh persetujuan Dika.
4. **Versioning:** revisi naskah/storyboard naik `version` dan mengisi `catatan_perubahan`. Jangan menimpa versi lama.
5. **Handoff ke Yanti** hanya bila brief + naskah + storyboard lengkap dan konsisten, lalu status konten bergerak `Scripting` → `Storyboarding` → `Production` (Lampiran B PRD).
6. **Contoh terisi bertanda CONTOH** — bukan konten produksi. Topik dan copy contoh bebas diganti sesuai riset Kinan.
