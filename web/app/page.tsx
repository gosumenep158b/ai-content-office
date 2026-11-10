"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

export default function Home() {
  const router = useRouter();

  // Check auth state on mount
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        router.push("/dashboard");
      }
    });
  }, [router]);

  return (
    <main className="min-h-screen flex items-center justify-center bg-background p-8">
      <div className="w-full max-w-md bg-card border border-border rounded-lg p-8 shadow-xl">
        <h2 className="text-2xl font-bold tracking-tight mb-6 text-foreground">AI Virtual Content Office</h2>

        <div className="space-y-4">
          <p className="text-base text-muted-foreground">
            Platform produksi konten multi-agent.
          </p>

          {/* Fitur utama ringkasan */}
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
            <div>
              <h3 className="font-medium text-caption text-muted-foreground mb-2">Sprint 1</h3>
              <p className="text-sm text-muted-foreground">
                ✅ Repository GitHub live, Next.js build OK, Supabase 22 tabel, Seed 5 agent
              </p>
            </div>
            <div>
              <h3 className="font-medium text-caption text-muted-foreground mb-2">Sprint 2</h3>
              <p className="text-sm text-muted-foreground">
                ⚠️ Owner Dashboard — login diaktifkan setelah push
              </p>
            </div>
            <div>
              <h3 className="font-medium text-caption text-muted-foreground mb-2">Sprint 3</h3>
              <p className="text-sm text-muted-foreground">
                ⚠️ Task Management — UI sedang dikerjakan
              </p>
            </div>
            <div>
              <h3 className="font-medium text-caption text-muted-foreground mb-2">Aset</h3>
              <p className="text-sm text-muted-foreground">
                ⏳ Menunggu @om_muse_bot
              </p>
            </div>
          </div>

          {/* CTA buttons */}
          <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-2">
            <Button
              className="rounded-lg border border-primary px-4 py-2.5 text-primary font-medium transition-colors hover:bg-primary/90"
            >
              <a href="/dashboard">Masuk ke Dashboard</a>
            </Button>
            <Button
              className="rounded-lg border border-border px-4 py-2.5 text-foreground font-medium transition-colors hover:bg-background"
            >
              <a href="/login">Login</a>
            </Button>
          </div>
        </div>
      </div>
    </main>
  );
}