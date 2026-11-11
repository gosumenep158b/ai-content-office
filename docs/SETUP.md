# Panduan setup

Aplikasi Next.js berada di folder `web/`; migrasi basis data berada di `supabase/migrations/` pada akar repositori. Panduan ini disusun dari checkout `746a26e` dan tidak mengklaim build atau deployment sudah diuji.

## Prasyarat

Siapkan Git, Node.js, npm, proyek Supabase, dan akun Vercel jika akan deploy. Lockfile saat ini memasang Next.js `16.4.6` dengan persyaratan Node.js **>=20.9.0**. Gunakan Node.js LTS yang masih didukung dan memenuhi persyaratan tersebut; repo belum mengunci versi runtime lewat `.nvmrc` atau `engines` milik aplikasi.

## Clone dan pasang paket

```bash
git clone https://github.com/gosumenep158b/ai-content-office.git
cd ai-content-office/web
npm ci
```

`npm ci` mengikuti `web/package-lock.json`. Jalankan perintah npm dari `web/`, bukan akar repositori.

## Variabel lingkungan

Checkout ini **tidak menyertakan `web/.env.local.example`** yang dirujuk dalam instruksi proyek. Daftar berikut berasal dari referensi kode `web/src/lib/supabase.ts` dan route autentikasi. Buat `web/.env.local` secara lokal, lalu ganti placeholder dengan nilai proyek Supabase yang sesuai:

```dotenv
NEXT_PUBLIC_SUPABASE_URL=<URL-proyek-Supabase>
NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon-key-Supabase>
SUPABASE_SERVICE_ROLE_KEY=<service-role-secret-key-Supabase>
```

| Variabel | Kebutuhan | Batas kerahasiaan |
| --- | --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Wajib untuk koneksi browser dan server ke proyek Supabase | URL publik; dapat masuk bundle browser. |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Wajib untuk klien Supabase dan login | Key publik/anon. Keamanan akses tetap harus diatur lewat otorisasi dan kebijakan Row Level Security (RLS), bukan kerahasiaan key ini. |
| `SUPABASE_SERVICE_ROLE_KEY` | Wajib untuk route tugas yang memakai `supabaseAdmin()` | **Rahasia server saja**, dapat melewati RLS. Jangan beri awalan `NEXT_PUBLIC_`, kirim ke browser, atau commit. |

Untuk fungsi penuh, isi ketiganya. Tidak ditemukan variabel lingkungan opsional lain yang dibaca kode aplikasi saat ini. Klien memiliki fallback `localhost`/key contoh, tetapi fallback itu bukan proyek Supabase yang dapat dipakai untuk login atau data.

`web/.gitignore` mengabaikan `.env*`. Jangan memasukkan file lingkungan atau rahasia ke Git, log, tiket, maupun dokumentasi. File contoh yang hilang perlu ditangani pemilik kode secara terpisah; pekerjaan dokumentasi ini tidak menambah atau mengubah file di `web/`.

## Siapkan Supabase dan pengguna uji

1. Buat/pilih proyek Supabase. Ambil URL proyek, anon key, dan service-role key dari pengaturan API, lalu isi variabel lingkungan yang sesuai.
2. Dari **SQL Editor** Supabase, jalankan isi `supabase/migrations/001_initial_schema.sql` pada proyek yang tepat. Utamakan proyek uji baru dan tinjau migrasi sebelum menjalankannya pada database yang sudah berisi data. File ini membuat tabel inti dan lima agen awal. Repo belum memiliki konfigurasi Supabase CLI atau skrip migrasi otomatis.
3. Aktifkan login email/kata sandi di Supabase Auth dan, **dengan izin pemilik**, buat/undang pengguna uji. Pastikan status konfirmasi pengguna sesuai pengaturan proyek.
4. **Tidak ada akun atau kata sandi default yang di-seed.** Migrasi membuat tabel aplikasi `users`, bukan akun di Supabase Auth. Menambahkan baris ke `users` saja tidak membuat kredensial login. Pemilik telah mengonfirmasi proyek live belum memiliki pengguna uji; jangan terus mencoba kredensial contoh atau membuat akun tanpa izin.
5. Tinjau kebijakan RLS dan otorisasi endpoint bersama pemilik backend sebelum memasukkan data sensitif. Service-role digunakan oleh server dan tidak menggantikan pemeriksaan hak akses pengguna.

Setelah ada akun uji yang diizinkan, buktikan login → dasbor → tugas, refresh, `/api/auth/me`, dan logout. Ada risiko integrasi sesi dan kontrak data yang dicatat di [checklist QA](QA-CHECKLIST.md); jangan menganggap setup berhasil hanya karena halaman login terbuka atau API kosong merespons 200.

## Jalankan lokal

Dari `web/`:

```bash
npm run dev
```

Buka alamat yang dicetak Next.js (biasanya `http://localhost:3000`). Hentikan dengan `Ctrl+C`. Tanpa konfigurasi Supabase yang benar, halaman statis mungkin terbuka, tetapi login dan data tidak dapat dianggap berfungsi.

## Build dan jalankan hasil build

Dari `web/`, setelah lingkungan disiapkan:

```bash
npm run build
npm run start
```

Skrip di `web/package.json` hanya `dev`, `build`, dan `start`; belum ada skrip `lint`, `test`, atau migrasi. Perintah di atas adalah petunjuk, bukan hasil build yang sudah diverifikasi dalam tugas dokumentasi ini.

## Deploy ke Vercel

1. Impor repositori `gosumenep158b/ai-content-office` ke proyek Vercel yang benar. Set **Root Directory** ke **`web`**, karena `package.json` dan lockfile aplikasi ada di sana.
2. Gunakan deteksi framework Next.js dan build `npm run build`. Repo tidak memiliki `vercel.json` atau perintah deploy khusus.
3. Tambahkan ketiga variabel lingkungan pada lingkungan Vercel yang akan dipakai, misalnya Preview dan Production. Gunakan proyek Supabase uji untuk Preview bila tersedia. Simpan `SUPABASE_SERVICE_ROLE_KEY` hanya sebagai environment rahasia server; `NEXT_PUBLIC_*` dibundel ke browser dan bukan untuk rahasia.
4. Terapkan migrasi database secara terpisah pada proyek Supabase yang sesuai. Build/deploy Vercel tidak otomatis membuat akun Auth atau menjalankan migrasi SQL ini.
5. Deploy, periksa log build dan URL Preview, lalu jalankan [checklist QA](QA-CHECKLIST.md). Perubahan nilai `NEXT_PUBLIC_*` perlu build/deploy baru agar bundle memakai nilai terbaru.

**Peringatan proyek live:** menurut pengaturan yang dilaporkan pemilik, push ke `main` memicu auto-deploy ke https://ai-content-office.vercel.app. Koneksi Git dan lingkungan Vercel dikelola di platform, bukan ditetapkan oleh file repo ini. Jangan push hanya untuk menyimpan dokumentasi sebelum pemilik meninjau dan menyetujui diff/commit yang tepat.

Sesudah persetujuan push, dari akar repositori:

```bash
git pull --rebase origin main
# Tinjau ulang perubahan/konflik dan diff; berhenti jika cakupan izin berubah.
git push origin main
```

Jangan melakukan push saat masih ada konflik atau perubahan yang belum ditinjau. Jika rebase mengubah isi yang disetujui, minta persetujuan ulang sebelum memicu deploy. Status tugas dokumentasi ini: panduan dan commit lokal disiapkan; tidak ada klaim push atau deploy selesai.
