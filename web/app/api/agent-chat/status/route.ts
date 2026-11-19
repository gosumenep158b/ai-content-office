import { NextResponse } from 'next/server'
import { setAgentStatus } from '@/lib/agent-chat'

/** POST /api/agent-chat/status — update status agent (idle/busy/waiting/error/offline) */
export async function POST(req: Request) {
  try {
    const b = await req.json().catch(() => null)
    const agentId = String(b?.agentId ?? '').trim().toLowerCase()
    const status = String(b?.status ?? '').trim().toLowerCase()
    if (!agentId) return NextResponse.json({ error: 'agentId wajib' }, { status: 400 })
    if (!['idle', 'busy', 'waiting', 'error', 'offline'].includes(status)) {
      return NextResponse.json({ error: 'status tidak valid' }, { status: 400 })
    }
    const r = await setAgentStatus(agentId, status, b?.message ?? null,
      b?.progress !== undefined ? Number(b.progress) : null)
    if (r.error) return NextResponse.json({ error: r.error.message }, { status: 500 })
    return NextResponse.json({ data: r.data })
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'error' }, { status: 500 })
  }
}
