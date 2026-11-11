"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { useRouter } from "next/navigation";

const STATUS = [
  "Backlog",
  "Assigned",
  "In Progress",
  "Waiting Input",
  "In Review",
  "Revision",
  "Completed",
  "Blocked",
  "Cancelled",
] as const;

const PRIORITY_COLORS = {
  low: "bg-green-100 text-green-800",
  medium: "bg-blue-100 text-blue-800",
  high: "bg-amber-100 text-amber-800",
  urgent: "bg-red-100 text-red-800",
};

const STATUS_COLORS: Record<typeof STATUS[number], string> = {
  Backlog: "bg-gray-100 text-gray-600",
  Assigned: "bg-blue-100 text-blue-700",
  "In Progress": "bg-amber-100 text-amber-800",
  "Waiting Input": "bg-yellow-100 text-yellow-800",
  "In Review": "bg-green-100 text-green-800",
  Revision: "bg-purple-100 text-purple-800",
  Completed: "bg-gray-50 text-gray-700",
  Blocked: "bg-red-100 text-red-800",
  Cancelled: "bg-gray-200 text-gray-600",
};

type Task = {
  id: string;
  title: string;
  description: string | null;
  assignee: string | null;
  priority: "low" | "medium" | "high" | "urgent";
  status: typeof STATUS[number];
  deadline: string;
  created_at: string;
};

interface FormState {
  title: string;
  description: string;
  assignee: string;
  priority: "low" | "medium" | "high" | "urgent";
  deadline: string;
  status: typeof STATUS[number];
}

export default function DashboardPage() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const router = useRouter();

  useEffect(() => {
    fetchTasks();
  }, []);

  const fetchTasks = async () => {
    try {
      const res = await fetch("/api/tasks", {
        credentials: "include",
      });
      if (!res.ok) return;
      const json = await res.json();
      if (Array.isArray(json?.data)) setTasks(json.data);
    } catch (err) {
      console.error("Failed to fetch tasks:", err);
    }
  };

  const [form, setForm] = useState<FormState>({
    title: "",
    description: "",
    assignee: "dika",
    priority: "medium" as const,
    deadline: "",
    status: "Backlog" as const,
  });

  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title.trim()) return;
    try {
      const res = await fetch("/api/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, assigned_agent_id: form.assignee, due_at: form.deadline || null }),
        credentials: "include",
      });
      if (res.ok) {
        const json = await res.json();
        if (json?.data) setTasks([...tasks, json.data]);
        setForm({
          title: "",
          description: "",
          assignee: "dika",
          priority: "medium" as const,
          deadline: "",
          status: "Backlog" as const,
        });
      }
    } catch (err) {
      console.error("Failed to create task:", err);
    }
  };

  const filteredTasks = tasks.filter((task) =>
    task.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (task.description &&
      task.description.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <div className="p-8 max-w-3xl mx-auto bg-background font-sans antialiased">
      {/* Header */}
      <header className="mb-8 border-b pb-4">
        <h1 className="text-3xl font-bold tracking-tight mb-2 text-foreground">
          Dashboard
        </h1>
        <p className="text-base text-muted-foreground">
          Selamat datang kembali.
        </p>
      </header>

      {/* Create Task Form */}
      <form onSubmit={handleCreateTask} className="mb-6 rounded-lg border border-border p-4 bg-card">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
          <input
            type="text"
            value={form.title}
            onChange={(e) =>
              setForm({ ...form, title: e.target.value })
            }
            placeholder="Judul tugas"
            className="input"
          />
          <input
            type="text"
            value={form.description}
            onChange={(e) =>
              setForm({ ...form, description: e.target.value })
            }
            placeholder="Deskripsi tugas"
            className="input"
          />
          <select
            value={form.assignee}
            onChange={(e) =>
              setForm({ ...form, assignee: e.target.value })
            }
            className="input"
          >
            <option value="dika">Dika (Manager)</option>
            <option value="kinan">Kinan (Research)</option>
            <option value="dava">Dava (Content Strategist)</option>
            <option value="yanti">Yanti (Video Producer)</option>
            <option value="anton">Anton (Publisher)</option>
          </select>
          <select
            value={form.priority}
            onChange={(e) =>
              setForm({ ...form, priority: e.target.value as "low" | "medium" | "high" | "urgent" })
            }
            className="input"
          >
            <option value="low">Rendah</option>
            <option value="medium">Sedang</option>
            <option value="high">Tinggi</option>
            <option value="urgent">Darurat</option>
          </select>
          <input
            type="date"
            value={form.deadline}
            onChange={(e) =>
              setForm({ ...form, deadline: e.target.value })
            }
            className="input"
          />
        </div>
        <button
          type="submit"
          className="mt-4 w-full rounded-lg bg-primary px-4 py-2.5 text-white font-semibold transition-colors hover:bg-primary/90"
        >
          Buat Tugas
        </button>
      </form>

      {/* Task List */}
      <Card>
        <CardHeader className="justify-between">
          <span>Daftar Tugas</span>
          <span className="text-sm text-muted-foreground">
            {tasks.length} tugas
          </span>
        </CardHeader>
        <CardContent>
          {filteredTasks.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">
              Tugas tidak ditemukan. Masukkan tugas baru atau ubah kata kunci pencarian.
            </p>
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {filteredTasks.map((task) => (
                <div
                  key={task.id}
                  className="rounded-lg border border-border bg-card p-4 transition-colors hover:bg-card/50"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="font-medium line-clamp-2 text-foreground">
                        {task.title}
                      </h3>
                      <p className="text-sm text-muted-foreground line-clamp-1">
                        {task.description || "-"}
                      </p>
                    </div>
                    <span
                      className="badge inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium"
                      style={{
                        background: `hsla(${STATUS_COLORS[task.status]?.split(" ")[0] || 220}, 10%, 85%, 0.2)`,
                        color: STATUS_COLORS[task.status] || "var(--muted-foreground)",
                      }}
                    >
                      {task.status}
                    </span>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <span className="text-xs mr-2" style={{ color: "var(--muted-foreground)" }}>
                      Assignee: {task.assignee || "-"}
                    </span>
                    <span className="text-xs mr-2" style={{ color: "var(--muted-foreground)" }}>
                      Priority:
                      <span className={PRIORITY_COLORS[task.priority]}>
                        {task.priority}
                      </span>
                    </span>
                    <span className="text-xs" style={{ color: "var(--muted-foreground)" }}>
                      Deadline: {task.deadline ? new Date(task.deadline).toLocaleDateString() : "-"}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Search */}
          <div className="mt-6">
            <input
              type="text"
              placeholder="Cari tugas berdasarkan judul..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="input w-full"
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}