#!/usr/bin/env bash
# Jalankan 1 siklus worker dika_vm_bot (Dava + Yanti) terhadap aplikasi live.
set -euo pipefail
cd "$(dirname "$0")/.."

export APP_URL="https://ai-content-office.vercel.app"
export BOT="dika_vm_bot"
export MY_AGENTS="dava,yanti"
export QUEUE_TOKEN="$(cat /tmp/q.tok)"
export SUPABASE_URL="$(cat /tmp/sb.url)"
export SUPABASE_SERVICE_ROLE_KEY="$(cat /tmp/svc.key)"
export RENDER_OUT="worker/output"

exec .venv-render/bin/python worker/aico_worker.py --once
