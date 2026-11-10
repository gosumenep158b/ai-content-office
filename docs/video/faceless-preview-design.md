# Desain Preview Video Faceless 9:16

Acuan produksi video Yanti (Content Designer). Spesifikasi teknis mengikuti Lampiran A PRD v1.0; layout mengikuti arah visual PRD §21 (Premium AI Agency Dashboard — latar putih/abu muda, navy gelap, aksen merah).

## Spesifikasi teknis (Lampiran A — wajib)

| Item | Nilai |
|---|---|
| Container | MP4 |
| Aspect ratio | 9:16 (vertikal) |
| Resolusi | 1080 × 1920 |
| Video codec | H.264 |
| Audio codec | AAC |
| Frame rate | 30 fps |
| Subtitle | Embedded / burned-in |
| Durasi rekomendasi | 30–90 detik (dapat diubah atas arahan Dika) |
| Komposisi | AI video + stock footage + motion graphics + AI voice-over |

## Kanvas dan zona aman

Kanvas 1080 × 1920. Elemen penting (teks, logo, CTA) harus berada di dalam zona aman — di luar zona ini elemen tertutup UI TikTok.

| Zona | Ukuran | Isi |
|---|---|---|
| Margin samping | 64 px kiri–kanan | Jangan letakkan teks di luar margin ini |
| Zona atas | 0–150 px | Status bar + UI aplikasi — kosong, jangan taruh teks penting |
| Zona hook | 150–420 px | Teks hook 0–3 detik, besar dan kontras |
| Zona visual | 420–1380 px | Visual utama scene (AI video / stock / motion) |
| Zona subtitle | 1380–1560 px | Subtitle burned-in, maks. 2 baris |
| Zona bawah | 1560–1920 px | Area caption + action bar TikTok — kosong, jangan taruh teks penting |
| Rel kanan | 140 px dari kanan, area tengah–bawah | Rel aksi TikTok (like, komentar, share) — jangan taruh elemen di sini |

Visual contoh: `preview-frame.svg` (1080 × 1920, buka di browser). Anatomi interaktif: `preview.html`.

## Tipografi subtitle (burned-in)

- Font: sans-serif tebal (Inter / system-ui), putih `#FFFFFF`.
- Ukuran: 64 px pada lebar 1080 (skala mengikuti lebar kanvas).
- Maksimal 2 baris, maksimal ±42 karakter per baris.
- Latar: pill navy `#0F2440` opasitas 80% atau stroke hitam — pilih satu, konsisten di seluruh video.
- Kata kunci boleh diberi aksen merah `#DC2626` — maksimal satu kata per baris.
- Subtitle sinkron dengan voice-over; jeda 1 detik setelah kalimat penting sebelum ganti scene.

## Struktur scene (30–90 detik)

| Bagian | Durasi | Isi |
|---|---|---|
| Hook | 0–3 dtk | Teks besar di zona hook + visual yang langsung menjelaskan topik. Tanpa intro logo. |
| Isi | 3 dtk – (durasi − 10 dtk) | Scene 3–14 detik per poin. Cut mengikuti ketukan narasi, bukan durasi tetap. |
| Rekap | 10–12 dtk sebelum akhir | Tiga poin dirangkum dalam satu layar. Tahan 2 detik. |
| End card / CTA | 10 dtk terakhir | Latar navy, logo, satu CTA yang jelas. Lihat `preview-frame.svg` scene 6. |

## Elemen visual

- **Progress bar:** garis tipis 8 px di paling atas zona visual, aksen merah, menunjukkan progres video.
- **Scene counter:** kecil, pojok kiri atas zona visual (`1/6`, `2/6`, …) — membantu review Dika.
- **Transisi:** cut dan wipe; hindari transisi berat yang mengganggu pacing.
- **Motion graphics:** checklist, ikon, dan penekanan angka memakai palet brand (navy, merah, putih, abu muda).
- **Logo:** hanya muncul di end card, bukan di setiap scene.

## Audio

- **AI voice-over:** jernih, tempo percakapan, jeda 1 detik setelah kalimat penting.
- **Musik bed:** pelan di bawah voice-over (ducking ±−18 dB), naik sedikit di rekap, fade out di end card.
- **Tanpa musik dengan lirik** yang bersaing dengan narasi.

## Preview vs final

| | Preview | Final |
|---|---|---|
| Status `video_versions` | `preview` | `final` |
| Resolusi | Boleh proxy 720 × 1280 untuk review cepat | Wajib 1080 × 1920 |
| Watermark | Label `PREVIEW` kecil di pojok (bukan di tengah) | Tanpa watermark |
| Checksum | Opsional | Wajib (`checksum` di `video_versions`) |
| Gate | Masuk antrean review Dika 14.00 WIB | Hanya setelah keputusan `Approved` |

## Alur

```
Storyboard Dava → Yanti produksi (draft) → Preview → Dika review 14.00 WIB
  → Approved → Final + checksum → Anton (paket publikasi)
  → Revision → Yanti revisi (status video_versions: revision, version naik)
  → Rejected → kembali ke ide
```

## Checklist preview sebelum masuk review

- [ ] Rasio 9:16, resolusi preview benar
- [ ] Hook terbaca dalam 3 detik pertama
- [ ] Subtitle terbaca, maks. 2 baris, sinkron dengan voice-over
- [ ] Tidak ada teks penting di luar zona aman
- [ ] Progress bar dan scene counter tampil
- [ ] End card navy + logo + satu CTA
- [ ] Audio voice-over jernih, musik tidak menutupi narasi
- [ ] `video_versions` terisi: status `preview`, `spec` sesuai Lampiran A, `catatan` terisi
