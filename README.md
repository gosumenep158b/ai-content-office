# AI Virtual Content Office

Platform produksi konten multi-agent berbasis AI untuk tim konten digital.

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
# Buka SQL Editor di Supabase Dashboard → jalankan:
# - supabase/migrations/001_initial_schema.sql (22 tabel + seed 5 agent)
# - supabase/migrations/002_rls_policies.sql (RLS per-user)
# - supabase/migrations/003_seed_agent_prompts.sql (prompt 5 agent)

# 5. Run development
npm run dev
```

## 📁 Struktur Proyek

```
ai-content-office/
├── web/                      # Next.js app (Frontend + API)
│   ├── app/                  # App Router
│   │   ├── api/              # API Routes
│   │   │   ├── auth/         # Login/Logout/Me
│   │   │   └── tasks/        # Task CRUD + Submit
│   │   ├── dashboard/        # Dashboard page
│   │   ├── tasks/            # Task Management UI
│   │   ├── research/         # Research Center
│   │   └── auth/login/       # Login page
│   ├── src/
│   │   ├── components/ui/    # UI components (Button, Card, Input, Select)
│   │   ├── lib/              # Utilities (supabase.ts, utils.ts)
│   │   └── design-system.css # Navy #0F2440 + Merah #DC2626
│   └── middleware/           # Auth middleware
├── supabase/
│   └── migrations/           # SQL migrations (001-003)
└── docs/
    ├── prompts/              # Agent system prompts (dika, kinan, dava, yanti, anton)
    ├── content-templates/    # Konten templates
    └── video/                # Video production assets
```

## 🔐 Environment Variables

| Variable | Keterangan | Lokasi |
|----------|-----------|--------|
| `NEXT_PUBLIC_SUPABASE_URL` | URL Supabase project | `.env.local` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Anon key (public) | `.env.local` |
| `SUPABASE_SERVICE_ROLE_KEY` | Service role (SECRET — jangan commit) | `.env.local` |

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

## 🤖 Agent System

5 AI Agent dengan system prompt yang tersimpan di `agent_prompts` table:

| Agent | Role | Tanggung Jawab |
|-------|------|----------------|
| **Dika** | Manager | Orchestrator, review 14.00 WIB, approval |
| **Kinan** | Research | Riset tren 24 jam IG/TikTok/Threads |
| **Dava** | Content Strategist | Seleksi ide, brief, naskah, storyboard |
| **Yanti** | Content Designer | Produksi video faceless hybrid |
| **Anton** | IT/Publisher | Paket unggah, analytics snapshot |

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

## 📝 Dokumentasi

- [PRD v1.0](docs/PRD_AI_Virtual_Content_Office_v1.0.pdf)
- [Setup Guide](docs/SETUP.md)
- [QA Checklist](docs/QA-CHECKLIST.md)
- [Agent Prompts](docs/prompts/README.md)