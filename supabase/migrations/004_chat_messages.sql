-- ============================================================
-- Migrasi 004 — Chat antar worker / bot
--
-- Room:
--   'kantor'                            -> grup semua worker
--   'dm:<botA>:<botB>' (urut alfabet)   -> percakapan 1:1
--
-- Worker yang dikenal:
--   davadevis_bot, dika_vm_bot, om_muse_bot
-- ============================================================

create table if not exists chat_messages (
  id          uuid primary key default uuid_generate_v4(),
  room        text not null default 'kantor',
  sender      text not null,
  body        text not null,
  created_at  timestamptz not null default now(),
  read_by     jsonb default '[]'::jsonb
);

create index if not exists idx_chat_room_time on chat_messages(room, created_at desc);

-- RLS: baca bebas untuk user login (lewat API service role), tulis lewat API.
alter table chat_messages enable row level security;

drop policy if exists chat_read on chat_messages;
create policy chat_read on chat_messages for select using (true);
