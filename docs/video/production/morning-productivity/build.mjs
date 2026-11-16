// build.mjs — Yanti video production pipeline
// Render 6 scene frames (1080x1920) via Chromium, generate TTS per scene,
// assemble to MP4 (H.264/AAC, 30fps) with burned-in subtitles.
import { execFileSync } from "node:child_process";
import { writeFileSync, existsSync, mkdirSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dir = dirname(fileURLToPath(import.meta.url));
const FR = resolve(__dir, "frames");
const AU = resolve(__dir, "audio");
if (!existsSync(FR)) mkdirSync(FR, { recursive: true });
if (!existsSync(AU)) mkdirSync(AU, { recursive: true });

const NAVY = "#0F2440", NAVY2 = "#1B3A5C", RED = "#DC2626", AMBER = "#F59E0B";
const LIGHT = "#F9FAFB", TEXT = "#111827", MUTED = "#6B7280";

// 6 scene definitions. onScreen = big headline; subtitle = burned-in caption; narration = TTS text.
const scenes = [
  {
    scene: 1, type: "hook", kicker: "TIPS PAGI",
    onScreen: "Pagi selalu\nterburu-buru?",
    subtitle: "Coba tiga hal ini besok pagi.",
    narration: "Pagi selalu terburu-buru? Coba tiga hal ini besok pagi.",
    number: null, icon: "clock",
  },
  {
    scene: 2, type: "point", kicker: "LANGKAH 1",
    onScreen: "Siapkan\nmalam sebelumnya",
    subtitle: "Baju, tas, sarapan — begitu bangun, tinggal jalan.",
    narration: "Pertama, siapkan semuanya malam sebelumnya. Baju, tas, sarapan. Begitu bangun, kamu tinggal jalan.",
    number: "1", icon: "checklist",
  },
  {
    scene: 3, type: "point", kicker: "LANGKAH 2",
    onScreen: "Bangun 30 menit\nlebih awal",
    subtitle: "Bukan buat kerja, tapi buat napas.",
    narration: "Kedua, bangun tiga puluh menit lebih awal. Bukan buat kerja, tapi buat napas. Lima belas menit tanpa HP itu mengubah seluruh pagi kamu.",
    number: "2", icon: "sunrise",
  },
  {
    scene: 4, type: "point", kicker: "LANGKAH 3",
    onScreen: "Satu tugas\npaling penting",
    subtitle: "Kerjakan dulu, sebelum notifikasi masuk.",
    narration: "Ketiga, kerjakan satu tugas paling penting dulu, sebelum notifikasi masuk. Sekali selesai, harimu sudah menang separuh.",
    number: "3", icon: "target",
  },
  {
    scene: 5, type: "recap", kicker: "RANGKUMAN",
    onScreen: "Tiga hal kecil.\nSatu jam kembali.",
    subtitle: "Besok pagi, coba yang pertama dulu.",
    narration: "Tiga hal kecil. Satu jam kembali. Besok pagi, coba yang pertama dulu.",
    number: null, icon: "spark",
  },
  {
    scene: 6, type: "endcard", kicker: "",
    onScreen: "Simpan buat\nbesok pagi",
    subtitle: "Follow buat tips produktivitas lainnya.",
    narration: "Simpan video ini buat besok pagi, dan follow buat tips lainnya.",
    number: null, icon: "logo",
  },
];

function iconSVG(name, color) {
  const s = 'stroke="' + color + '" stroke-width="10" fill="none" stroke-linecap="round" stroke-linejoin="round"';
  switch (name) {
    case "clock": return `<svg viewBox="0 0 100 100"><circle cx="50" cy="50" r="38" ${s}/><path d="M50 30 V52 L66 62" ${s}/></svg>`;
    case "checklist": return `<svg viewBox="0 0 100 100"><path d="M22 30 l10 10 l18 -18" ${s}/><path d="M22 62 l10 10 l18 -18" ${s}/><path d="M62 34 H86" ${s}/><path d="M62 66 H86" ${s}/></svg>`;
    case "sunrise": return `<svg viewBox="0 0 100 100"><path d="M20 70 H80" ${s}/><path d="M50 70 a22 22 0 0 1 0 -44" ${s}/><path d="M50 18 V10 M80 26 l6 -6 M20 26 l-6 -6 M50 44 V38" ${s}/></svg>`;
    case "target": return `<svg viewBox="0 0 100 100"><circle cx="50" cy="50" r="36" ${s}/><circle cx="50" cy="50" r="18" ${s}/><circle cx="50" cy="50" r="4" fill="${color}"/></svg>`;
    case "spark": return `<svg viewBox="0 0 100 100"><path d="M50 14 L58 42 L86 50 L58 58 L50 86 L42 58 L14 50 L42 42 Z" ${s}/></svg>`;
    default: return "";
  }
}

function logoSVG() {
  return `<svg viewBox="0 0 120 120" width="200" height="200">
    <rect x="6" y="6" width="108" height="108" rx="26" fill="#FFFFFF"/>
    <polygon points="50,42 50,78 82,60" fill="${NAVY}"/>
    <rect x="26" y="46" width="14" height="6" rx="3" fill="${NAVY}"/>
    <rect x="26" y="57" width="14" height="6" rx="3" fill="${RED}"/>
    <rect x="26" y="68" width="14" height="6" rx="3" fill="${NAVY}"/>
  </svg>`;
}

function frameHTML(s) {
  const isEnd = s.type === "endcard";
  const bg = isEnd
    ? `background: radial-gradient(circle at 30% 20%, ${NAVY2}, ${NAVY} 70%);`
    : `background: radial-gradient(circle at 50% 28%, #ffffff 0%, ${LIGHT} 60%, #eef2f7 100%);`;

  const onScreenColor = isEnd ? "#FFFFFF" : NAVY;
  const kickerColor = isEnd ? AMBER : RED;
  const subBg = isEnd ? "rgba(255,255,255,0.12)" : "rgba(15,36,64,0.82)";
  const subColor = "#FFFFFF";

  const numBadge = s.number
    ? `<div style="position:absolute;left:64px;top:570px;width:150px;height:150px;border-radius:32px;background:${NAVY};display:flex;align-items:center;justify-content:center;font-size:96px;font-weight:800;color:#fff;box-shadow:0 20px 50px rgba(15,36,64,.35)">${s.number}</div>`
    : "";

  const iconBlock = s.icon && s.icon !== "logo"
    ? `<div style="position:absolute;right:70px;top:${s.number ? "600" : "560"}px;width:230px;height:230px;opacity:.9">${iconSVG(s.icon, NAVY)}</div>`
    : "";

  const logoBlock = isEnd ? `<div style="position:absolute;left:50%;top:300px;transform:translateX(-50%)">${logoSVG()}</div>` : "";
  const brandName = isEnd ? `<div style="position:absolute;left:50%;top:540px;transform:translateX(-50%);font-size:34px;font-weight:800;letter-spacing:.5px;color:#fff;white-space:nowrap">AI Virtual Content Office</div>` : "";

  const recapIcons = s.type === "recap" ? `
    <div style="position:absolute;left:0;right:0;top:960px;display:flex;justify-content:center;gap:56px">
      ${["checklist","sunrise","target"].map((n,i)=>`<div style="width:150px;height:150px;border-radius:28px;background:#fff;box-shadow:0 16px 40px rgba(15,36,64,.18);display:flex;align-items:center;justify-content:center">${iconSVG(n, i===1?RED:NAVY)}</div>`).join("")}
    </div>` : "";

  const ctas = isEnd ? `
    <div style="position:absolute;left:0;right:0;top:1040px;display:flex;gap:24px;justify-content:center">
      <div style="padding:26px 48px;border-radius:60px;background:${RED};color:#fff;font-size:40px;font-weight:800">Simpan</div>
      <div style="padding:26px 48px;border-radius:60px;background:#fff;color:${NAVY};font-size:40px;font-weight:800">Follow</div>
    </div>` : "";

  return `<!doctype html><html lang="id"><head><meta charset="utf-8">
<style>
  *{margin:0;padding:0;box-sizing:border-box}
  html,body{width:1080px;height:1920px;overflow:hidden;
    font-family:'DejaVu Sans','Inter',system-ui,-apple-system,'Segoe UI',sans-serif}
  .canvas{position:relative;width:1080px;height:1920px;${bg}}
  .progress{position:absolute;top:420px;left:0;height:8px;background:${RED};width:${(s.scene/6*100).toFixed(1)}%}
  .progress-track{position:absolute;top:420px;left:0;height:8px;width:100%;background:rgba(15,36,64,.10)}
  .counter{position:absolute;left:64px;top:452px;font-size:30px;font-weight:700;color:${isEnd?"rgba(255,255,255,.75)":MUTED};letter-spacing:1px}
  .kicker{position:absolute;left:64px;top:500px;font-size:34px;font-weight:800;letter-spacing:6px;color:${kickerColor}}
  .headline{position:absolute;left:64px;top:${s.number?820:(isEnd?770:660)}px;font-size:104px;line-height:1.05;font-weight:800;letter-spacing:-2px;color:${onScreenColor};white-space:pre-line;max-width:920px}
  .subtitle-wrap{position:absolute;left:0;right:0;top:1400px;display:flex;justify-content:center}
  .subtitle{max-width:920px;padding:22px 40px;border-radius:22px;background:${subBg};color:${subColor};font-size:62px;font-weight:800;line-height:1.18;text-align:center}
  .safe-note{position:absolute;bottom:40px;left:0;right:0;text-align:center;font-size:24px;color:${isEnd?"rgba(255,255,255,.4)":MUTED};letter-spacing:2px}
</style></head><body>
  <div class="canvas">
    <div class="progress-track"></div><div class="progress"></div>
    <div class="counter">${s.scene}/6</div>
    ${s.kicker ? `<div class="kicker">${s.kicker}</div>` : ""}
    <div class="headline">${s.onScreen}</div>
    ${numBadge}${iconBlock}${logoBlock}${brandName}${recapIcons}${ctas}
    <div class="subtitle-wrap"><div class="subtitle">${s.subtitle}</div></div>
    <div class="safe-note">PREVIEW · AI Virtual Content Office</div>
  </div>
</body></html>`;
}

// 1) write HTML + screenshot each scene
for (const s of scenes) {
  const htmlPath = resolve(FR, `scene${s.scene}.html`);
  writeFileSync(htmlPath, frameHTML(s));
  const pngPath = resolve(FR, `scene${s.scene}.png`);
  execFileSync("chromium", [
    "--headless=new", "--no-sandbox", "--disable-gpu", "--hide-scrollbars",
    "--force-device-scale-factor=1", "--window-size=1080,1920",
    `--screenshot=${pngPath}`, `file://${htmlPath}`,
  ], { stdio: "ignore", timeout: 120000 });
  console.log("rendered scene", s.scene);
}
console.log("frames done");
