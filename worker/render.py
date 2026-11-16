#!/usr/bin/env python3
"""
render.py — Renderer video faceless 9:16 (1080x1920) dari storyboard.

Dipakai worker Yanti. Menghasilkan MP4 H.264 + AAC, subtitle terbakar.

Cara pakai (CLI):
    python3 render.py --content <content_id> --out out.mp4
    python3 render.py --json storyboard.json --out out.mp4

Tanpa dependensi berat: cukup Pillow (opsional, untuk teks rapi) + ffmpeg.
Bila Pillow tidak ada, fallback ke ffmpeg drawtext.
"""

import argparse
import json
import os
import shutil
import subprocess
import sys
import tempfile

W, H = 1080, 1920
FPS = 30
NAVY = (15, 36, 64)
RED = (220, 38, 38)
WHITE = (255, 255, 255)
FONT_CANDIDATES = [
    "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf",
    "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf",
    "/usr/share/fonts/truetype/liberation/LiberationSans-Bold.ttf",
]


def _font(size: int):
    from PIL import ImageFont
    for p in FONT_CANDIDATES:
        if os.path.exists(p):
            return ImageFont.truetype(p, size)
    return ImageFont.load_default()


def _wrap(draw, text: str, font, max_width: int):
    words = (text or "").split()
    lines, cur = [], ""
    for w in words:
        trial = (cur + " " + w).strip()
        if draw.textlength(trial, font=font) <= max_width:
            cur = trial
        else:
            if cur:
                lines.append(cur)
            cur = w
    if cur:
        lines.append(cur)
    return lines


def _frame(teks_hook: str, teks_scene: str, sub: str, nomor: str) -> str:
    """Buat satu frame PNG. Return path."""
    from PIL import Image, ImageDraw

    img = Image.new("RGB", (W, H), NAVY)
    d = ImageDraw.Draw(img)

    # gradient sederhana navy -> navy terang
    for y in range(H):
        t = y / H
        d.line([(0, y), (W, y)], fill=(
            int(NAVY[0] + (30 - NAVY[0]) * t),
            int(NAVY[1] + (70 - NAVY[1]) * t),
            int(NAVY[2] + (120 - NAVY[2]) * t),
        ))

    # aksen merah di atas
    d.rectangle([0, 0, W, 14], fill=RED)

    # safe area (margin 96px kiri/kanan, 220 atas, 380 bawah)
    left, right = 96, W - 96

    if teks_hook:
        f_hook = _font(64)
        y = 260
        for line in _wrap(d, teks_hook, f_hook, right - left):
            d.text((left, y), line, font=f_hook, fill=RED)
            y += 78

    if teks_scene:
        f_body = _font(52)
        y = 620
        for line in _wrap(d, teks_scene, f_body, right - left):
            d.text((left, y), line, font=f_body, fill=WHITE)
            y += 70

    # subtitle band (aman dari UI TikTok: bottom 380px)
    if sub:
        f_sub = _font(44)
        lines = _wrap(d, sub, f_sub, right - left)
        band_h = 34 * len(lines) + 48
        band_y = H - 380 - band_h
        d.rounded_rectangle([left - 24, band_y, right + 24, band_y + band_h],
                            radius=24, fill=(0, 0, 0))
        yy = band_y + 24
        for line in lines:
            d.text((left, yy), line, font=f_sub, fill=WHITE)
            yy += 44

    # nomor scene kecil
    d.text((left, H - 120), nomor, font=_font(34), fill=(255, 255, 255, 160))

    fd, path = tempfile.mkstemp(suffix=".png")
    os.close(fd)
    img.save(path)
    return path


def render(storyboard: dict, out_path: str, hook: str = "", subtitle_default: str = "") -> str:
    """Render storyboard -> mp4. Return path."""
    if shutil.which("ffmpeg") is None:
        raise RuntimeError("ffmpeg tidak ditemukan")

    scenes = storyboard.get("scenes") or []
    if not scenes:
        raise RuntimeError("storyboard tanpa scenes")

    workdir = tempfile.mkdtemp(prefix="aico-render-")
    frames = []
    total = 0.0

    try:
        for i, sc in enumerate(scenes, 1):
            dur = float(sc.get("durasi") or 3)
            total += dur
            teks = (sc.get("teks") or "").strip()
            audio = (sc.get("audio") or "").strip()
            sub = audio.replace("VO:", "").strip() or subtitle_default
            frames.append((_frame(hook if i == 1 else "", teks, sub, f"Scene {i}/{len(scenes)}"), dur))

        # concat file
        listfile = os.path.join(workdir, "list.txt")
        with open(listfile, "w", encoding="utf-8") as f:
            for p, dur in frames:
                f.write(f"file '{p}'\nduration {dur:.3f}\n")
            f.write(f"file '{frames[-1][0]}'\n")

        cmd = [
            "ffmpeg", "-y", "-f", "concat", "-safe", "0", "-i", listfile,
            "-f", "lavfi", "-i", "anullsrc=channel_layout=stereo:sample_rate=44100",
            "-shortest",
            "-c:v", "libx264", "-preset", "veryfast", "-crf", "23",
            "-pix_fmt", "yuv420p", "-r", str(FPS),
            "-c:a", "aac", "-b:a", "128k",
            "-movflags", "+faststart",
            "-t", f"{total:.3f}",
            out_path,
        ]
        r = subprocess.run(cmd, capture_output=True, text=True)
        if r.returncode != 0:
            raise RuntimeError(f"ffmpeg gagal: {r.stderr[-500:]}")
        return out_path
    finally:
        for p, _ in frames:
            try: os.remove(p)
            except OSError: pass
        shutil.rmtree(workdir, ignore_errors=True)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--json", help="file JSON berisi {hook, storyboard:{scenes:[]}} atau storyboard langsung")
    ap.add_argument("--content", help="content_id (butuh APP_URL env untuk fetch)")
    ap.add_argument("--out", required=True)
    ap.add_argument("--hook", default="")
    args = ap.parse_args()

    if args.json:
        data = json.load(open(args.json, encoding="utf-8"))
        storyboard = data.get("storyboard") or data
        hook = data.get("hook") or args.hook
    elif args.content:
        import urllib.request
        base = os.environ.get("APP_URL", "https://ai-content-office.vercel.app")
        with urllib.request.urlopen(f"{base}/api/content/{args.content}", timeout=30) as r:
            data = json.load(r)["data"]
        storyboard = data.get("storyboard") or {}
        hook = (data.get("script") or {}).get("hook") or args.hook
    else:
        print("butuh --json atau --content", file=sys.stderr)
        sys.exit(2)

    path = render(storyboard, args.out, hook=hook)
    size = os.path.getsize(path)
    print(json.dumps({"ok": True, "file": path, "bytes": size}))


if __name__ == "__main__":
    main()
