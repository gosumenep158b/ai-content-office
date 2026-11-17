#!/usr/bin/env python3
"""
aico_worker.py — worker seragam untuk semua bot.

Satu kode, beda konfigurasi (env). Worker hanya memproses agent miliknya
(MY_AGENTS), mengambil task dari /api/worker/queue, mengeksekusi handler,
lalu submit hasil. Heartbeat dikirim berkala.

Contoh env (lihat .env.example):
    APP_URL=https://ai-content-office.vercel.app
    BOT=dika_vm_bot
    MY_AGENTS=dava,yanti
    QUEUE_TOKEN=...            # bila endpoint antrean memakai token bot
    POLL_SECONDS=60
    HEARTBEAT_SECONDS=600

Jalankan:
    python3 aico_worker.py --once        # sekali jalan (untuk uji)
    python3 aico_worker.py               # loop terus
"""

import argparse
import json
import os
import subprocess
import sys
import time
import urllib.error
import urllib.request

APP_URL = os.environ.get("APP_URL", "https://ai-content-office.vercel.app").rstrip("/")
BOT = os.environ.get("BOT", "dika_vm_bot")
MY_AGENTS = [a.strip() for a in os.environ.get("MY_AGENTS", "").split(",") if a.strip()]
QUEUE_TOKEN = os.environ.get("QUEUE_TOKEN", "").strip()
POLL_SECONDS = int(os.environ.get("POLL_SECONDS", "60"))
HEARTBEAT_SECONDS = int(os.environ.get("HEARTBEAT_SECONDS", "600"))
RENDER_OUT = os.environ.get("RENDER_OUT", "output")


def api(path: str, method: str = "GET", body=None, auth: bool = False):
    url = f"{APP_URL}{path}"
    data = None
    headers = {"Accept": "application/json"}
    if body is not None:
        data = json.dumps(body).encode()
        headers["Content-Type"] = "application/json"
    if auth and QUEUE_TOKEN:
        headers["Authorization"] = f"Bearer {QUEUE_TOKEN}"
    req = urllib.request.Request(url, data=data, headers=headers, method=method)
    try:
        with urllib.request.urlopen(req, timeout=60) as r:
            return json.loads(r.read().decode() or "{}")
    except urllib.error.HTTPError as e:
        try:
            return json.loads(e.read().decode() or "{}")
        except Exception:
            return {"error": f"HTTP {e.code}"}
    except Exception as e:
        return {"error": str(e)}


def log(msg: str):
    print(f"[{time.strftime('%H:%M:%S')}] [{BOT}] {msg}", flush=True)


def heartbeat(status="idle", note=None):
    r = api("/api/worker/heartbeat", "POST", {
        "bot": BOT, "agents": MY_AGENTS, "status": status, "note": note,
    })
    if "error" in r:
        log(f"heartbeat gagal: {r['error']}")


# ---------------------------------------------------------------- handlers
def upload_storage(path: str) -> str | None:
    """Upload ke Supabase Storage (bucket 'videos'), kembalikan public URL."""
    url = os.environ.get("SUPABASE_URL")
    key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")
    if not (url and key) or not os.path.exists(path):
        return None
    url = url.rstrip("/")
    nama = os.path.basename(path)
    obj = f"render/{nama}"
    try:
        data = open(path, "rb").read()
        req = urllib.request.Request(
            f"{url}/storage/v1/object/videos/{obj}",
            data=data,
            headers={
                "apikey": key,
                "Authorization": f"Bearer {key}",
                "Content-Type": "video/mp4",
                "x-upsert": "true",
            },
            method="POST",
        )
        urllib.request.urlopen(req, timeout=180)
        return f"{url}/storage/v1/object/public/videos/{obj}"
    except Exception as e:
        log(f"upload storage gagal: {e}")
        return None


def handle_yanti(task: dict):
    """Produksi video: klaim render job -> render -> simpan versi video."""
    content_id = task.get("content_id")
    if not content_id:
        log(f"yanti: task {task['id'][:8]} tanpa content_id, dilewati")
        return False

    job = None
    jobs = api("/api/render-jobs?status=pending&limit=10").get("data", [])
    if jobs:
        job = next((j for j in jobs if j.get("content_id") == content_id), None)
    if job is None:
        r = api("/api/render-jobs", "POST", {"content_id": content_id})
        job = r.get("data")
        if job is None:
            # tabel antrean belum tersedia -> render langsung (fallback)
            log(f"yanti: antrean tidak tersedia ({r.get('error')}), render langsung")

    if job is not None:
        claim = api("/api/render-jobs", "PATCH", {"id": job["id"], "action": "claim", "bot": BOT})
        if claim.get("error"):
            log(f"yanti: job {job['id'][:8]} sudah diklaim worker lain")
            return False

    os.makedirs(RENDER_OUT, exist_ok=True)
    out = os.path.join(RENDER_OUT, f"{content_id[:8]}-v{int(time.time())}.mp4")

    try:
        detail = api(f"/api/content/{content_id}").get("data") or {}
        sb = detail.get("storyboard") or {}
        if not (sb.get("scenes") or []):
            api("/api/render-jobs", "PATCH", {"id": job["id"], "action": "fail", "error": "storyboard kosong"})
            log("yanti: storyboard kosong")
            return False

        payload = {
            "hook": (detail.get("script") or {}).get("hook", ""),
            "storyboard": sb,
        }
        tmp_json = os.path.join(RENDER_OUT, f"sb-{content_id[:8]}.json")
        with open(tmp_json, "w", encoding="utf-8") as f:
            json.dump(payload, f, ensure_ascii=False)

        cmd = [sys.executable, os.path.join(os.path.dirname(__file__), "render.py"),
               "--json", tmp_json, "--out", out]
        r = subprocess.run(cmd, capture_output=True, text=True, timeout=900)
        if r.returncode != 0:
            api("/api/render-jobs", "PATCH", {"id": job["id"], "action": "fail", "error": r.stderr[-400:]})
            log(f"yanti: render gagal: {r.stderr[-200:]}")
            return False

        size = os.path.getsize(out)
        pub = upload_storage(out)

        # daftarkan / perbarui versi video
        vers = api("/api/videos", "POST", {"content_id": content_id})
        vid = (vers.get("data") or {}).get("id")
        if vid:
            api(f"/api/videos/{vid}", "PATCH", {
                "status": "preview", "file_path": pub or out,
                "catatan": f"render worker {BOT}, {size} bytes" + ("" if pub else " (file lokal)"),
            })

        api("/api/render-jobs", "PATCH", {
            "id": job["id"], "action": "done",
            "output_path": pub or out,
            "result": {"file": out, "bytes": size, "public_url": pub},
        })
        api("/api/tasks", "PATCH", {"id": task["id"], "status": "In Review"})
        log(f"yanti: selesai -> {out} ({size} bytes)")
        return True
    except Exception as e:
        api("/api/render-jobs", "PATCH", {"id": job["id"], "action": "fail", "error": str(e)})
        log(f"yanti: error {e}")
        return False


def handle_dava(task: dict):
    """Naskah otomatis dari riset. Butuh LLM (LLM_API_KEY/LLM_BASE_URL/LLM_MODEL)."""
    key = os.environ.get("LLM_API_KEY")
    base = os.environ.get("LLM_BASE_URL")
    model = os.environ.get("LLM_MODEL")
    if not (key and base and model):
        log("dava: LLM belum dikonfigurasi, task dilewati")
        return False
    log("dava: LLM terkonfigurasi tetapi handler generatif belum diaktifkan di build ini")
    return False


def handle_anton(task: dict):
    """Paket publikasi setelah video final."""
    content_id = task.get("content_id")
    if not content_id:
        return False
    detail = api(f"/api/content/{content_id}").get("data") or {}
    if detail.get("status") not in ("Approved", "Ready to Publish"):
        log(f"anton: konten {content_id[:8]} belum Approved ({detail.get('status')})")
        return False
    script = detail.get("script") or {}
    r = api("/api/publications", "POST", {
        "content_id": content_id,
        "caption": script.get("caption"),
        "hashtags": script.get("hashtags"),
    })
    if r.get("error"):
        log(f"anton: gagal siapkan paket: {r['error']}")
        return False
    api("/api/tasks", "PATCH", {"id": task["id"], "status": "In Review"})
    log("anton: paket publikasi disiapkan")
    return True


HANDLERS = {"yanti": handle_yanti, "dava": handle_dava, "anton": handle_anton}


def tick():
    q = api(f"/api/worker/queue?bot={BOT}", auth=True)
    if "error" in q:
        log(f"queue error: {q['error']}")
        return 0

    agents = q.get("data", {}).get("agents", [])
    tasks = q.get("data", {}).get("tugas", [])
    if not tasks:
        return 0

    by_id = {a["id"]: a["nama"] for a in agents}
    dikerjakan = 0

    for t in tasks:
        nama = by_id.get(t.get("assigned_agent_id"), "")
        if nama not in MY_AGENTS:
            continue
        handler = HANDLERS.get(nama)
        if not handler:
            continue
        log(f"ambil task: {nama} | {t.get('title','')[:50]}")
        if handler(t):
            dikerjakan += 1
    return dikerjakan


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--once", action="store_true")
    args = ap.parse_args()

    if not MY_AGENTS:
        print("MY_AGENTS kosong — isi env, contoh: MY_AGENTS=dava,yanti", file=sys.stderr)
        sys.exit(2)

    log(f"mulai | agents={MY_AGENTS} | app={APP_URL}")
    heartbeat("idle", "worker start")

    last_hb = time.time()
    while True:
        n = tick()
        if n:
            log(f"{n} task diproses")
        if time.time() - last_hb >= HEARTBEAT_SECONDS:
            heartbeat("working" if n else "idle")
            last_hb = time.time()
        if args.once:
            break
        time.sleep(POLL_SECONDS)


if __name__ == "__main__":
    main()