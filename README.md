# AI Virtual Content Office

Platform produksi konten multi-agent berbasis AI untuk tim konten digital.

Repo: https://github.com/gosumenep158b/ai-content-office
Aplikasi live: https://ai-content-office.vercel.app/

## 🚀 Quick Start

```bash
# 1. Clone repo
git clone https://github.com/gosumenep158b/ai-content-office.git
cd ai-content-office/web

# 2. Install dependencies
npm ci

# 3. Setup environment
cp .env.example .env.local  # jika ada, atau buat manual
# Isi: NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY

# 4. Setup database
# Buka SQL Editor di Supabase Dashboard, jalankan berurutan:
# - supabase/migrations/001_initial_schema.sql (22 tabel + seed 5 agent)
# - supabase/migrations/002_isolate_from_dashboard.sql
# - supabase/migrations/003_agent_bot_owner.sql (pemetaan agent -> bot Telegram)
# - supabase/migrations/003_seed_agent_prompts.sql (prompt 5 agent)
# - supabase/migrations/004_chat_messages.sql (chat antar worker)

# 5. Run development
npm run dev
```

## 📁 Struktur Proyek

```
ai-content-office/
├── web/                      # Next.js app (Frontend + API)
│   ├── app/                  # App Router
│   │   ├── (app)/            # Halaman setelah login
│   │   │   ├── chat/         # Chat antar worker (grup & DM, gaya iMessage)
│   │   │   ├── dashboard/    # Dashboard
│   │   │   ├── divisi/       # Dashboard per divisi
│   │   │   ├── office/       # Main Office (monitoring tim saat jam kerja)
│   │   │   ├── research/     # Research Center
│   │   │   ├── studio/       # Studio konten
│   │   │   └── tasks/        # Task Management UI
│   │   ├── api/              # API Routes
│   │   │   ├── admin/        # Admin
│   │   │   ├── auth/         # Login/Logout/Me
│   │   │   ├── chat/         # Chat antar worker
│   │   │   ├── content/      # Konten (ide, brief, naskah, storyboard)
│   │   │   ├── office/       # Data Main Office / divisi
│   │   │   ├── research/     # Riset
│   │   │   ├── tasks/        # Task CRUD + Submit + overdue
│   │   │   └── worker/       # Antrian kerja bot (worker queue)
│   │   └── login/            # Halaman login
│   ├── src/
│   │   ├── components/ui/    # UI components (Button, Card, Input, Select)
│   │   ├── lib/              # Utilities (supabase.ts, utils.ts)
│   │   └── design-system.css # Navy #0F2440 + Merah #DC2626
│   └── middleware.ts         # Auth middleware
├── supabase/
│   └── migrations/           # SQL migrations (001-004)
└── docs/
    ├── prompts/              # Agent system prompts (dika, kinan, dava, yanti, anton)
    ├── content-templates/    # Template naskah & storyboard (+ skema JSON)
    ├── video/                # Aset produksi video
    ├── PRD_AI_Virtual_Content_Office_v1.0.pdf  # PRD v1.0
    ├── SETUP.md              # Panduan setup lengkap
    └── QA-CHECKLIST.md       # Checklist QA tiap rilis
```

## 🔐 Environment Variables

| Variable | Keterangan | Lokasi |
|----------|-----------|--------|
| `NEXT_PUBLIC_SUPABASE_URL` | URL Supabase project | `.env.local` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Anon key (public) | `.env.local` |
| `SUPABASE_SERVICE_ROLE_KEY` | Service role (SECRET — jangan commit) | `.env.local` |

Detail dan peringatan keamanan: lihat [Setup Guide](docs/SETUP.md).

## 🤖 Agent System

5 AI Agent dengan system prompt yang tersimpan di tabel `agent_prompts`:

| Agent | Role | Tanggung Jawab |
|-------|------|----------------|
| **Dika** | Manager | Orchestrator, review 14.00 WIB, approval |
| **Kinan** | Research | Riset tren 24 jam IG/TikTok/Threads |
| **Dava** | Content Strategist | Seleksi ide, brief, naskah, storyboard |
| **Yanti** | Content Designer | Produksi video faceless hybrid |
| **Anton** | IT/Publisher | Paket unggah, analytics snapshot |

Prompt masing-masing agent: `docs/prompts/` (`dika.md`, `kinan.md`, `dava.md`, `yanti.md`, `anton.md`).

### Bot Telegram per agent

Setiap agent "bekerja" lewat satu bot Telegram (pemetaan di `003_agent_bot_owner.sql`, endpoint worker di `/api/worker`):

| Agent | Bot Telegram |
|-------|--------------|
| Dika + Kinan | @davadevis_bot |
| Dava + Yanti | @dika_vm_bot |
| Anton | @om_muse_bot |

Sebutan agent yang bukan milik bot sendiri dialihkan otomatis ke bot pemiliknya (auto-responder worker, memakai status nyata dari database).

## 💬 Chat Antar Worker

Menu **Chat** (halaman `web/app/(app)/chat`, API `/api/chat`): thread grup dan DM antar worker dengan tampilan bubble gaya iMessage. Pesan disimpan di tabel `agent_messages` (payload `kind='chat'`), jadi tidak perlu tabel baru.

## 🏢 Main Office & Sidebar Divisi

- **Sidebar per divisi**: satu menu per divisi (Manager, Research, Content, Design, IT/Publisher), masing-masing menampilkan tugas selesai/belum selesai, progres, dan tugas yang melewati tenggat — semua angka diambil dari tabel task yang sama dengan halaman Tasks.
- **Main Office** (halaman `office`, API `/api/office`): avatar tiap pekerja, tugas, dan feed aktivitas selama jam kerja.
- Spesifikasi: `docs/sidebar-divisi-main-office-spec.md`.

## 🎯 Fitur Sprint 1-3

### ✅ Sprint 1 (Foundation)
- [x] Next.js 16.4.6 build OK
- [x] Supabase 22 tabel (migrasi 001)
- [x] Seed 5 agent (dika, kinan, dava, yanti, anton)
- [x] Repository GitHub live

### ✅ Sprint 2 (Owner Dashboard)
- [x] Auth Owner (login/logout/me)
- [x] Dashboard page
- [x] Middleware proteksi halaman
- [x] RLS policies per-user
- [ ] Layout 11 menu (pending)
- [ ] Halaman ringkasan data (pending)

### ✅ Sprint 3 (Task Management)
- [x] CRUD task + 9 status level
- [x] Audit logs
- [x] Endpoint task dependencies
- [x] POST /tasks/:id/submit (hasil kerja + retry)
- [x] Deteksi overdue + notifikasi
- [ ] UI Task Management penuh (pending)

## 🆕 Fitur Terbaru (setelah Sprint 3)

- Chat antar worker + auto-responder bot (lihat di atas).
- Main Office & sidebar per divisi (lihat di atas).
- Pipeline konten: ide → brief → naskah → storyboard (`contents`, `content_ideas`, `content_briefs`, `content_scripts`, `storyboards`; API `/api/content` dengan hapus cascade).
- Pemetaan bot Telegram per agent + worker queue (`/api/worker`).

## 📊 Database Schema

22 tabel utama:
- `users`, `agents`, `agent_prompts`
- `tasks`, `task_dependencies`
- `agent_messages`, `research_reports`, `research_items`
- `contents`, `content_ideas`, `content_briefs`, `content_scripts`, `storyboards`
- `media_assets`, `video_versions`, `approvals`, `publications`
- `analytics`, `notifications`, `audit_logs`, `system_settings`, `ai_usage_logs`

## 🔒 Security

- **RLS (Row Level Security)**: Aktif di tabel `tasks`
- **Middleware**: Proteksi `/dashboard` dan `/tasks`
- **Service Role**: API routes pakai `SUPABASE_SERVICE_ROLE_KEY` (server-side only)
- **Anon Key**: Client-side access (bypass RLS dengan policy yang tepat)

## 🚀 Deploy (Vercel)

1. Connect repo ke Vercel
2. Set environment variables:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`
3. Vercel auto-deploy dari `main` branch

**URL live:** https://ai-content-office.vercel.app/

Catatan: push ke `main` memicu auto-deploy. Jangan push dokumentasi sebelum pemilik meninjau diff/commit yang disetujui — kecuali atas permintaan pemilik langsung.

## 📝 Dokumentasi

- [PRD v1.0](docs/PRD_AI_Virtual_Content_Office_v1.0.pdf)
- [Setup Guide](docs/SETUP.md)
- [QA Checklist](docs/QA-CHECKLIST.md)
- [Agent Prompts](docs/prompts/README.md)
- [Spek Sidebar Divisi + Main Office](docs/sidebar-divisi-main-office-spec.md)
