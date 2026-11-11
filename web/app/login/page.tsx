"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
// eslint-disable-next-line @next/next/no-img-element

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Login gagal");
      router.push("/dashboard");
      router.refresh();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Terjadi kesalahan";
      setError(msg === "Invalid login credentials" ? "Email atau kata sandi salah. Coba lagi." : msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-wrap">
      <div className="auth-card">
        <div className="auth-logo">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo-mark.svg" alt="Logo" style={{ width: 40, height: 40 }} />
          <div>
            <div style={{ fontWeight: 800, letterSpacing: "-0.01em", color: "var(--navy-800)" }}>AI Virtual Content Office</div>
            <div style={{ fontSize: 12, color: "var(--muted)" }}>Ruang kerja produksi konten multi-agen</div>
          </div>
        </div>

        <h1 className="h-page" style={{ marginBottom: 4 }}>Masuk</h1>
        <p className="text-muted" style={{ marginBottom: 22, fontSize: 14 }}>
          Kelola tim agen, tugas, dan produksi konten dari satu dasbor.
        </p>

        {error && (
          <div role="alert" style={{
            background: "#FDE8E8", border: "1px solid #F5B5B5", color: "#B91C1C",
            borderRadius: 10, padding: "10px 14px", fontSize: 14, marginBottom: 16,
          }}>
            {error}
          </div>
        )}

        <form onSubmit={handleLogin}>
          <label className="field-label" htmlFor="email">Email</label>
          <input
            id="email"
            type="email"
            className="input"
            placeholder="nama@perusahaan.id"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            style={{ marginBottom: 14 }}
          />
          <label className="field-label" htmlFor="password">Kata sandi</label>
          <input
            id="password"
            type="password"
            className="input"
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            style={{ marginBottom: 18 }}
          />
          <button type="submit" disabled={loading} className="btn btn-primary" style={{ width: "100%", padding: "12px 18px", fontSize: ".95rem" }}>
            {loading ? "Memproses…" : "Masuk ke Dasbor"}
          </button>
        </form>

        <p style={{ marginTop: 18, fontSize: 13.5, color: "var(--muted)" }}>
          Belum punya akun?{" "}
          <a href="/" style={{ color: "var(--red-600)", fontWeight: 600, textDecoration: "none" }}>
            Hubungi pemilik workspace
          </a>
        </p>
      </div>
    </div>
  );
}
