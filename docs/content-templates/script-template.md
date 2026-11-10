# Template Naskah — `content_scripts`

Template ini memetakan langsung ke kolom tabel `content_scripts` (migrasi `001_initial_schema.sql`). Dipakai Dava saat menulis naskah, dan dipakai backend untuk validasi (lihat `script.schema.json`).

Acuan: PRD AI Virtual Content Office v1.0 — §9 (Dava), §12, Lampiran A.

## Field

| Field | Kolom DB | Wajib | Aturan |
|---|---|---|---|
| Judul kerja | `contents.title` | Ya | Judul internal, bukan judul unggahan |
| Hook | `hook` | Ya | 0–3 detik. Satu kalimat yang membuat penonton berhenti scroll |
| Narasi | `narasi` | Ya | Naskah lengkap dengan penanda jeda/transisi. Satu ide besar per video |
| CTA | `cta` | Ya | Satu ajakan yang jelas di akhir video |
| Caption | `caption` | Ya | Caption unggahan; singkat, memancing komentar |
| Hashtag | `hashtags` | Ya | 3–5 hashtag relevan |
| Estimasi durasi | `estimasi_durasi` | Ya | Detik (integer). Rekomendasi PRD: 30–90 detik. Patokan: ±150 kata ≈ 60 detik voice-over Bahasa Indonesia |
| Versi | `version` | Ya | Mulai dari 1, naik tiap revisi |
| Catatan perubahan | `catatan_perubahan` | Bila revisi | Apa yang berubah dari versi sebelumnya |
| Dibuat oleh | `created_by` | Ya | Default `dava` |

## Template kosong

```markdown
## Judul kerja
[Tulis judul internal]

## Hook (0–3 detik)
[Tulis hook]

## Narasi
[Tulis naskah lengkap. Tandai jeda dengan (...) dan transisi dengan →]

## CTA
[Tulis satu ajakan]

## Caption
[Tulis caption unggahan]

## Hashtag
#... #... #...

## Estimasi durasi
[..] detik

## Versi
1

## Catatan perubahan
[Naskah awal / atau: apa yang berubah dari v(n-1)]
```

## Contoh terisi (CONTOH — bukan konten produksi)

> Contoh ini hanya menunjukkan cara mengisi template. Topik, hook, dan copy-nya bebas diganti sesuai hasil riset Kinan dan arahan Dika.

**Judul kerja:** Tiga cara hemat satu jam setiap pagi

**Hook (0–3 detik):**
"Pagi kamu selalu terburu-buru? Coba tiga hal ini besok pagi."

**Narasi:**
"Pagi kamu selalu terburu-buru? Coba tiga hal ini besok pagi. (jeda)
Pertama, siapkan semuanya malam sebelumnya. Baju, tas, sarapan — begitu bangun, kamu tinggal jalan. (→)
Kedua, bangun tiga puluh menit lebih awal. Bukan buat kerja, tapi buat napas. Lima belas menit tanpa HP itu mengubah seluruh pagi kamu. (→)
Ketiga, kerjakan satu tugas paling penting dulu, sebelum notifikasi masuk. Sekali selesai, harimu sudah menang separuh. (jeda)
Tiga hal kecil. Satu jam kembali. Besok pagi, coba yang pertama dulu."

**CTA:**
"Simpan video ini buat besok pagi, dan follow buat tips lainnya."

**Caption:**
Pagi yang tenang itu dirancang, bukan kebetulan. Mana dari tiga ini yang paling susah buat kamu? 👇

**Hashtag:**
#Produktivitas #TipsPagi #ManajemenWaktu #RutinitasPagi

**Estimasi durasi:** 60 detik

**Versi:** 1

**Catatan perubahan:** Naskah awal.

## Checklist sebelum handoff ke Yanti

- [ ] Hook 0–3 detik, tanpa basa-basi
- [ ] Satu ide besar, bukan tiga ide setengah matang
- [ ] Narasi punya transisi antar poin
- [ ] CTA cuma satu dan jelas
- [ ] Caption + hashtag terisi
- [ ] `estimasi_durasi` cocok dengan total durasi storyboard (±2 detik)
- [ ] `version` dan `catatan_perubahan` terisi
