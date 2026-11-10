import { useState, useEffect } from "react";

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
    <div className="p-8 max-w-3xl mx-auto bg-background font-sans antialiased">
      {/* Header with search */}
      <header className="mb-8 border-b pb-4">
        <h1 className="text-3xl font-bold tracking-tight mb-2 text-foreground">
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
                  <div
                    key={item.id}
                    className="rounded-lg border border-border bg-card p-4 transition-colors hover:bg-card/50"
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <h3 className="font-medium line-clamp-2 text-foreground">
                          {item.platform}: {item.topic}
                        </h3>
                        <p className="text-sm text-muted-foreground line-clamp-1">
                          {item.notes || "-"}
                        </p>
                      </div>
                      <span
                        className="badge inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium"
                        style={{
                          background: `hsla(var(--accent), 0.2)`,
                          color: "var(--accent)",
                        }}
                      >
                        {item.verification_status}
                      </span>
                    </div>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <span className="text-xs mr-2" style={{ color: "var(--muted-foreground)" }}>
                        {item.metric_source && `Sumber: ${item.metric_source}`}
                      </span>
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
                    </div>
                  </div>
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

/* Input, Button, Select styled with Tailwind v4 arbitrary values */
/* Using bg-[color] syntax supported in Tailwind v4 */

<input
  type="text"
  placeholder="Cari topik/hashtag..."
  value={searchQuery}
  onChange={(e) => setSearchQuery(e.target.value)}
  className="input bg-white border-border text-foreground rounded-md px-3 py-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 w-full"
/>

<select
  value={selectedPlatform}
  onChange={(e) => setSelectedPlatform(e.target.value)}
  className="select bg-white border-border rounded-md px-3 py-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 fw-medium w-full"
>
  <option value="all">Semua Platform</option>
  <option value="Instagram">Instagram</option>
  <option value="TikTok">TikTok</option>
  <option value="Threads">Threads</option>
</select>

<button
  onClick={handleNewResearch}
  className="btn-primary bg-accent text-primary-foreground py-2.5 px-4 rounded-md font-medium transition-colors hover:bg-accent/90"
>
  Mulai Riset Baru
</button>