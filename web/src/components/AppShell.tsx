"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";

const DIVISI = [
  { key: "dika", label: "Manajemen", short: "Manaj", emoji: "🧭", role: "Manager" },
  { key: "kinan", label: "Riset", short: "Riset", emoji: "🔍", role: "Research" },
  { key: "dava", label: "Strategi Konten", short: "Strategi", emoji: "✍️", role: "Content Strategist" },
  { key: "yanti", label: "Produksi Video", short: "Video", emoji: "🎬", role: "Content Designer" },
  { key: "anton", label: "Publikasi & IT", short: "Publikasi", emoji: "🚀", role: "IT/Publisher" },
];

export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  useEffect(() => { setOpen(false); }, [pathname]);

  return (
    <div className="shell">
      {open && <div className="shell-overlay" onClick={() => setOpen(false)} />}
      <aside className={`shell-sidebar${open ? " open" : ""}`}>
        <div className="shell-brand">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo-mark.svg" alt="" style={{ width: 28, height: 28 }} />
          <div>
            <div style={{ fontWeight: 800, fontSize: 15, letterSpacing: "-0.01em" }}>AICO</div>
            <div style={{ fontSize: 10.5, color: "rgba(255,255,255,.55)" }}>Virtual Content Office</div>
          </div>
        </div>
        <nav className="shell-nav">
          <a href="/dashboard" className={pathname === "/dashboard" ? "active" : ""}>
            <span className="nav-ico">🏠</span> Dashboard
          </a>
          <a href="/office" className={pathname === "/office" ? "active" : ""}>
            <span className="nav-ico">🏢</span> Main Office
          </a>
          <span className="shell-nav-label">Divisi</span>
          {DIVISI.map((d) => (
            <a key={d.key} href={`/divisi/${d.key}`} className={pathname === `/divisi/${d.key}` ? "active" : ""}>
              <span className="nav-ico">{d.emoji}</span> {d.label}
            </a>
          ))}
          <span className="shell-nav-label">Lainnya</span>
          <a href="/tasks" className={pathname === "/tasks" ? "active" : ""}>
            <span className="nav-ico">📋</span> Semua Tugas
          </a>
          <a href="/research" className={pathname === "/research" ? "active" : ""}>
            <span className="nav-ico">📚</span> Research Center
          </a>
          <a href="/studio" className={pathname === "/studio" ? "active" : ""}>
            <span className="nav-ico">🎞️</span> Content Studio
          </a>
        </nav>
      </aside>
      <div className="shell-content">
        <div className="shell-topbar">
          <button className="shell-hamburger" aria-label="Buka menu" onClick={() => setOpen(true)}>☰</button>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo-mark.svg" alt="" style={{ width: 26, height: 26 }} />
          <strong style={{ color: "var(--navy-800)", fontSize: 15 }}>AICO</strong>
        </div>
        {children}
      </div>
    </div>
  );
}
