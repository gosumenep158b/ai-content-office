import { Suspense } from "react"
import Sidebar from "@/components/office/Sidebar"

export const metadata = { title: "Main Office — AI Virtual Content Office" }

export default function OfficeLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen bg-slate-50">
      <Suspense fallback={<aside className="hidden h-screen w-72 shrink-0 border-r border-slate-200 bg-white lg:block" />}>
        <Sidebar />
      </Suspense>
      <main className="min-w-0 flex-1">
        <Suspense fallback={<div className="p-8 text-sm text-slate-500">Memuat…</div>}>
          {children}
        </Suspense>
      </main>
    </div>
  )
}