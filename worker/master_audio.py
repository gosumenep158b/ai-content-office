#!/usr/bin/env python3
"""
master_audio.py — mastering audio agar terdengar manusiawi & siap sosial media.

Rantai:
  highpass 80 Hz -> de-ess (EQ 6.5 kHz) -> kompresor 2.5:1 -> loudnorm -14 LUFS
  + room tone -60 dB + (opsional) sisipan napas

Contoh:
  python3 master_audio.py --in vo.mp3 --out vo-master.wav
  python3 master_audio.py --in video.mp4 --out vo-master.wav --roomtone --breaths
  python3 master_audio.py --in vo.mp3 --out m.wav --lufs -14 --tp -1.5

Cek hasil:
  ffmpeg -i out.wav -af loudnorm=print_format=json -f null -
"""

import argparse
import json
import os
import re
import shutil
import subprocess
import sys
import tempfile


def _run(cmd):
    r = subprocess.run(cmd, capture_output=True, text=True)
    if r.returncode != 0:
        raise RuntimeError(r.stderr[-600:])
    return r


def ukur_loudness(path: str) -> dict:
    r = subprocess.run(
        ["ffmpeg", "-hide_banner", "-i", path, "-af",
         "loudnorm=I=-14:TP=-1.5:LRA=11:print_format=json", "-f", "null", "-"],
        capture_output=True, text=True,
    )
    m = re.search(r"\{[^{}]*\"input_i\"[^{}]*\}", r.stderr, re.S)
    if not m:
        return {}
    try:
        return json.loads(m.group(0))
    except json.JSONDecodeError:
        return {}


def ekstrak_audio(src: str, dst: str):
    _run(["ffmpeg", "-y", "-i", src, "-vn", "-ac", "1", "-ar", "48000", dst])


def master(src: str, out: str, lufs: float = -14.0, tp: float = -1.5,
           lra: float = 11.0, roomtone: bool = True, breaths: bool = False,
           deess: bool = True) -> dict:
    if shutil.which("ffmpeg") is None:
        raise RuntimeError("ffmpeg tidak ditemukan")

    tmp = tempfile.mkdtemp(prefix="aico-master-")
    try:
        # 1) ambil audio mentah
        src_audio = os.path.join(tmp, "src.wav")
        ekstrak_audio(src, src_audio)

        # 2) filter rantai
        filters = ["highpass=f=80"]
        if deess:
            filters.append("equalizer=f=6500:width_type=o:width=2:g=-5")
        filters += [
            "acompressor=threshold=-18dB:ratio=2.5:attack=10:release=180:makeup=2",
            f"loudnorm=I={lufs}:TP={tp}:LRA={lra}",
        ]

        processed = os.path.join(tmp, "proc.wav")
        _run(["ffmpeg", "-y", "-i", src_audio, "-af", ",".join(filters),
              "-ar", "48000", "-ac", "1", processed])

        # 3) sisipkan napas (opsional): potongan noise pendek tiap ~7 detik
        if breaths:
            dur = float(_run(["ffprobe", "-v", "error", "-show_entries", "format=duration",
                              "-of", "default=nw=1:nk=1", processed]).stdout.strip() or 0)
            segs = []
            t = 6.5
            i = 0
            while t < dur - 2:
                i += 1
                br = os.path.join(tmp, f"breath{i}.wav")
                _run(["ffmpeg", "-y", "-f", "lavfi", "-i",
                      "anoisesrc=color=pink:amplitude=0.06:duration=0.12",
                      "-af", "highpass=f=400,lowpass=f=2000,afade=t=in:d=0.04,afade=t=out:st=0.08:d=0.04,volume=0.5",
                      br])
                segs.append((t, br))
                t += 7.3
            if segs:
                # campur napas ke posisi waktunya
                inputs = ["-i", processed]
                for _, b in segs:
                    inputs += ["-i", b]
                fchain = []
                last = "0:a"
                for idx, (pos, _) in enumerate(segs, start=1):
                    fchain.append(f"[{idx}:a]adelay={int(pos*1000)}|{int(pos*1000)}[b{idx}]")
                    fchain.append(f"[{last}][b{idx}]amix=inputs=2:duration=first:dropout_transition=0[m{idx}]")
                    last = f"m{idx}"
                mixed = os.path.join(tmp, "withbreath.wav")
                _run(["ffmpeg", "-y", *inputs, "-filter_complex", ";".join(fchain),
                      "-map", f"[{last}]", "-ar", "48000", "-ac", "1", mixed])
                processed = mixed

        # 4) room tone -60 dB
        if roomtone:
            tone = os.path.join(tmp, "room.wav")
            _run(["ffmpeg", "-y", "-f", "lavfi", "-i",
                  "anoisesrc=color=brown:amplitude=0.001:duration=600",
                  "-t", "600", tone])
            final = os.path.join(tmp, "final.wav")
            _run(["ffmpeg", "-y", "-i", processed, "-i", tone,
                  "-filter_complex", "[1:a]volume=-60dB[rt];[0:a][rt]amix=inputs=2:duration=first:weights=1 1",
                  "-ar", "48000", "-ac", "1", final])
            processed = final

        # 5) loudnorm akhir (jamin target)
        _run(["ffmpeg", "-y", "-i", processed,
              "-af", f"loudnorm=I={lufs}:TP={tp}:LRA={lra}",
              "-ar", "48000", "-ac", "1", out])

        before = ukur_loudness(src_audio)
        after = ukur_loudness(out)
        return {
            "ok": True,
            "file": out,
            "bytes": os.path.getsize(out) if os.path.exists(out) else 0,
            "sebelum": {"lufs": before.get("input_i"), "lra": before.get("input_lra"), "tp": before.get("input_tp")},
            "sesudah": {"lufs": after.get("input_i"), "lra": after.get("input_lra"), "tp": after.get("input_tp")},
            "opsi": {"deess": deess, "roomtone": roomtone, "breaths": breaths, "lufs": lufs, "tp": tp, "lra": lra},
        }
    finally:
        shutil.rmtree(tmp, ignore_errors=True)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--in", dest="src", required=True)
    ap.add_argument("--out", required=True)
    ap.add_argument("--lufs", type=float, default=-14.0)
    ap.add_argument("--tp", type=float, default=-1.5)
    ap.add_argument("--lra", type=float, default=11.0)
    ap.add_argument("--roomtone", action="store_true", default=True)
    ap.add_argument("--no-roomtone", dest="roomtone", action="store_false")
    ap.add_argument("--breaths", action="store_true")
    ap.add_argument("--no-deess", dest="deess", action="store_false", default=True)
    a = ap.parse_args()

    info = master(a.src, a.out, a.lufs, a.tp, a.lra, a.roomtone, a.breaths, a.deess)
    print(json.dumps(info, ensure_ascii=False, indent=1))


if __name__ == "__main__":
    main()