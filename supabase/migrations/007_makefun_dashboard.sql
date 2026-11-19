-- ============================================================
-- Migrasi 007 — Dashboard make.fun
--
-- makefun_progress: checklist pengerjaan bounty (diperbarui worker lokal)
-- makefun_activity  : aktivitas agent terakhir (feed dashboard)
-- ============================================================

create table if not exists makefun_progress (
  key        text primary key,
  label      text not null,
  status     text not null default 'todo' check (status in ('todo','doing','done','blocked')),
  note       text,
  pct        int not null default 0,
  updated_at timestamptz not null default now()
);

create table if not exists makefun_activity (
  id         uuid primary key default uuid_generate_v4(),
  agent      text not null,
  kind       text not null default 'log',
  detail     text not null,
  created_at timestamptz not null default now()
);

create index if not exists idx_makefun_activity_created on makefun_activity(created_at desc);

alter table makefun_progress enable row level security;
alter table makefun_activity enable row level security;

drop policy if exists makefun_read on makefun_progress;
create policy makefun_read on makefun_progress for select using (true);

drop policy if exists makefun_activity_read on makefun_activity;
create policy makefun_activity_read on makefun_activity for select using (true);
