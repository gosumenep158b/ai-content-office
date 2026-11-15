-- ============================================================
-- Migrasi 003 — Pemilik (bot) untuk tiap agent
--
-- Pembagian kerja yang disepakati:
--   dika  + kinan  -> davadevis_bot   (otak / orkestrasi + riset)
--   dava  + yanti  -> dika_vm_bot     (naskah + produksi video)
--   anton          -> om_muse_bot     (paket unggah / publikasi)
--
-- Kolom bot_owner dipakai orkestrator untuk mengarahkan task ke
-- worker milik bot yang tepat (/api/worker/queue?bot=<bot_owner>).
-- ============================================================

alter table agents add column if not exists bot_owner text;

update agents set bot_owner = 'davadevis_bot' where nama in ('dika', 'kinan');
update agents set bot_owner = 'dika_vm_bot'   where nama in ('dava', 'yanti');
update agents set bot_owner = 'om_muse_bot'   where nama = 'anton';

create index if not exists idx_agents_bot_owner on agents(bot_owner);
