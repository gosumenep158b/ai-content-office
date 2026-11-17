#!/usr/bin/env python3
"""
build_v3.py — video 9:16 dengan narasi Piper (Indonesia) + kartu repo asli.

Per scene:
  - TTS Piper (voices/id_ID-news_tts-medium.onnx)
  - Gambar: kartu OG GitHub (opengraph.githubassets.com) untuk scene repo
  - Subtitle terbakar di safe area bawah
  - Durasi mengikuti audio

Output: MP4 1080x1920, H.264/AAC, loudnorm -14 LUFS.
"""

import argparse
import json
import os
import subprocess
import sys
import tempfile
import urllib.request

from PIL import Image, ImageDraw

import visuals

HERE = os.path.dirname(os.path.abspath(__file__))
VOICE = os.path.join(HERE, "voices", "id_ID-news_tts-medium.onnx")
PY = sys.executable
APP_URL = os.environ.get("APP_URL", "https://ai-content-office.vercel.app").rstrip("/")
W, H = 1080, 1920


def sh(cmd):
    r = subprocess.run(cmd, capture_output=True, text=True)
    if r.returncode != 0:
        raise RuntimeError(r.stderr[-400:])
    return r


def durasi(p):
    r = subprocess.run(["ffprobe", "-v", "error", "-show_entries", "format=duration",
                        "-of", "default=nw=1:nk=1", p], capture_output=True, text=True)
    try:
        return float(r.stdout.strip())
    except ValueError:
        return 0.0


def tts(text, out):
    if not os.path.exists(VOICE):
        raise RuntimeError("voice model tidak ada: " + VOICE)
    r = subprocess.run([PY, "-m", "piper", "--model", VOICE, "--output_file", out],
                       input=text, capture_output=True, text=True)
    if r.returncode != 0 or not os.path.exists(out):
        raise RuntimeError("piper gagal: " + r.stderr[-300:])
    return out


def og_image(repo, cache):
    if repo in cache:
        return cache[repo]
    path = os.path.join(cache["_dir"], repo.replace("/", "_") + ".png")
    url = f"https://opengraph.githubassets.com/1/{repo}"
    try:
        req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
        with urllib.request.urlopen(req, timeout=40) as r, open(path, "wb") as f:
            f.write(r.read())
        cache[repo] = path
    except Exception as e:
        print("og gagal", repo, e, file=sys.stderr)
        cache[repo] = None
    return cache[repo]


def frame(scene, idx, total, hook, og_path):
    img, d = visuals.bg()
    visuals.frame_progress(d, idx, total)

    if idx == 1:
        d.text((64, 210), "GITHUB TRENDING", font=visuals.f(visuals.FONT_B, 40), fill=visuals.RED)
        y = 280
        for line in visuals.wrap(d, scene.get("teks") or hook, visuals.f(visuals.FONT_B, 92), W - 128):
            d.text((64, y), line, font=visuals.f(visuals.FONT_B, 92), fill=visuals.WHITE)
            y += 104
        y += 24
        for line in visuals.wrap(d, hook, visuals.f(visuals.FONT_R, 42), W - 128):
            d.text((64, y), line, font=visuals.f(visuals.FONT_R, 42), fill=visuals.MUTED)
            y += 54
        cy = max(y + 40, 760)
        if og_path and os.path.exists(og_path):
            card = Image.open(og_path).convert("RGB")
            card = card.resize((W - 128, int((W - 128) * card.height / card.width)))
            img.paste(card, (64, cy))
        return img

    if idx == total:
        d.text((64, 300), "SEKARANG", font=visuals.f(visuals.FONT_B, 40), fill=visuals.RED)
        y = 380
        for line in visuals.wrap(d, scene.get("teks") or "Komen nomornya", visuals.f(visuals.FONT_B, 88), W - 128):
            d.text((64, y), line, font=visuals.f(visuals.FONT_B, 88), fill=visuals.WHITE)
            y += 100
        cy = max(y + 30, 760)
        for i, nama in enumerate(scene.get("daftar") or [], 1):
            visuals.card(d, [64, cy, W - 64, cy + 96])
            d.text((100, cy + 24), str(i), font=visuals.f(visuals.FONT_B, 44), fill=visuals.RED)
            d.text((160, cy + 30), nama, font=visuals.f(visuals.FONT_R, 36), fill=visuals.WHITE)
            cy += 114
        return img

    # scene repo
    d.text((64, 140), f"REPO #{scene.get('nomor')}", font=visuals.f(visuals.FONT_B, 34), fill=visuals.RED)
    y = 190
    for line in visuals.wrap(d, scene.get("nama") or "", visuals.f(visuals.FONT_B, 78), W - 128):
        d.text((64, y), line, font=visuals.f(visuals.FONT_B, 78), fill=visuals.WHITE)
        y += 88

    visuals.stars_icon(d, 92, y + 26, 24)
    d.text((130, y + 2), scene.get("bintang") or "", font=visuals.f(visuals.FONT_B, 44), fill=(245, 185, 66))
    y += 76

    if og_path and os.path.exists(og_path):
        card = Image.open(og_path).convert("RGB")
        cw = W - 128
        card = card.resize((cw, int(cw * card.height / card.width)))
        img.paste(card, (64, y + 10))
        y += card.height + 34

    for line in visuals.wrap(d, scene.get("deskripsi") or scene.get("teks") or "",
                             visuals.f(visuals.FONT_R, 40), W - 128):
        if y > H - 520:
            break
        d.text((64, y), line, font=visuals.f(visuals.FONT_R, 40), fill=visuals.MUTED)
        y += 50
    return img


def subtitle_band(d, text):
    if not text:
        return
    f = visuals.f(visuals.FONT_B, 40)
    lines = visuals.wrap(d, text, f, W - 200)
    bh = 44 * len(lines) + 44
    top = H - 380 - bh
    d.rounded_rectangle([80, top, W - 80, top + bh], radius=20, fill=(0, 0, 0))
    y = top + 20
    for ln in lines:
        d.text((100, y), ln, font=f, fill=(255, 255, 255))
        y += 44


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--content")
    ap.add_argument("--json")
    ap.add_argument("--out", required=True)
    a = ap.parse_args()

    if a.json:
        data = json.load(open(a.json, encoding="utf-8"))
    else:
        with urllib.request.urlopen(f"{APP_URL}/api/content/{a.content}", timeout=40) as r:
            data = json.load(r)["data"]

    hook = (data.get("script") or {}).get("hook", "")
    scenes = (data.get("storyboard") or {}).get("scenes") or []
    if not scenes:
        raise SystemExit("storyboard kosong")

    total = len(scenes)
    tmp = tempfile.mkdtemp(prefix="aico-v3-")
    cache = {"_dir": tmp}
    segs = []
    try:
        for i, sc in enumerate(scenes, 1):
            vo_teks = (sc.get("audio") or "").replace("VO:", "").strip() or sc.get("teks", "")
            wav = os.path.join(tmp, f"vo{i}.wav")
            tts(vo_teks, wav)
            d_audio = durasi(wav)
            dur = max(float(sc.get("durasi") or 4), d_audio + 0.45)

            repo = sc.get("repo")
            og = og_image(repo, cache) if repo else None

            img = frame(sc, i, total, hook, og)
            subtitle_band(ImageDraw.Draw(img), vo_teks)
            png = os.path.join(tmp, f"f{i}.png")
            img.save(png)

            seg = os.path.join(tmp, f"s{i}.mp4")
            sh(["ffmpeg", "-y", "-loop", "1", "-framerate", "30", "-i", png, "-i", wav,
                "-t", f"{dur:.3f}",
                "-vf", "fade=t=in:st=0:d=0.18,format=yuv420p",
                "-c:v", "libx264", "-preset", "veryfast", "-crf", "21",
                "-c:a", "aac", "-b:a", "160k", "-ar", "48000", "-ac", "2",
                "-af", "adelay=250|250,apad",
                "-shortest", seg])
            segs.append(seg)
            print(f"  scene {i}/{total}: audio {d_audio:.1f}s -> {dur:.1f}s")

        lf = os.path.join(tmp, "list.txt")
        with open(lf, "w", encoding="utf-8") as f:
            for s in segs:
                f.write(f"file '{s}'\n")

        gab = os.path.join(tmp, "gab.mp4")
        sh(["ffmpeg", "-y", "-f", "concat", "-safe", "0", "-i", lf, "-c", "copy", gab])

        sh(["ffmpeg", "-y", "-i", gab, "-af", "loudnorm=I=-14:TP=-1.5:LRA=11",
            "-c:v", "copy", "-c:a", "aac", "-b:a", "192k", a.out])

        print(json.dumps({"ok": True, "file": a.out, "bytes": os.path.getsize(a.out),
                          "durasi": round(durasi(a.out), 1)}, ensure_ascii=False))
    finally:
        pass


if __name__ == "__main__":
    main()