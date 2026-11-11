# Checklist QA tiap rilis

Gunakan **Lulus / Gagal / Terblokir / Belum diuji** untuk setiap skenario. Respons API 200 tidak otomatis berarti alur UI sudah berfungsi. Catat commit, lingkungan, ukuran layar, hasil aktual, dan penanggung jawab perbaikan.

## Hasil pemeriksaan awal

Pemeriksaan live pada 11 November 2026 WIB; sumber lokal `main` pada `746a26e`. Lingkungan: https://ai-content-office.vercel.app.

| Pemeriksaan | Hasil | Bukti / batas hasil |
| --- | --- | --- |
| Beranda desktop dan tautan Masuk | Lulus | Beranda HTTP 200; tautan Masuk membuka `/login`. |
| Login akun QA yang disepakati | Terblokir | Supabase mengembalikan 400 `Invalid login credentials`. Pemilik mengonfirmasi proyek Auth live belum memiliki pengguna uji/default. Percobaan dihentikan; tidak membuat akun. Ini bukan bukti bahwa login dengan akun valid gagal. |
| Umpan balik login gagal | Gagal | Halaman tetap di `/login`, tombol kembali aktif, tetapi tidak ada pesan kesalahan untuk pengguna. Pesan hanya tercatat di console. |
| Visibilitas tombol login | Gagal | Pada desktop, teks putih tombol hampir tidak terlihat di latar terang. |
| Dashboard dan tugas end-to-end | Terblokir / belum diuji | Login valid, navigasi terlindungi, daftar/penambahan tugas, pencarian, dependensi, dan submit belum diuji di live. Tidak membuat tugas atau dependensi uji. |
| Pemotongan teks mobile | Belum diuji | Belum ada verifikasi visual viewport mobile; jangan menandainya lulus dari inspeksi desktop atau sumber. |
| `GET /api/tasks` | Lulus terbatas | HTTP 200, JSON valid `{"data":[]}` tanpa sesi login. |
| `GET /api/tasks/overdue` | Lulus terbatas | HTTP 200, JSON valid `{"data":[]}`; belum menguji tugas terlambat berisi data. |
| `GET /api/tasks/dependencies` | Lulus terbatas | HTTP 200, JSON valid `{"data":[]}`; belum menguji relasi berisi data. |
| Konsistensi Bahasa Indonesia | Gagal | Beranda live dan sumber UI masih mencampur bahasa; rincian di bawah. |

### Temuan yang perlu ditangani

**Terlihat di live**

- **P1 — Kesalahan login tidak tampil.** `web/app/login/page.tsx:30–31` hanya menulis kesalahan ke console. Tampilkan pesan Bahasa Indonesia yang dapat ditindaklanjuti, tanpa membuka rincian sensitif akun.
- **P1 — Tombol masuk sulit terlihat.** `web/app/login/page.tsx:59–66` memakai `text-white` tanpa latar terisi. Periksa warna normal, hover, fokus, dan disabled; pastikan label terbaca di mobile maupun desktop.

**Risiko dari inspeksi sumber — belum direproduksi melalui login valid**

- **P1 — Kontrak respons daftar/buat tugas berbeda.** API mengirim `{ data }` (`web/app/api/tasks/route.ts:13,33`), tetapi dashboard dan halaman tugas memeriksa `Array.isArray(data)` terhadap objek respons utuh dan menambahkan objek respons utuh setelah POST (`web/app/dashboard/page.tsx:72–106`; `web/app/tasks/page.tsx:73–95`). Uji daftar berisi data dan pembuatan tugas, termasuk reload dan pencarian; samakan kontraknya.
- **P1 — Nama field tugas berbeda.** Form memakai `assignee` dan `deadline`, sementara API membaca `assigned_agent_id` dan `due_at` (`web/app/api/tasks/route.ts:25–28`). Pastikan pilihan agen dipetakan ke UUID yang benar dan tenggat tersimpan, bukan diam-diam menjadi `null`.
- **P1 — Integrasi sesi perlu dibuktikan.** Halaman login langsung memanggil klien Supabase (`web/app/login/page.tsx:24–29`), sementara middleware memeriksa cookie `sb-access-token` dan route `/api/auth/login` yang menulis cookie itu tidak dipanggil halaman login. Setelah tersedia akun uji yang diizinkan, verifikasi redirect, refresh, `/api/auth/me`, kedaluwarsa sesi, dan logout; jangan menganggap ini sudah direproduksi sebagai kegagalan login valid.
- **P1 — GET overdue memiliki efek tulis.** `web/app/api/tasks/overdue/route.ts` dapat mengubah tugas menjadi `Blocked`, menambah audit, dan membuat notifikasi. Respons dapat masih membawa status sebelum pembaruan. Pastikan kontrak dan pemanggilannya disepakati; jangan menjalankan pengujian data terlambat pada produksi tanpa izin.
- **P1 — Otorisasi API tulis perlu ditinjau backend.** Route tugas menggunakan service-role dan tidak terlihat memvalidasi sesi/pemilik; middleware hanya mencakup halaman. Tidak dilakukan percobaan tulis tanpa autentikasi pada live. Verifikasi penolakan akses tidak sah di lingkungan uji sebelum rilis.

### Perbaikan bahasa

Nama produk, nama orang, dan nama platform dapat dipertahankan. Kode status/field API tidak perlu diganti untuk menerjemahkan label UI.

| Teks saat ini | Usulan konsisten | Lokasi sumber |
| --- | --- | --- |
| `Tareh:` | `Tenggat:` | `web/app/tasks/page.tsx:246` |
| `Rendah` untuk `low` dan `medium` | `Rendah` / `Sedang` | `web/app/dashboard/page.tsx:180–181`; `web/app/tasks/page.tsx:173–174` |
| `Belum punya akun? Daftar` menuju `/` | Arahkan ke alur daftar yang nyata, atau ganti menjadi `Kembali ke beranda` | `web/app/login/page.tsx:71` |
| `Dashboard`, `Task Management`, `Research Center` | `Dasbor`, `Manajemen Tugas`, `Pusat Riset` | `dashboard/page.tsx:132`; `tasks/page.tsx:121`; `research/page.tsx:98` di `web/app/` |
| `Assignee`, `Priority`, `Deadline` | `Penanggung jawab`, `Prioritas`, `Tenggat` | `web/app/dashboard/page.tsx:243–252`; `web/app/tasks/page.tsx:237–246` |
| Status Inggris dan prioritas mentah (`medium`, `urgent`) | Label Indonesia; simpan nilai API tetap | Daftar tugas di dashboard dan halaman tugas |
| `Backlog`, `Assigned`, `In Progress`, `Waiting Input`, `In Review`, `Revision`, `Completed`, `Blocked`, `Cancelled` | `Antrean`, `Ditugaskan`, `Sedang dikerjakan`, `Menunggu masukan`, `Dalam peninjauan`, `Perlu revisi`, `Selesai`, `Terhambat`, `Dibatalkan` | `web/app/dashboard/page.tsx:12–22,238`; `web/app/tasks/page.tsx:232` |
| `Manager`, `Research`, `Content Strategist`, `Video Producer`, `Publisher` | `Manajer`, `Periset`, `Strategis Konten`, `Produser Video`, `Penerbit` | Pilihan agen di dashboard dan halaman tugas |
| `multi-agent workflow`, `Password` | `alur kerja multi-agen`, `Kata sandi` | `web/app/tasks/page.tsx:124`; `web/app/login/page.tsx:53` |
| `agent`, `Orchestrator`, `faceless`, `voice-over`, `Publish manual`, `Analytics 24 jam`, `snapshot analytics` | `agen`, `Koordinator`, `tanpa wajah`, `sulih suara`, `Publikasi manual`, `Analitik 24 jam`, `ringkasan analitik` | Beranda `web/app/page.tsx` |

## Sebelum mulai

- [ ] Catat commit dan URL yang benar; utamakan Preview/staging dengan data uji terpisah.
- [ ] Pemilik menyediakan/mengizinkan akun **Supabase Auth** aktif. Tidak ada akun atau kata sandi bawaan; baris tabel `users` bukan akun Auth.
- [ ] Gunakan tugas bertanda `QA-<rilis>-<skenario>` dan agen uji yang disepakati. Sepakati pembersihan lewat backend; jangan hapus data produksi.
- [ ] Buka console dan Network untuk melihat status/response tanpa menyalin token atau kata sandi ke laporan.
- [ ] Ingat: **GET `/api/tasks/overdue` bukan baca-saja pada implementasi saat ini.** Uji efek status/audit/notifikasi hanya dengan fixture dan izin yang sesuai.

## Cek cepat setiap rilis

- [ ] Beranda, logo, dan semua tautan utama berfungsi; tautan daftar tidak menjanjikan alur yang tidak ada.
- [ ] Login salah menampilkan pesan Indonesia; tombol kembali aktif dan dapat dicoba setelah kredensial dikoreksi.
- [ ] Login valid → dasbor → tugas berhasil. Refresh tidak mengeluarkan sesi yang masih valid.
- [ ] Daftar tugas UI sama dengan `response.data` API, termasuk jumlah dan data setelah reload.
- [ ] Buat satu tugas uji; judul, penanggung jawab, prioritas, dan tenggat tersimpan dengan benar serta tidak membuat duplikat dari klik ganda.
- [ ] Pencarian menemukan judul/deskripsi dengan variasi huruf besar-kecil; hasil kosong jelas.
- [ ] Periksa viewport 360, 390, 768, dan 1280 px: tidak ada scroll horizontal tak perlu, tombol tertutup, label terpotong, atau teks berimpit. Uji judul/deskripsi panjang dan perbesaran teks 200%.
- [ ] Fokus keyboard terlihat, urutan Tab masuk akal, label input dapat dikenali, dan tombol memiliki kontras yang cukup.
- [ ] Tidak ada error console/API tak terduga. Empty state dan kegagalan jaringan dapat dibedakan pengguna.
- [ ] Semua teks yang terlihat berbahasa Indonesia konsisten; nama produk/platform tetap benar.

## Login, sesi, dan akses

| Skenario | Hasil yang harus diperiksa |
| --- | --- |
| Email/kata sandi kosong; format email salah | Validasi jelas, tanpa request yang tidak perlu; fokus ke field bermasalah. |
| Kata sandi salah | Pesan aman dalam Bahasa Indonesia; tidak diam-diam berhenti atau membocorkan keberadaan akun. |
| Akun Auth aktif dan benar | Masuk ke dasbor; sesi dikenali oleh halaman dan `/api/auth/me`. |
| Buka `/dashboard` atau `/tasks` tanpa sesi | Dialihkan ke login; tidak menampilkan data terlindungi. |
| Refresh, tab baru, sesi kedaluwarsa | Sesi valid tetap bekerja; sesi tidak valid ditangani tanpa loop redirect. |
| Logout | Sesi yang relevan dibersihkan; halaman terlindungi tidak tetap terbuka setelah refresh. |
| API tulis tanpa sesi / tanpa hak | Ditolak 401/403 sesuai kebijakan yang disepakati. Lakukan hanya di staging, bukan eksperimen pada produksi. |

## Tugas dan kontrak data

- [ ] Judul kosong atau hanya spasi ditolak dengan pesan jelas; form tidak diam-diam gagal.
- [ ] Tugas **tanpa tenggat** boleh tersimpan dengan `due_at: null`, ditampilkan sebagai `—`, dan tidak masuk daftar terlambat.
- [ ] Tenggat valid tersimpan di `due_at`; tanggal/zona waktu konsisten dan tidak bergeser sehari saat ditampilkan di WIB.
- [ ] Pilihan agen tersimpan sebagai `assigned_agent_id` yang benar; label menampilkan nama agen, bukan kehilangan penugasan.
- [ ] Keempat prioritas berbeda: Rendah, Sedang, Tinggi, Darurat; nilai mentah API tidak bocor sebagai label Inggris.
- [ ] POST sukses memberi 201 dan `{ data: <tugas> }`; UI memakai objek tugas di dalam `data`. GET memberi `{ data: [...] }`.
- [ ] Data masih sama setelah reload. Pencarian setelah membuat tugas tidak menyebabkan error karena objek tanpa `title`.
- [ ] Status tidak dikenal, UUID tidak valid, ID tidak ditemukan, dan tanggal tidak valid memberi respons aman yang dapat dipahami; tidak menampilkan error database mentah ke pengguna.
- [ ] PATCH hanya mengubah field yang diminta dan merekam audit yang benar.
- [ ] Kegagalan jaringan/400/500 terlihat di UI, input penting tidak hilang, dan tombol tidak terkunci selamanya.

## Dependensi dan pengiriman hasil

| Skenario | Hasil yang harus diperiksa |
| --- | --- |
| Relasi A bergantung B | Tercatat satu kali dan muncul di GET/filter `taskId`; tugas lain tidak tercampur. |
| A bergantung A | Ditolak 400; tidak ada relasi baru. |
| A → B lalu B → A; siklus A → B → C → A | Ditolak 400; tidak ada sebagian data tersimpan. |
| Siklus melalui cabang kedua dan rantai lebih dari 20 simpul | Tetap ditolak. Penting: implementasi sumber saat ini menelusuri satu cabang dan membatasi 20 langkah; jangan menandai seluruh deteksi siklus lulus hanya dari dua tugas. |
| Relasi duplikat, field wajib hilang, ID tidak ada | Ditolak/ditangani dengan jelas; tidak ada relasi rusak. |
| Hapus dependensi yang ditunjuk | Hanya relasi tersebut hilang; tugasnya tetap ada. |
| Submit saat dependensi belum `Completed` | Ditolak 400 dengan daftar dependensi belum selesai; status/attempt tidak berubah. |
| Submit ketika seluruh dependensi selesai / tanpa dependensi | Berhasil 200, status `In Review`, attempt bertambah sesuai submit sah, output/pesan/audit tercatat. |
| Submit tugas selesai/dibatalkan, ID hilang/tidak ada | Masing-masing ditolak secara jelas (400/404 sesuai kontrak route). |

## Tugas terlambat — gunakan fixture terkontrol

- [ ] Hanya `due_at` sebelum waktu saat ini yang terambil; tanpa tenggat dan tenggat mendatang tidak terambil.
- [ ] `Completed` dan `Cancelled` tidak dianggap terlambat.
- [ ] Perubahan ke `Blocked`, audit, dan notifikasi terjadi sesuai kontrak; bandingkan respons awal dengan GET tugas berikutnya.
- [ ] Memanggil ulang tidak menggandakan audit/notifikasi bagi tugas yang sudah `Blocked`.
- [ ] Urutan tenggat benar; batas waktu dekat tengah malam dan WIB diuji.
- [ ] Kesalahan saat memperbarui status/audit/notifikasi tidak menghasilkan laporan sukses yang menyesatkan.

## Cek API publik

Di lingkungan yang disepakati, periksa ketiga endpoint berikut: HTTP **200**, header JSON, body dapat di-parse, dan `data` berupa array (boleh kosong). Pada hasil awal, ketiganya lolos hanya untuk data kosong.

| GET | Cek tambahan dengan fixture |
| --- | --- |
| `/api/tasks` | Isi/urutan tugas dan relasi agen benar; selaras dengan UI. |
| `/api/tasks/overdue` | Efek tulis sudah diizinkan dan dicek seperti bagian di atas. |
| `/api/tasks/dependencies` | Relasi benar; filter `?taskId=<uuid>` hanya mengembalikan relasi tugas yang diminta. |

Contoh cek sintaks JSON (jalankan ulang per endpoint; baca peringatan overdue sebelum mengganti URL):

```bash
curl -i https://ai-content-office.vercel.app/api/tasks
curl -fsS https://ai-content-office.vercel.app/api/tasks | python3 -m json.tool
```

Jangan menganggap body HTML halaman login sebagai JSON API yang sukses. Jangan tempel header Authorization, cookie, atau rahasia ke tiket QA.

## Sebelum rilis dan pelaporan

- [ ] Semua pengujian wajib dicatat, termasuk yang terblokir; lampirkan langkah reproduksi singkat dan hasil yang diharapkan/aktual.
- [ ] Perbaiki blocker atau minta persetujuan risiko eksplisit; status dashboard/tasks saat ini tetap **belum diuji**.
- [ ] Hanya file yang dimiliki peran ini berubah: `docs/QA-CHECKLIST.md` dan `docs/SETUP.md`.
- [ ] Tinjau diff dan pastikan tidak ada `.env`, kredensial, file build, atau perubahan `web/app`, `web/src`, `web/middleware.ts`.
- [ ] Buat commit terpisah dengan prefix `docs(qa):` dan `docs(setup):`.
- [ ] Karena push `main` memicu auto-deploy live, dapatkan persetujuan pemilik atas diff/commit yang tepat dahulu. Setelah itu `git pull --rebase origin main`, tinjau ulang jika berubah, baru push sesuai izin.

Format laporan singkat: `Skenario | Lulus/Gagal/Terblokir/Belum diuji | Langkah | Hasil aktual | Hasil yang diharapkan | URL/commit | Penanggung jawab`.
