# Worker AI Content Office

Satu kode worker, konfigurasi berbeda per bot (env). Worker hanya memproses agent miliknya.

| Bot | `MY_AGENTS` | Tanggung jawab |
|---|---|---|
| `davadevis_bot` | `dika,kinan` | orkestrasi + riset |
| `dika_vm_bot` | `dava,yanti` | naskah + produksi video |
| `om_muse_bot` | `anton` | paket unggah + analytics |
| `staf_ai_cue_bot` | `yanti` (bila dimigrasikan) | render khusus |

## Pasang

```bash
cd worker
python3 -m venv .venv && .venv/bin/pip install Pillow
sudo apt-get install -y ffmpeg
cp .env.example .env      # isi BOT, MY_AGENTS, QUEUE_TOKEN
set -a && . ./.env && set +a
```

## Jalankan

```bash
python3 aico_worker.py --once     # satu siklus (uji)
python3 aico_worker.py            # loop
```

## Isi worker

- `aico_worker.py` — loop: heartbeat → ambil antrean → jalankan handler per agent
- `render.py` — renderer MP4 1080×1920 (H.264/AAC, subtitle terbakar) dari storyboard

## Handler

| Agent | Aksi |
|---|---|
| `yanti` | klaim `render_jobs` → render MP4 → daftar `video_versions` (preview) → task `In Review` |
| `dava` | butuh `LLM_*` env; membuat brief/naskah/storyboard |
| `anton` | buat paket publikasi setelah konten `Approved` / `Ready to Publish` |

## Guard anti dobel-kerja

- Antrean difilter `bot_owner` → worker hanya menerima agent miliknya
- `render_jobs` diklaim lewat UPDATE bersyarat (`status='pending'`) → satu job satu worker
- Gagal render 3× → job jadi `failed`, tidak diulang tanpa tindakan manual

## Heartbeat

Tiap `HEARTBEAT_SECONDS` worker lapor ke `/api/worker/heartbeat`.
Cek status semua worker:

```bash
curl -s https://ai-content-office.vercel.app/api/worker/heartbeat | jq
```
