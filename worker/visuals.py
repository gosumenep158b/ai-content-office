#!/usr/bin/env python3
"""
visuals.py — komposisi frame 1080x1920 (9:16) yang tidak kosong.

Tiap scene digambar dengan PIL: gradient navy, aksen merah, kartu repo,
angka bintang, mock kode/chart/feed, progress bar, dan nomor scene.
Tidak butuh aset eksternal.
"""

import os
from PIL import Image, ImageDraw, ImageFont

W, H = 1080, 1920
NAVY = (12, 28, 52)
NAVY2 = (22, 52, 92)
RED = (220, 38, 38)
WHITE = (255, 255, 255)
MUTED = (170, 186, 205)
CARD = (26, 44, 74)
LINE = (48, 72, 108)

FONT_B = "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf"
FONT_R = "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf"
FONT_M = "/usr/share/fonts/truetype/dejavu/DejaVuSansMono.ttf"


def f(path, size):
    try:
        return ImageFont.truetype(path, size)
    except Exception:
        return ImageFont.load_default()


def bg():
    img = Image.new("RGB", (W, H), NAVY)
    d = ImageDraw.Draw(img)
    for y in range(H):
        t = y / H
        d.line([(0, y), (W, y)], fill=(
            int(NAVY[0] + (NAVY2[0] - NAVY[0]) * t),
            int(NAVY[1] + (NAVY2[1] - NAVY[1]) * t),
            int(NAVY[2] + (NAVY2[2] - NAVY[2]) * t),
        ))
    # glow merah kanan atas
    glow = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    gd = ImageDraw.Draw(glow)
    for r in range(600, 0, -12):
        a = int(28 * (1 - r / 600))
        gd.ellipse([W - 260 - r, -260 - r, W - 260 + r, -260 + r], fill=(220, 38, 38, a))
    img = Image.alpha_composite(img.convert("RGBA"), glow).convert("RGB")
    return img, ImageDraw.Draw(img)


def wrap(d, text, font, maxw):
    lines, cur = [], ""
    for w in (text or "").split():
        t = (cur + " " + w).strip()
        if d.textlength(t, font=font) <= maxw:
            cur = t
        else:
            if cur:
                lines.append(cur)
            cur = w
    if cur:
        lines.append(cur)
    return lines


def stars_icon(d, x, y, size=26):
    """Bintang sederhana (polygon)."""
    import math
    pts = []
    for i in range(10):
        ang = -math.pi / 2 + i * math.pi / 5
        r = size if i % 2 == 0 else size * 0.45
        pts.append((x + r * math.cos(ang), y + r * math.sin(ang)))
    d.polygon(pts, fill=(245, 185, 66))


def frame_progress(d, idx, total):
    x0, y0, x1 = 64, 40, W - 64
    d.rounded_rectangle([x0, y0, x1, y0 + 8], radius=4, fill=(255, 255, 255, 40))
    w = int((x1 - x0) * (idx / total))
    d.rounded_rectangle([x0, y0, x0 + max(8, w), y0 + 8], radius=4, fill=RED)
    d.text((x0, y0 + 22), f"{idx}/{total}", font=f(FONT_R, 26), fill=MUTED)


def card(d, box, radius=28, fill=CARD):
    d.rounded_rectangle(box, radius=radius, fill=fill, outline=LINE, width=2)


def scene_hook(idx, total, title, sub):
    img, d = bg()
    frame_progress(d, idx, total)
    d.text((64, 300), "GITHUB TRENDING", font=f(FONT_B, 40), fill=RED)
    y = 380
    for line in wrap(d, title, f(FONT_B, 96), W - 128):
        d.text((64, y), line, font=f(FONT_B, 96), fill=WHITE)
        y += 108
    y += 20
    for line in wrap(d, sub, f(FONT_R, 44), W - 128):
        d.text((64, y), line, font=f(FONT_R, 44), fill=MUTED)
        y += 58
    # mock trending list
    cy = 900
    for i in range(3):
        card(d, [64, cy, W - 64, cy + 110])
        d.text((96, cy + 34), f"{i + 1}", font=f(FONT_B, 44), fill=RED)
        d.rounded_rectangle([150, cy + 30, 150 + 300, cy + 52], radius=10, fill=(60, 84, 118))
        d.rounded_rectangle([150, cy + 66, 150 + 460, cy + 82], radius=8, fill=(44, 64, 94))
        stars_icon(d, W - 150, cy + 50)
        cy += 132
    return img


def scene_repo(idx, total, nomor, nama, bintang, deskripsi, jenis):
    img, d = bg()
    frame_progress(d, idx, total)

    d.text((64, 150), f"REPO #{nomor}", font=f(FONT_B, 36), fill=RED)
    y = 210
    for line in wrap(d, nama, f(FONT_B, 84), W - 128):
        d.text((64, y), line, font=f(FONT_B, 84), fill=WHITE)
        y += 96

    # baris bintang
    stars_icon(d, 92, y + 34, 30)
    d.text((132, y + 8), bintang, font=f(FONT_B, 54), fill=(245, 185, 66))
    y += 96

    for line in wrap(d, deskripsi, f(FONT_R, 44), W - 128):
        d.text((64, y), line, font=f(FONT_R, 44), fill=MUTED)
        y += 56

    # mock visual sesuai jenis
    top = max(y + 60, 800)
    box = [64, top, W - 64, H - 380]
    card(d, box)

    if jenis == "office":
        # spreadsheet mock
        for r in range(6):
            for c in range(4):
                x = 100 + c * 220
                yy = top + 60 + r * 90
                d.rounded_rectangle([x, yy, x + 200, yy + 70], radius=8, fill=(36, 58, 92))
        d.rounded_rectangle([W - 340, top + 60, W - 100, top + 420], radius=14, fill=(220, 38, 38, 255))
        d.text((W - 320, top + 90), "AI", font=f(FONT_B, 40), fill=WHITE)
        for i in range(4):
            d.rounded_rectangle([W - 320, top + 160 + i * 60, W - 120, top + 176 + i * 60], radius=6, fill=(255, 255, 255, 120))

    elif jenis == "protocol":
        d.ellipse([120, top + 120, 300, top + 300], outline=WHITE, width=6)
        d.text((150, top + 180), "AGENT", font=f(FONT_B, 28), fill=WHITE)
        d.line([300, top + 210, 520, top + 210], fill=RED, width=8)
        d.polygon([(520, top + 210), (492, top + 194), (492, top + 226)], fill=RED)
        d.rounded_rectangle([540, top + 120, 940, top + 320], radius=18, outline=WHITE, width=6)
        d.text((570, top + 150), "UI", font=f(FONT_B, 34), fill=WHITE)
        for i in range(2):
            d.rounded_rectangle([570, top + 210 + i * 46, 760, top + 240 + i * 46], radius=10, fill=(90, 120, 160))

    elif jenis == "code":
        d.text((100, top + 50), "diff -- review otomatis", font=f(FONT_M, 30), fill=MUTED)
        for i in range(10):
            yy = top + 110 + i * 62
            wdt = 180 + (i * 97) % 520
            warna = (34, 120, 78) if i % 3 else (150, 50, 50)
            d.rounded_rectangle([100, yy, 100 + wdt, yy + 30], radius=6, fill=warna)
        d.text((100, H - 470), "✓ 1.284 baris diperiksa", font=f(FONT_R, 34), fill=(120, 220, 160))

    elif jenis == "chart":
        base = H - 460
        for i, hgt in enumerate([140, 210, 170, 260, 320]):
            x = 130 + i * 150
            d.rounded_rectangle([x, base - hgt, x + 100, base], radius=10, fill=(46, 120, 200) if i < 4 else RED)
        d.line([100, base, W - 100, base], fill=LINE, width=3)

    elif jenis == "feed":
        for i, label in enumerate(["Reddit", "X", "YouTube", "HN"]):
            yy = top + 60 + i * 84
            d.rounded_rectangle([100, yy, 260, yy + 56], radius=12, fill=(40, 64, 100))
            d.text((118, yy + 14), label, font=f(FONT_B, 28), fill=WHITE)
            d.line([270, yy + 28, 420, yy + 28], fill=RED, width=6)
        d.rounded_rectangle([440, top + 70, W - 100, H - 430], radius=16, fill=(36, 58, 92))
        d.text((470, top + 100), "Ringkasan", font=f(FONT_B, 34), fill=WHITE)
        for i in range(6):
            d.rounded_rectangle([470, top + 170 + i * 52, W - 160 - i * 22, top + 196 + i * 52], radius=6, fill=(70, 96, 132))

    return img


def scene_cta(idx, total, teks, nomor_list):
    img, d = bg()
    frame_progress(d, idx, total)
    d.text((64, 320), "SEKARANG", font=f(FONT_B, 40), fill=RED)
    y = 400
    for line in wrap(d, teks, f(FONT_B, 92), W - 128):
        d.text((64, y), line, font=f(FONT_B, 92), fill=WHITE)
        y += 104

    cy = 900
    for i, nama in enumerate(nomor_list, 1):
        card(d, [64, cy, W - 64, cy + 96])
        d.text((100, cy + 24), str(i), font=f(FONT_B, 46), fill=RED)
        d.text((160, cy + 28), nama, font=f(FONT_R, 38), fill=WHITE)
        cy += 116

    d.text((64, H - 460), "Tulis nomornya di komentar", font=f(FONT_R, 40), fill=MUTED)
    return img


def save(img, path):
    os.makedirs(os.path.dirname(path), exist_ok=True)
    img.save(path)
    return path
