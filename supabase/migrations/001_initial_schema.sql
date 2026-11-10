-- AI Virtual Content Office — Migration 001 (skema inti PRD v1.0)
create extension if not exists "uuid-ossp";

-- 1. users
create table if not exists users (
  id uuid primary key default uuid_generate_v4(),
  email text unique not null,
  nama text,
  status text default 'active',
  created_at timestamptz default now(), updated_at timestamptz default now()
);
-- 2. agents
create table if not exists agents (
  id uuid primary key default uuid_generate_v4(),
  nama text unique not null,          -- dika, kinan, dava, yanti, anton
  role text not null,
  deskripsi text,
  status text default 'active',        -- active | paused
  created_at timestamptz default now(), updated_at timestamptz default now()
);
-- 3. agent_prompts
create table if not exists agent_prompts (
  id uuid primary key default uuid_generate_v4(),
  agent_id uuid references agents(id),
  version int not null default 1,
  prompt text not null,
  effective_at timestamptz default now(),
  created_at timestamptz default now()
);
-- 4. tasks
create table if not exists tasks (
  id uuid primary key default uuid_generate_v4(),
  title text not null,
  description text,
  goal text,
  assigned_agent_id uuid references agents(id),
  priority text default 'medium',      -- low|medium|high|urgent
  status text default 'Backlog',       -- Backlog|Assigned|In Progress|Waiting Input|In Review|Revision|Completed|Blocked|Cancelled
  due_at timestamptz,
  content_id uuid,
  attempt int default 0,
  created_at timestamptz default now(), updated_at timestamptz default now()
);
create index if not exists idx_tasks_status_due on tasks(status, due_at);
create index if not exists idx_tasks_agent_status on tasks(assigned_agent_id, status);
-- 5. task_dependencies
create table if not exists task_dependencies (
  id uuid primary key default uuid_generate_v4(),
  task_id uuid references tasks(id),
  depends_on_task_id uuid references tasks(id),
  created_at timestamptz default now()
);
-- 6. agent_messages
create table if not exists agent_messages (
  id uuid primary key default uuid_generate_v4(),
  task_id uuid references tasks(id),
  sender text, receiver text,
  payload jsonb,
  created_at timestamptz default now()
);
-- 7. research_reports
create table if not exists research_reports (
  id uuid primary key default uuid_generate_v4(),
  periode text,                        -- contoh: '24h 2026-11-10'
  platform text,                       -- instagram|tiktok|threads
  summary text,
  created_by text default 'kinan',
  created_at timestamptz default now()
);
-- 8. research_items
create table if not exists research_items (
  id uuid primary key default uuid_generate_v4(),
  report_id uuid references research_reports(id),
  platform text, topic text,
  source_url text, captured_at timestamptz, published_at timestamptz,
  metric_values jsonb, metric_source text,
  verification_status text default 'Unverified', -- Verified|Estimated|Unverified|Unavailable
  notes text,
  created_at timestamptz default now()
);
create index if not exists idx_research_platform_time on research_items(platform, captured_at);
-- 9. contents
create table if not exists contents (
  id uuid primary key default uuid_generate_v4(),
  title text not null,
  platform text default 'tiktok',
  purpose text, audience text, topic text, angle text,
  status text default 'Idea',          -- sesuai Lampiran B
  created_at timestamptz default now(), updated_at timestamptz default now()
);
create index if not exists idx_contents_status on contents(status, created_at);
-- 10. content_ideas
create table if not exists content_ideas (
  id uuid primary key default uuid_generate_v4(),
  research_item_id uuid references research_items(id),
  content_id uuid references contents(id),
  skor jsonb, status text default 'candidate',
  created_at timestamptz default now()
);
-- 11. content_briefs
create table if not exists content_briefs (
  id uuid primary key default uuid_generate_v4(),
  content_id uuid references contents(id),
  body jsonb, version int default 1,
  created_at timestamptz default now()
);
-- 12. content_scripts
create table if not exists content_scripts (
  id uuid primary key default uuid_generate_v4(),
  content_id uuid references contents(id),
  hook text, narasi text, cta text, caption text, hashtags text,
  estimasi_durasi int,
  version int default 1, catatan_perubahan text,
  created_by text default 'dava',
  created_at timestamptz default now()
);
-- 13. storyboards
create table if not exists storyboards (
  id uuid primary key default uuid_generate_v4(),
  content_id uuid references contents(id),
  scenes jsonb,                        -- [{scene,durasi,visual,teks,audio,catatan}]
  version int default 1,
  created_at timestamptz default now()
);
-- 14. media_assets
create table if not exists media_assets (
  id uuid primary key default uuid_generate_v4(),
  content_id uuid references contents(id),
  tipe text,                           -- ai_video|stock|motion|image|audio
  file_path text, sumber text, lisensi text,
  metadata jsonb,
  created_at timestamptz default now()
);
-- 15. video_versions
create table if not exists video_versions (
  id uuid primary key default uuid_generate_v4(),
  content_id uuid references contents(id),
  status text default 'draft',         -- draft|preview|revision|final
  file_path text, checksum text,
  spec jsonb default '{"container":"mp4","ratio":"9:16","resolution":"1080x1920","vcodec":"h264","acodec":"aac","fps":30,"subtitle":"embedded"}',
  catatan text,
  created_at timestamptz default now()
);
-- 16. approvals (reviewer_type + tepat satu reviewer id)
create table if not exists approvals (
  id uuid primary key default uuid_generate_v4(),
  content_id uuid references contents(id),
  decision text,                       -- Approved|Revision|Rejected|Overridden
  catatan text,
  reviewer_type text not null check (reviewer_type in ('agent','owner')),
  reviewer_agent_id uuid references agents(id),
  reviewer_user_id uuid references users(id),
  check ( (reviewer_type='agent' and reviewer_agent_id is not null and reviewer_user_id is null)
       or (reviewer_type='owner' and reviewer_user_id is not null and reviewer_agent_id is null) ),
  created_at timestamptz default now()
);
-- 17. publications
create table if not exists publications (
  id uuid primary key default uuid_generate_v4(),
  content_id uuid references contents(id),
  status text default 'Draft',         -- Draft|Package Ready|Awaiting Owner Confirmation|Published|Failed/Cancelled
  package_path text, caption text, hashtags text, cover_path text,
  akun text, url text, published_at timestamptz,
  confirmed_by uuid references users(id),
  created_at timestamptz default now(), updated_at timestamptz default now()
);
-- 18. analytics
create table if not exists analytics (
  id uuid primary key default uuid_generate_v4(),
  publication_id uuid references publications(id),
  captured_at timestamptz default now(),
  interval text,                       -- t0|+1h|+6h|+12h|+24h
  views bigint, likes bigint, comments bigint, shares bigint, saves bigint,
  input_by text,
  created_at timestamptz default now()
);
create index if not exists idx_analytics_pub on analytics(publication_id, captured_at);
-- 19. notifications
create table if not exists notifications (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references users(id),
  tipe text, title text, body text,
  link text, read boolean default false,
  created_at timestamptz default now()
);
-- 20. audit_logs
create table if not exists audit_logs (
  id uuid primary key default uuid_generate_v4(),
  actor text, actor_type text,         -- agent|owner|system
  action text, entity text, entity_id uuid,
  before jsonb, after jsonb, alasan text,
  created_at timestamptz default now()
);
-- 21. system_settings
create table if not exists system_settings (
  key text primary key,
  value jsonb,
  updated_at timestamptz default now()
);
-- 22. ai_usage_logs
create table if not exists ai_usage_logs (
  id uuid primary key default uuid_generate_v4(),
  agent_id uuid references agents(id),
  task_id uuid references tasks(id),
  model text, tokens_in int, tokens_out int, biaya numeric,
  created_at timestamptz default now()
);

-- Seed 5 agent
insert into agents (nama, role, deskripsi) values
 ('dika','Manager','Orchestrator: bagi task, deadline, review 14.00 WIB'),
 ('kinan','Research','Riset tren 24 jam IG/TikTok/Threads + bukti sumber'),
 ('dava','Content Strategist','Seleksi ide, brief, hook, naskah, storyboard'),
 ('yanti','Content Designer','Produksi video faceless hybrid + subtitle'),
 ('anton','IT/Publisher','Paket unggah manual, konfirmasi Owner, snapshot analytics')
on conflict (nama) do nothing;
