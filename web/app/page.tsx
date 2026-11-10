"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

export default function Home() {
  const router = useRouter();

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) router.push("/dashboard");
    });
  }, [router]);

  return (
    <main className="min-h-screen bg-[#0F2440] text-white">
      {/* Topbar */}
      <header className="flex items-center justify-between px-6 py-5 max-w-6xl mx-auto">
        <div className="flex items-center gap-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo-mark.svg" alt="logo" className="h-9 w-9" />
          <span className="font-bold tracking-tight">AI Virtual Content Office</span>
        </div>
        <a href="/login" className="rounded-lg bg-[#DC2626] hover:bg-red-700 transition px-5 py-2.5 text-sm font-semibold">
          Masuk
        </a>
      </header>

      {/* Hero */}
      <section className="max-w-6xl mx-auto px-6 pt-14 pb-20 text-center">
        <span className="inline-block rounded-full border border-white/20 bg-white/5 px-4 py-1 text-xs font-medium tracking-wide text-white/80">
          Kantor konten virtual berbasis 5 AI agent
        </span>
        <h1 className="mx-auto mt-6 max-w-3xl text-4xl md:text-6xl font-extrabold leading-tight tracking-tight">
          Produksi konten harian, <span className="text-[#DC2626]">dikerjakan tim AI</span>, dikendalikan Anda.
        </h1>
        <p className="mx-auto mt-6 max-w-2xl text-base md:text-lg text-white/70">
          Riset tren &rarr; ide &rarr; naskah &rarr; video faceless &rarr; review &rarr; publikasi TikTok
          &mdash; semuanya terlacak dalam satu ruang kerja dengan review harian pukul 14.00 WIB.
        </p>
        <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
          <a href="/login" className="w-full sm:w-auto rounded-xl bg-[#DC2626] hover:bg-red-700 transition px-8 py-4 text-base font-bold shadow-lg shadow-red-900/40">
            Masuk ke Dashboard
          </a>
          <a href="#agents" className="w-full sm:w-auto rounded-xl border border-white/20 hover:bg-white/5 transition px-8 py-4 text-base font-semibold text-white/90">
            Lihat Tim Agent
          </a>
        </div>
      </section>

      {/* Agents */}
      <section id="agents" className="max-w-6xl mx-auto px-6 pb-20">
        <h2 className="text-center text-2xl md:text-3xl font-bold mb-10">Lima Agent, Satu Alur Kerja</h2>
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-5">
          {[
            { n: "Dika", r: "Manager", d: "Orchestrator & pengambil keputusan review 14.00 WIB" },
            { n: "Kinan", r: "Research", d: "Riset tren 24 jam dari IG, TikTok & Threads" },
            { n: "Dava", r: "Strategist", d: "Brief, hook, naskah & storyboard" },
            { n: "Yanti", r: "Designer", d: "Video faceless: AI video, stock, motion, voice-over" },
            { n: "Anton", r: "Publisher", d: "Paket unggah manual & snapshot analytics 24 jam" },
          ].map((a) => (
            <div key={a.n} className="rounded-2xl border border-white/10 bg-white/5 p-5 hover:bg-white/10 transition">
              <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-[#DC2626] text-sm font-black">
                {a.n[0]}
              </div>
              <h3 className="font-bold">{a.n}</h3>
              <p className="text-xs uppercase tracking-wide text-[#F87171] mb-2">{a.r}</p>
              <p className="text-sm text-white/60">{a.d}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Flow */}
      <section className="max-w-6xl mx-auto px-6 pb-24">
        <div className="rounded-3xl border border-white/10 bg-white/5 p-8 md:p-12">
          <h2 className="text-center text-2xl md:text-3xl font-bold mb-8">Alur Kerja Harian</h2>
          <div className="flex flex-col md:flex-row items-center justify-center gap-4 text-sm font-medium">
            {["Riset 24 jam", "Seleksi ide", "Naskah & storyboard", "Produksi video", "Review 14.00", "Publish manual", "Analytics 24 jam"].map((s, i, arr) => (
              <div key={s} className="flex items-center gap-4">
                <span className="rounded-full bg-[#DC2626] px-4 py-2">{s}</span>
                {i < arr.length - 1 && <span className="hidden md:inline text-white/30">&rarr;</span>}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/10 py-8 text-center text-sm text-white/50">
        AI Virtual Content Office &mdash; mode hybrid, publikasi manual oleh Owner
      </footer>
    </main>
  );
}
