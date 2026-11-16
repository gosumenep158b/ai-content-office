-- ============================================================
-- Migrasi 005 — Antrean render video (render_jobs)
--
-- Satu job = satu permintaan render untuk satu versi video.
-- Klaim job memakai UPDATE bersyarat (status='pending') sehingga
-- dua worker tidak bisa mengambil job yang sama.
-- ============================================================

create table if not exists render_jobs (
  id               uuid primary key default uuid_generate_v4(),
  content_id       uuid references contents(id),
  video_version_id uuid references video_versions(id),
  status           text not null default 'pending'
                     check (status in ('pending','claimed','done','failed')),
  claimed_by       text,
  claimed_at       timestamptz,
  attempts         int not null default 0,
  spec             jsonb,
  result           jsonb,
  error            text,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

create index if not exists idx_render_jobs_status on render_jobs(status, created_at);
create index if not exists idx_render_jobs_content on render_jobs(content_id);

alter table render_jobs enable row level security;

drop policy if exists render_jobs_read on render_jobs;
create policy render_jobs_read on render_jobs for select using (true);
