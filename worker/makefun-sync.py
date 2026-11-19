#!/usr/bin/env python3
"""
makefun-sync.py — push progres & aktivitas bounty ke dashboard AICO.

Memakai tabel agent_messages (payload kind='makefun'), tanpa migrasi baru.

Mode:
  --seed                       tanam checklist awal
  --set KEY STATUS [--pct N] [--note TEKS]
  --log AGEN DETAIL

Butuh env: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
"""

import argparse
import json
import os
import sys
import urllib.error
import urllib.request

SUPA = os.environ.get("SUPABASE_URL", "").rstrip("/")
KEY = os.environ.get("SUPABASE_SERVICE_ROLE_KEY", "")

INITIAL = [
    ("login", "Koneksi akun make.fun (@gosumenep158b)", "done", 100,
     "login CLI berhasil; key 30 hari tersimpan"),
    ("kit", "Unduh & baca kit + RULES.txt", "done", 100,
     "starter/, sdk/, practice/ tersedia"),
    ("git-http", "Git smart HTTP: upload-pack v2 + receive-pack v0", "doing", 55,
     "v2 advertisement + ls-refs; receive-pack belum"),
    ("rest", "REST v3: repos, issues, labels, PRs, contents", "doing", 40,
     "repos + issues jalan; PR merge & contents PUT belum"),
    ("graphql", "GraphQL v4: Issue/PullRequest/Repository + search", "todo", 10, ""),
    ("mcp", "MCP: JSON-RPC 2.0, >=6 tools, streamable HTTP", "todo", 5, ""),
    ("perf", "Performa: push/clone/read/write", "todo", 0,
     "target median <= T_ref rumah"),
    ("practice", "Lolos practice trial (grade-local)", "todo", 0, ""),
    ("submit", "Submit entry + transcript", "todo", 0,
     "maks 5/hari, 10 total; terakhir = final"),
]


def post(payload: dict, sender: str = "dika_vm_bot"):
    body = {"task_id": None, "sender": sender, "receiver": "all", "payload": payload}
    req = urllib.request.Request(f"{SUPA}/rest/v1/agent_messages",
                                 data=json.dumps(body).encode(),
                                 headers={"apikey": KEY, "Authorization": f"Bearer {KEY}",
                                          "Content-Type": "application/json"},
                                 method="POST")
    try:
        with urllib.request.urlopen(req, timeout=30) as r:
            return True
    except urllib.error.HTTPError as e:
        print("ERR", e.code, e.read()[:200], file=sys.stderr)
        return False


def set_progress(key, status, pct, note, label=None):
    post({"kind": "makefun", "type": "progress", "key": key,
          "label": label or key, "status": status, "pct": pct, "note": note})
    print(f"{key} -> {status} ({pct}%)")


def seed():
    for key, label, status, pct, note in INITIAL:
        set_progress(key, status, pct, note, label)
    post({"kind": "makefun", "type": "activity", "agent": "dika_vm_bot",
          "detail": "checklist bounty ditanam (9 item)"})
    print("seed selesai")


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--seed", action="store_true")
    ap.add_argument("--set", nargs=2, metavar=("KEY", "STATUS"))
    ap.add_argument("--pct", type=int, default=0)
    ap.add_argument("--note", default="")
    ap.add_argument("--label", default=None)
    ap.add_argument("--log", nargs=2, metavar=("AGENT", "DETAIL"))
    a = ap.parse_args()

    if not KEY:
        print("SUPABASE_SERVICE_ROLE_KEY belum diset", file=sys.stderr)
        sys.exit(2)

    if a.seed:
        seed()
    elif a.set:
        set_progress(a.set[0], a.set[1], a.pct, a.note, a.label)
    elif a.log:
        post({"kind": "makefun", "type": "activity", "agent": a.log[0], "detail": a.log[1]})
        print("log ok")
    else:
        ap.print_help()


if __name__ == "__main__":
    main()
