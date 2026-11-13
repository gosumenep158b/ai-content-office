export const DIVISI: Record<string, { nama: string; role: string; emoji: string; warna: string }> = {
  dika:  { nama: "Dika",  role: "Manager",             emoji: "🧭", warna: "#1D4ED8" },
  kinan: { nama: "Kinan", role: "Research",            emoji: "🔍", warna: "#0D9488" },
  dava:  { nama: "Dava",  role: "Content Strategist",  emoji: "✍️", warna: "#B45309" },
  yanti: { nama: "Yanti", role: "Content Designer",    emoji: "🎬", warna: "#7C3AED" },
  anton: { nama: "Anton", role: "IT/Publisher",        emoji: "🚀", warna: "#DC2626" },
};
export const STATUS_ID: Record<string, string> = {
  Backlog: "Antrean", Assigned: "Ditugaskan", "In Progress": "Dikerjakan",
  "Waiting Input": "Menunggu Input", "In Review": "Ditinjau", Revision: "Revisi",
  Completed: "Selesai", Blocked: "Terhambat", Cancelled: "Dibatalkan",
};
export function fmtWaktu(d: string | null) {
  if (!d) return "—";
  const diff = Date.now() - new Date(d).getTime();
  const m = Math.round(diff / 60000);
  if (m < 1) return "baru saja";
  if (m < 60) return `${m} mnt lalu`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h} jam lalu`;
  return new Date(d).toLocaleDateString("id-ID", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
}
