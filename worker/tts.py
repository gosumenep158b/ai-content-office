#!/usr/bin/env python3
"""
tts.py — Text-to-Speech per-scene dengan jeda natural (anti-"AI banget").

Prinsip:
- Naskah dipecah per kalimat/frasa, bukan satu blok panjang.
- Tiap potongan dirender terpisah, lalu disambung dengan jeda pendek (default 320 ms).
- Jeda panjang hanya bila diminta eksplisit (transisi scene).

Provider didukung (env):
  ELEVENLABS_API_KEY   + ELEVENLABS_VOICE_ID
  OPENAI_API_KEY       + TTS_MODEL (default gpt-4o-mini-tts)
  LOKAL                (espeak-ng / pico2wave — hanya untuk uji, terdengar robotik)

Contoh:
  export ELEVENLABS_API_KEY=... ELEVENLABS_VOICE_ID=...
  python3 tts.py --text "Pernah ngerasa belajar lama tapi hasilnya gitu-gitu aja?" --out out/vo.mp3

  python3 tts.py --json scenes.json --out out/vo.mp3
  # scenes.json: [{"scene":1,"narasi":"...","jeda":320}, ...]
"""

import argparse
import json
import os
import shutil
import subprocess
import sys
import tempfile
import urllib.error
import urllib.request

DEFAULT_GAP_MS = 320          # jeda antar kalimat
MAX_CHARS = 700               # potong naskah panjang
SENT_END = ".!?\n"


def potong(narasi: str) -> list:
    """Pecah naskah jadi kalimat pendek (8–14 kata)."""
    narasi = (narasi or "").replace("\n", " ").strip()
    if not narasi:
        return []

    # pisah berdasarkan tanda akhir kalimat, pertahankan tanda
    import re
    bagian = re.split(r'(?<=[.!?])\s+', narasi)
    hasil = []
    for b in bagian:
        b = b.strip()
        if not b:
            continue
        # kalau masih panjang, pecah berdasarkan koma
        if len(b.split()) > 16:
            for sub in b.split(","):
                sub = sub.strip()
                if sub:
                    hasil.append(sub if sub.endswith(tuple(SENT_END)) else sub + ".")
        else:
            hasil.append(b)
    return hasil


def _provider() -> str:
    if os.environ.get("VOICESTUDIO_URL"):
        return "voicestudio"
    if os.environ.get("ELEVENLABS_API_KEY") and os.environ.get("ELEVENLABS_VOICE_ID"):
        return "elevenlabs"
    if os.environ.get("OPENAI_API_KEY"):
        return "openai"
    if shutil.which("espeak-ng") or shutil.which("espeak"):
        return "lokal"
    return "tidak ada"


def _tts_voicestudio(text: str, out: str) -> None:
    """VoiceStudio backend lokal (omnivoice) — OpenAI-compatible endpoint."""
    base = os.environ["VOICESTUDIO_URL"].rstrip("/")
    body = {
        "model": os.environ.get("VOICESTUDIO_MODEL", "omnivoice"),
        "input": text,
        "voice": os.environ.get("VOICESTUDIO_VOICE", "alloy"),
        "response_format": "wav",
        "language": os.environ.get("VOICESTUDIO_LANG", "id"),
    }
    req = urllib.request.Request(
        f"{base}/v1/audio/speech",
        data=json.dumps(body).encode(),
        headers={"Content-Type": "application/json"},
        method="POST",
    )
    with urllib.request.urlopen(req, timeout=600) as r, open(out, "wb") as f:
        f.write(r.read())


def _tts_elevenlabs(text: str, out: str) -> None:
    key = os.environ["ELEVENLABS_API_KEY"]
    voice = os.environ["ELEVENLABS_VOICE_ID"]
    stability = float(os.environ.get("TTS_STABILITY", "0.40"))
    similarity = float(os.environ.get("TTS_SIMILARITY", "0.80"))
    style = float(os.environ.get("TTS_STYLE", "0.28"))
    speed = float(os.environ.get("TTS_SPEED", "1.0"))

    body = {
        "text": text,
        "model_id": os.environ.get("ELEVENLABS_MODEL", "eleven_multilingual_v2"),
        "voice_settings": {
            "stability": stability,
            "similarity_boost": similarity,
            "style": style,
            "speed": speed,
            "use_speaker_boost": True,
        },
    }
    req = urllib.request.Request(
        f"https://api.elevenlabs.io/v1/text-to-speech/{voice}",
        data=json.dumps(body).encode(),
        headers={
            "Content-Type": "application/json",
            "xi-api-key": key,
            "Accept": "audio/mpeg",
        },
        method="POST",
    )
    with urllib.request.urlopen(req, timeout=120) as r, open(out, "wb") as f:
        f.write(r.read())


def _tts_openai(text: str, out: str) -> None:
    key = os.environ["OPENAI_API_KEY"]
    model = os.environ.get("TTS_MODEL", "gpt-4o-mini-tts")
    voice = os.environ.get("TTS_VOICE", "coral")
    instruksi = os.environ.get(
        "TTS_INSTRUKSI",
        "Bicara santai dan hangat seperti mentor muda ke siswa. "
        " tempo sedang, intonasi naik-turun wajar, tidak datar.",
    )

    body = {
        "model": model,
        "voice": voice,
        "input": text,
        "instructions": instruksi,
        "response_format": "mp3",
    }
    req = urllib.request.Request(
        "https://api.openai.com/v1/audio/speech",
        data=json.dumps(body).encode(),
        headers={"Content-Type": "application/json", "Authorization": f"Bearer {key}"},
        method="POST",
    )
    with urllib.request.urlopen(req, timeout=120) as r, open(out, "wb") as f:
        f.write(r.read())


def _tts_lokal(text: str, out: str) -> None:
    bin_ = shutil.which("espeak-ng") or shutil.which("espeak")
    if not bin_:
        raise RuntimeError("tidak ada provider TTS. Set ELEVENLABS_API_KEY atau OPENAI_API_KEY")
    subprocess.run([bin_, "-v", "id", "-s", "165", "-w", out, text], check=True)


def render(narasi: str, out: str, gap_ms: int = DEFAULT_GAP_MS) -> dict:
    """Render narasi per kalimat + sambung dengan jeda. Return info."""
    provider = _provider()
    if provider == "tidak ada":
        raise RuntimeError(
            "belum ada provider TTS. Set ELEVENLABS_API_KEY (+VOICE_ID) atau OPENAI_API_KEY."
        )

    kalimat = potong(narasi)
    if not kalimat:
        raise RuntimeError("narasi kosong")

    tmp = tempfile.mkdtemp(prefix="aico-tts-")
    bagian = []
    try:
        for i, kal in enumerate(kalimat, 1):
            p = os.path.join(tmp, f"p{i:03d}.mp3")
            if provider == "voicestudio":
                p = os.path.join(tmp, f"p{i:03d}.wav")
                _tts_voicestudio(kal, p)
            elif provider == "elevenlabs":
                _tts_elevenlabs(kal, p)
            elif provider == "openai":
                _tts_openai(kal, p)
            else:
                p = os.path.join(tmp, f"p{i:03d}.wav")
                _tts_lokal(kal, p)
            bagian.append(p)

        # buat jeda hening
        jeda = os.path.join(tmp, "gap.wav")
        subprocess.run([
            "ffmpeg", "-y", "-f", "lavfi", "-i",
            f"anullsrc=channel_layout=mono:sample_rate=24000",
            "-t", f"{gap_ms/1000:.3f}", jeda,
        ], check=True, capture_output=True)

        # susun concat
        daftar = os.path.join(tmp, "list.txt")
        with open(daftar, "w", encoding="utf-8") as f:
            for i, b in enumerate(bagian):
                f.write(f"file '{b}'\n")
                if i < len(bagian) - 1:
                    f.write(f"file '{jeda}'\n")

        subprocess.run([
            "ffmpeg", "-y", "-f", "concat", "-safe", "0", "-i", daftar,
            "-ar", "48000", "-ac", "1", "-b:a", "192k", out,
        ], check=True, capture_output=True)

        return {
            "ok": True,
            "provider": provider,
            "kalimat": len(kalimat),
            "jeda_ms": gap_ms,
            "durasi_kalimat": [round(len(k.split()) / 2.4, 1) for k in kalimat],
            "file": out,
            "bytes": os.path.getsize(out) if os.path.exists(out) else 0,
        }
    finally:
        shutil.rmtree(tmp, ignore_errors=True)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--text")
    ap.add_argument("--json", help="file JSON: daftar {scene,narasi,jeda?}")
    ap.add_argument("--out", required=True)
    ap.add_argument("--gap", type=int, default=DEFAULT_GAP_MS)
    a = ap.parse_args()

    if a.json:
        data = json.load(open(a.json, encoding="utf-8"))
        narasi = " ".join((x.get("narasi") or "") for x in data if x.get("narasi"))
    elif a.text:
        narasi = a.text
    else:
        print("butuh --text atau --json", file=sys.stderr)
        sys.exit(2)

    info = render(narasi, a.out, a.gap)
    print(json.dumps(info, ensure_ascii=False))


if __name__ == "__main__":
    main()