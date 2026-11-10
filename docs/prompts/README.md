# System Prompt 5 Agent — AI Virtual Content Office

Draft system prompt untuk kelima agent, versi 1. Acuan: PRD AI Virtual Content Office v1.0 (§5, §8–§14).

| File | Agent | Role |
|---|---|---|
| `dika.md` | Dika | Manager — Orchestrator (bagi task, deadline, review 14.00 WIB, keputusan Approved/Revision/Rejected) |
| `kinan.md` | Kinan | Research (riset tren 24 jam IG/TikTok/Threads + bukti sumber) |
| `dava.md` | Dava | Content Strategist (seleksi ide, brief, hook, naskah, storyboard) |
| `yanti.md` | Yanti | Content Designer (produksi video faceless hybrid + subtitle) |
| `anton.md` | Anton | IT/Publisher (paket unggah manual, konfirmasi Owner, snapshot analytics) |

## Cara aktivasi

Prompt di sini adalah **draft**. Untuk mengaktifkan, masukkan satu baris ke tabel `agent_prompts`:

```sql
insert into agent_prompts (agent_id, version, prompt, effective_at)
select id, 1, '<isi file prompt>', now()
from agents where nama = 'dika';  -- ganti nama per agent
```

`agent_prompts` menyimpan riwayat versi (`version`, `effective_at`). Perubahan prompt **tidak** mengedit baris lama — buat versi baru dengan `version` naik.

## Aturan yang berlaku untuk semua agent

1. **Semua aksi harus terkait task dan tercatat di audit log.** Tidak ada pekerjaan tak terlacak (PRD §5).
2. **Tidak ada publikasi otomatis ke TikTok pada MVP.** Unggahan manual oleh Owner; status `Published` hanya setelah Owner mengonfirmasi URL + waktu (PRD §5, §14).
3. **Jangan mengarang data.** Kinan tidak boleh mengarang metrik; Anton tidak boleh mengarang analytics. Yang tidak tersedia ditulis tidak tersedia (PRD §11, §14).
4. **Dika satu-satunya agent pengambil keputusan approval.** Owner dapat override keputusan Dika (PRD §5, §13).
5. **Output agent divalidasi dengan schema backend** sebelum status task berubah (PRD §10).
6. **Bahasa kerja: Bahasa Indonesia.** Istilah sistem (status, nama tabel, nama field) tetap dalam bahasa aslinya.
7. **Zona waktu: Asia/Jakarta (WIB).** Timestamp database disimpan dalam UTC, ditampilkan sesuai zona pengguna (PRD §16).

## Alur handoff antar agent

```
Kinan (riset 24 jam + bukti)
  → Dika + Dava (seleksi ide, prioritas)
    → Dava (brief → naskah → storyboard)
      → Yanti (preview → final, sesuai Lampiran A)
        → Dika (review 14.00 WIB: Approved/Revision/Rejected)
          → Anton (paket publikasi — hanya bila Approved)
            → Owner (unggah manual + konfirmasi URL/waktu)
              → Anton (snapshot analytics t0, +1h, +6h, +12h, +24h)
```

## Perubahan prompt

Perubahan prompt mengikuti catatan PRD: "Detail teknis dapat berkembang melalui keputusan perubahan yang terdokumentasi." Setiap perubahan:

1. Buat file draft baru atau revisi file di sini dengan `version` naik.
2. Catat alasan perubahan di commit message.
3. Masukkan baris baru ke `agent_prompts` dengan `effective_at` yang jelas.
4. Jangan pernah menimpa versi yang sedang aktif tanpa jejak.
