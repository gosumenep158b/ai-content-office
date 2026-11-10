# Template Storyboard — `storyboards`

Template ini memetakan langsung ke kolom tabel `storyboards` (migrasi `001_initial_schema.sql`). Dipakai Dava saat menyusun storyboard, dan dipakai Yanti sebagai acuan produksi. Dipakai backend untuk validasi (lihat `storyboard.schema.json`).

Acuan: PRD AI Virtual Content Office v1.0 — §9 (Dava), §12.

## Field

| Field | Kolom DB | Wajib | Aturan |
|---|---|---|---|
| Scene | `scenes[].scene` | Ya | Nomor urut scene (1, 2, 3, …) |
| Durasi | `scenes[].durasi` | Ya | Detik per scene. Total semua scene = `estimasi_durasi` naskah (±2 detik) |
| Visual | `scenes[].visual` | Ya | Apa yang terlihat di layar (AI video / stock / motion / gambar) |
| Teks | `scenes[].teks` | Ya | Teks layar / subtitle pada scene itu |
| Audio | `scenes[].audio` | Ya | Narasi voice-over dan/atau musik pada scene itu |
| Catatan | `scenes[].catatan` | Tidak | Instruksi editing (transisi, zoom, efek) |
| Versi | `version` | Ya | Mulai dari 1, naik tiap revisi |

## Template kosong

```json
{
  "content_id": "<uuid konten>",
  "version": 1,
  "scenes": [
    {
      "scene": 1,
      "durasi": 3,
      "visual": "[deskripsi visual scene 1]",
      "teks": "[teks layar scene 1]",
      "audio": "[narasi/musik scene 1]",
      "catatan": "[instruksi editing]"
    }
  ]
}
```

## Contoh terisi (CONTOH — pasangan dari naskah contoh di `script-template.md`)

> Contoh ini hanya menunjukkan cara mengisi template. Total durasi 60 detik, sama dengan `estimasi_durasi` naskah contohnya.

```json
{
  "content_id": "00000000-0000-0000-0000-000000000000",
  "version": 1,
  "scenes": [
    {
      "scene": 1,
      "durasi": 3,
      "visual": "AI video: jam alarm berdering di meja, cahaya pagi masuk dari jendela, gerakan lambat",
      "teks": "Pagi selalu terburu-buru?",
      "audio": "Voice-over hook, tempo cepat. Musik bed mulai pelan.",
      "catatan": "Hook 0–3 detik. Teks besar di tengah, kontras tinggi."
    },
    {
      "scene": 2,
      "durasi": 9,
      "visual": "Motion graphics: checklist malam — baju, tas, sarapan — tercentang satu per satu",
      "teks": "1. Siapkan malam sebelumnya",
      "audio": "Voice-over poin pertama. Musik bed tetap pelan.",
      "catatan": "Transisi wipe ke scene 3."
    },
    {
      "scene": 3,
      "durasi": 12,
      "visual": "Stock footage: seseorang menyeruput kopi di dekat jendela, kota masih sepi",
      "teks": "2. Bangun 30 menit lebih awal",
      "audio": "Voice-over poin kedua. Jeda 1 detik setelah kalimat 'tanpa HP'.",
      "catatan": "Slow zoom in. Teks jangan menutup wajah subjek."
    },
    {
      "scene": 4,
      "durasi": 14,
      "visual": "AI video: meja kerja rapi, satu tugas dicentang di aplikasi to-do, notifikasi HP dimatikan",
      "teks": "3. Satu tugas penting dulu",
      "audio": "Voice-over poin ketiga. Musik bed naik sedikit di kalimat penutup poin.",
      "catatan": "Cut cepat di 'sebelum notifikasi masuk'."
    },
    {
      "scene": 5,
      "durasi": 12,
      "visual": "Motion graphics: tiga ikon poin dirangkum dalam satu layar — checklist, jam, centang besar",
      "teks": "Tiga hal kecil. Satu jam kembali.",
      "audio": "Voice-over rekap. Musik bed mencapai puncak lalu turun.",
      "catatan": "Tahan 2 detik di layar rekap sebelum CTA."
    },
    {
      "scene": 6,
      "durasi": 10,
      "visual": "End card: latar navy, logo AI Virtual Content Office, tombol simpan + follow",
      "teks": "Simpan buat besok pagi",
      "audio": "Voice-over CTA. Musik bed fade out.",
      "catatan": "End card 10 detik. Logo dan CTA di zona aman bawah (lihat docs/video/faceless-preview-design.md)."
    }
  ]
}
```

## Checklist sebelum handoff ke Yanti

- [ ] Setiap scene punya `durasi`, `visual`, `teks`, dan `audio`
- [ ] Total durasi scene = `estimasi_durasi` naskah (±2 detik)
- [ ] Visual menyebut jenis media (AI video / stock / motion / gambar) supaya Yanti tahu sumbernya
- [ ] Teks layar singkat dan tidak menumpuk dengan subtitle
- [ ] `version` terisi dan naik tiap revisi
