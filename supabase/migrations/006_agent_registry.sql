-- ============================================================
-- Migrasi 006 — Agent registry & status untuk Agent Chat
--
-- Menyimpan agen yang terdaftar, kapabilitas, status idle/busy/...,
-- progress, dan pesan status terakhir (dipakai Main Office).
-- ============================================================

create table if not exists agent_registry (
  agent_id     text primary key,
  capabilities jsonb not null default '[]'::jsonb,
  status       text not null default 'offline',
  progress     int not null default 0,
  message      text,
  last_seen_at timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create index if not exists idx_agent_registry_status on agent_registry(status);

alter table agent_registry enable row level security;

drop policy if exists agent_registry_read on agent_registry;
create policy agent_registry_read on agent_registry for select using (true);
