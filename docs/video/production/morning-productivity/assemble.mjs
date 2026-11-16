// assemble.mjs — TTS per scene + assemble MP4 (1080x1920, H.264/AAC, 30fps)
import { execFileSync } from "node:child_process";
import { writeFileSync, existsSync, mkdirSync, readdirSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dir = dirname(fileURLToPath(import.meta.url));
const FR = resolve(__dir, "frames");
const AU = resolve(__dir, "audio");
const SC = resolve(__dir, "scenes");
for (const d of [AU, SC]) if (!existsSync(d)) mkdirSync(d, { recursive: true });

const VOICE = "id-ID-GadisNeural";
const narrations = [
  "Pagi selalu terburu-buru? Coba tiga hal ini besok pagi.",
  "Pertama, siapkan semuanya malam sebelumnya. Baju, tas, sarapan. Begitu bangun, kamu tinggal jalan.",
  "Kedua, bangun tiga puluh menit lebih awal. Bukan buat kerja, tapi buat napas. Lima belas menit tanpa HP itu mengubah seluruh pagi kamu.",
  "Ketiga, kerjakan satu tugas paling penting dulu, sebelum notifikasi masuk. Sekali selesai, harimu sudah menang separuh.",
  "Tiga hal kecil. Satu jam kembali. Besok pagi, coba yang pertama dulu.",
  "Simpan video ini buat besok pagi, dan follow buat tips lainnya.",
];

function ffprobeDur(file) {
  const out = execFileSync("ffprobe", ["-v", "error", "-show_entries", "format=duration",
    "-of", "default=noprint_wrappers=1:nokey=1", file]).toString().trim();
  return parseFloat(out);
}

const MIN = [3, 6, 6, 6, 6, 6]; // minimum scene duration seconds
const listLines = [];

for (let i = 0; i < 6; i++) {
  const n = i + 1;
  const mp3 = resolve(AU, `scene${n}.mp3`);
  // 1) TTS
  execFileSync("edge-tts", ["--voice", VOICE, "--text", narrations[i], "--write-media", mp3],
    { stdio: "ignore", timeout: 120000 });
  const vdur = ffprobeDur(mp3);
  const dur = Math.max(MIN[i], +(vdur + 0.45).toFixed(2)); // small tail padding
  console.log(`scene ${n}: voice ${vdur.toFixed(2)}s -> clip ${dur}s`);

  const png = resolve(FR, `scene${n}.png`);
  const seg = resolve(SC, `scene${n}.mp4`);
  // 2) image+audio -> segment, letterbox-safe scale, fps 30, H.264/AAC, yuv420p
  execFileSync("ffmpeg", [
    "-y", "-loop", "1", "-i", png, "-i", mp3,
    "-vf", "scale=1080:1920,fps=30,format=yuv420p",
    "-af", `adelay=150|150,apad=pad_dur=0.45,afade=t=in:st=0:d=0.15`,
    "-c:v", "libx264", "-tune", "stillimage", "-preset", "medium", "-crf", "20",
    "-c:a", "aac", "-b:a", "192k", "-ar", "44100",
    "-t", String(dur), "-shortest", seg,
  ], { stdio: "ignore", timeout: 180000 });
  listLines.push(`file '${seg}'`);
}

// 3) concat
const listPath = resolve(SC, "list.txt");
writeFileSync(listPath, listLines.join("\n") + "\n");
const finalOut = resolve(__dir, "final-preview.mp4");
execFileSync("ffmpeg", [
  "-y", "-f", "concat", "-safe", "0", "-i", listPath,
  "-c", "copy", "-movflags", "+faststart", finalOut,
], { stdio: "ignore", timeout: 120000 });

const total = ffprobeDur(finalOut);
console.log(`DONE final-preview.mp4  total ${total.toFixed(2)}s`);
