"use client"
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";

interface Platform {
  name: string;
  url: string;
}

interface ResearchItem {
  id: string;
  platform: string;
  topic: string;
  source_url: string;
  captured_at: string;
  published_at: string | null;
  metric_values: {
    views?: number;
    likes?: number;
    comments?: number;
    shares?: number;
    saves?: number;
  };
  metric_source: string;
  verification_status: "Verified" | "Estimated" | "Unverified" | "Unavailable";
  notes: string;
}

export default function ResearchCenterPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedPlatform, setSelectedPlatform] = useState("all");
  const [isGenerating, setIsGenerating] = useState(false);
  const [results, setResults] = useState<ResearchItem[]>([]);
  const [platforms, setPlatforms] = useState<Platform[]>([]);

  const defaultPlatforms: Platform[] = [
    { name: "Instagram", url: "https://www.instagram.com" },
    { name: "TikTok", url: "https://www.tiktok.com" },
    { name: "Threads", url: "https://www.threads.net" },
  ];

  useEffect(() => {
    setPlatforms(defaultPlatforms);
  }, []);

  const fetchResearchResults = async () => {
    try {
      setIsGenerating(true);
      const res = await fetch("/api/research/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          query: searchQuery || "",
          platforms: selectedPlatform !== "all" ? [selectedPlatform] : ["Instagram", "TikTok", "Threads"],
        }),
      });
      if (!res.ok) throw new Error("Gagal fetch research");
      const data = await res.json();
      setResults(data.data || []);
    } catch (err) {
      console.error("Failed to fetch research:", err);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleNewResearch = async () => {
    setIsGenerating(true);
    try {
      const res = await fetch("/api/research/trigger", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          query: searchQuery || "tren konten video pendek",
          platforms: platforms.map((p) => p.name),
        }),
      });
      if (res.ok) {
        const data = await res.json();
        setResults(data.data || []);
      }
    } catch (err) {
      console.error("Failed to trigger research:", err);
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="p-8 max-w-3xl mx-auto">
      {/* Header with search */}
      <header className="mb-8 border-b pb-4">
        <h1 className="text-3xl font-bold tracking-tight mb-2">
          Research Center
        </h1>
        <p className="text-base text-muted-foreground">
          Kinan akan melakukan riset tren dari Instagram, TikTok, dan Threads selama
          24 jam terakhir.
        </p>
      </header>

      {/* Search & Platform Filter */}
      <div className="mb-6">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          <Input
            placeholder="Cari topik/hashtag..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="input"
          />
          <select
            value={selectedPlatform}
            onChange={(e) => setSelectedPlatform(e.target.value)}
            className="select"
          >
            <option value="all">Semua Platform</option>
            <option value="Instagram">Instagram</option>
            <option value="TikTok">TikTok</option>
            <option value="Threads">Threads</option>
          </select>
        </div>
        <Button
          onClick={handleNewResearch}
          className="btn-primary w-full md:w-auto py-2.5 px-4"
        >
          Mulai Riset Baru
        </Button>
      </div>

      {/* Results Section */}
      {results.length > 0 || isGenerating ? (
        <Card>
          <CardHeader>
            <CardTitle>Hasil Riset Terbaru</CardTitle>
          </CardHeader>
          <CardContent>

            {isGenerating ? (
              <p className="text-muted-foreground text-sm">
                Sedang mengumpulkan tren dari platform terpilih...
              </p>
            ) : results.length === 0 ? (
              <p className="text-muted-foreground text-center py-8">
                Belum ada hasil riset. Masukkan topik pencarian di atas dan klik
                "Mulai Riset Baru" untuk menampilkan tren terbaru.
              </p>
            ) : (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {results.map((item) => (
                  <Card
                    key={item.id}
                    className="h-full flex flex-col"
                  >
                    <CardHeader>
                      <CardTitle className="text-sm">
                        {item.platform}: {item.topic}
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="flex-1">
                      <p className="text-sm text-muted-foreground line-clamp-3">
                        {item.notes || "Tidak ada catatan"}
                      </p>
                      <div className="mt-3 flex flex-wrap gap-2">
                        <span className="px-2 py-1 rounded bg-accent text-accent">
                          {item.verification_status}
                        </span>
                        {item.metric_source && (
                          <span className="text-xs text-muted-foreground">
                            {item.metric_source}
                          </span>
                        )}
                      </div>
                      {item.source_url && (
                        <a
                          href={item.source_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="mt-2 text-accent underline text-sm"
                        >
                          Buka Sumber
                        </a>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}

          </CardContent>
        </Card>
      ) : (
        <p className="text-muted-foreground text-center py-8">
          Masukkan topik pencarian di atas dan klik "Mulai Riset Baru" untuk menampilkan tren terbaru.
        </p>
      )}
    </div>
  );
}