#!/usr/bin/env python3
"""
build_video.py — render video 9:16 lengkap: visual + voice-over + mastering.

Alur:
  1. ambil konten (API atau file JSON) -> hook, narasi, storyboard.scenes
  2. per scene: TTS (OpenAI) + gambar visual + potong sesuai durasi audio
  3. gabung segmen, normalisasi loudness -14 LUFS

Butuh env:
  OPENAI_API_KEY     (TTS)
  TTS_MODEL          default gpt-4o-mini-tts
  TTS_VOICE          default coral

Contoh:
  python3 build_video.py --content 4c80a32c-... --out output/v2.mp4
  python3 build_video.py --json payload.json --out output/v2.mp4
"""

import argparse
import json
import os
import shutil
import subprocess
import sys
import tempfile
import urllib.request

import visuals

HERE = os.path.dirname(os.path.abspath(__file__))
APP_URL = os.environ.get("APP_URL", "https://ai-content-office.vercel.app").rstrip("/")


def sh(cmd):
    r = subprocess.run(cmd, capture_output=True, text=True)
    if r.returncode != 0:
        raise RuntimeError(r.stderr[-500:])
    return r


def durasi(path: str) -> float:
    r = subprocess.run(
        ["ffprobe", "-v", "error", "-show_entries", "format=duration",
         "-of", "default=nw=1:nk=1", path], capture_output=True, text=True)
    try:
        return float(r.stdout.strip())
    except ValueError:
        return 0.0


def tts(text: str, out: str) -> bool:
    key = os.environ.get("OPENAI_API_KEY")
    if not key:
        return False
    body = {
        "model": os.environ.get("TTS_MODEL", "gpt-4o-mini-tts"),
        "voice": os.environ.get("TTS_VOICE", "coral"),
        "input": text,
        "response_format": "mp3",
        "instructions": (
            "Bicara santai seperti kreator konten Indonesia yang paham teknologi. "
            "Tempo cepat tapi jelas, intonasi naik-turun wajar, tidak datar, "
            "seperti menjelaskan ke teman."
        ),
    }
    req = urllib.request.Request(
        "https://api.openai.com/v1/audio/speech",
        data=json.dumps(body).encode(),
        headers={"Content-Type": "application/json", "Authorization": f"Bearer {key}"},
        method="POST",
    )
    try:
        with urllib.request.urlopen(req, timeout=120) as r, open(out, "wb") as f:
            f.write(r.read())
        return os.path.getsize(out) > 1000
    except Exception as e:
        print("TTS gagal:", e, file=sys.stderr)
        return False


def muat(content_id: str = None, path: str = None) -> dict:
    if path:
        return json.load(open(path, encoding="utf-8"))
    with urllib.request.urlopen(f"{APP_URL}/api/content/{content_id}", timeout=40) as r:
        return json.load(r)["data"]


def jenis_scene(scene: dict, idx: int, total: int) -> str:
    return (scene.get("jenis") or "").lower()


def buat_frame(scene: dict, idx: int, total: int, hook: str, semua_nama: list) -> "object":
    teks_nomor = scene.get("nomor") or idx
    jenis = scene.get("jenis") or ""
    if idx == 1:
        return visuals.scene_hook(idx, total, scene.get("teks") or hook, hook)
    if idx == total:
        return visuals.scene_cta(idx, total, scene.get("teks") or "Komen nomornya", semua_nama)
    return visuals.scene_repo(
        idx, total, teks_nomor,
        scene.get("nama") or (scene.get("teks") or ""),
        scene.get("bintang") or "",
        scene.get("deskripsi") or scene.get("teks") or "",
        jenis,
    )


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--content")
    ap.add_argument("--json")
    ap.add_argument("--out", required=True)
    ap.add_argument("--no-tts", action="store_true")
    a = ap.parse_args()

    data = muat(a.content, a.json)
    hook = (data.get("script") or {}).get("hook", "")
    sb = data.get("storyboard") or {}
    scenes = sb.get("scenes") or []
    if not scenes:
        raise SystemExit("storyboard kosong")

    total = len(scenes)
    semua_nama = [s.get("nama") or s.get("teks", "")[:22] for s in scenes[1:-1]]

    tmp = tempfile.mkdtemp(prefix="aico-build-")
    segs = []
    try:
        for i, sc in enumerate(scenes, 1):
            vo_teks = (sc.get("audio") or "").replace("VO:", "").strip()
            vo = os.path.join(tmp, f"vo{i}.mp3")
            ok = False if a.no_tts else (tts(vo_teks, vo) if vo_teks else False)
            if not ok:
                # hening sebagai placeholder
                sh(["ffmpeg", "-y", "-f", "lavfi", "-i",
                    "anullsrc=channel_layout=mono:sample_rate=48000",
                    "-t", str(sc.get("durasi") or 4), vo])

            d_audio = durasi(vo)
            dur = max(float(sc.get("durasi") or 4), d_audio + 0.35)

            img = buat_frame(sc, i, total, hook, semua_nama)
            png = visuals.save(img, os.path.join(tmp, f"f{i}.png"))

            seg = os.path.join(tmp, f"seg{i}.mp4")
            sh([
                "ffmpeg", "-y", "-loop", "1", "-framerate", "30", "-i", png,
                "-i", vo,
                "-t", f"{dur:.3f}",
                "-vf", "fade=t=in:st=0:d=0.2,format=yuv420p",
                "-c:v", "libx264", "-preset", "veryfast", "-crf", "22",
                "-c:a", "aac", "-b:a", "128k", "-ar", "48000", "-ac", "2",
                "-shortest", seg,
            ])
            segs.append(seg)
            print(f"  scene {i}/{total}: {dur:.1f}s")

        listfile = os.path.join(tmp, "list.txt")
        with open(listfile, "w", encoding="utf-8") as f:
            for s in segs:
                f.write(f"file '{s}'\n")

        gabung = os.path.join(tmp, "gabung.mp4")
        sh(["ffmpeg", "-y", "-f", "concat", "-safe", "0", "-i", listfile,
            "-c", "copy", gabung])

        # mastering loudness -14 LUFS
        sh(["ffmpeg", "-y", "-i", gabung,
            "-af", "loudnorm=I=-14:TP=-1.5:LRA=11",
            "-c:v", "copy", "-c:a", "aac", "-b:a", "160k", "-ar", "48000", a.out])

        print(json.dumps({"ok": True, "file": a.out, "bytes": os.path.getsize(a.out),
                          "durasi": round(durasi(a.out), 1)}, ensure_ascii=False))
    finally:
        shutil.rmtree(tmp, ignore_errors=True)


if __name__ == "__main__":
    main()