import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

const MF = 'https://make.fun'
const SLUG = process.env.MAKEFUN_SLUG || 'github-core-clone-01'

async function getJson(url: string) {
  try {
    const r = await fetch(url, { headers: { 'User-Agent': 'aico-dashboard/1.0' }, next: { revalidate: 30 } as any })
    if (!r.ok) return null
    return await r.json()
  } catch {
    return null
  }
}

type P = { key: string; label: string; status: string; pct: number; note: string | null; created_at: string }

export async function GET() {
  try {
    const db = supabaseAdmin()

    const comp = await getJson(`${MF}/api/competitions/${SLUG}`)
    const board = await getJson(`${MF}/api/competitions/${SLUG}/leaderboard`)

    let agents: any[] = []
    try {
      const r = await db.from('agent_registry').select('*').order('last_seen_at', { ascending: false })
      agents = r.data ?? []
    } catch { /* tabel belum ada */ }

    const [{ data: msgs }] = await Promise.all([
      db.from('agent_messages').select('*').filter('payload->>kind', 'eq', 'makefun')
        .order('created_at', { ascending: true }).limit(500),
    ])

    // progress: ambil versi terakhir per key
    const byKey: Record<string, P> = {}
    const activity: any[] = []
    for (const m of msgs ?? []) {
      const p = m.payload ?? {}
      if (p.type === 'progress' && p.key) {
        byKey[p.key] = {
          key: p.key,
          label: p.label ?? p.key,
          status: p.status ?? 'todo',
          pct: Number(p.pct ?? 0),
          note: p.note ?? null,
          created_at: m.created_at,
        }
      } else if (p.type === 'activity') {
        activity.push({
          id: m.id,
          agent: p.agent ?? m.sender ?? '-',
          kind: p.kind ?? 'log',
          detail: p.detail ?? '',
          created_at: m.created_at,
        })
      }
    }

    const order = ['login', 'kit', 'git-http', 'rest', 'graphql', 'mcp', 'perf', 'practice', 'submit']
    const progress = Object.values(byKey).sort(
      (a, b) => (order.indexOf(a.key) + 1 || 99) - (order.indexOf(b.key) + 1 || 99)
    )

    const rows: any[] = Array.isArray(board)
      ? board
      : (board as any)?.entries ?? (board as any)?.leaderboard ?? (board as any)?.items ?? []

    return NextResponse.json({
      data: {
        competition: comp,
        leaderboard: rows.slice(0, 15),
        progress,
        activity: activity.reverse().slice(0, 30),
        agents: agents ?? [],
        fetched_at: new Date().toISOString(),
      },
    })
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'error' }, { status: 500 })
  }
}
