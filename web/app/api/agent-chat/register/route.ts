import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

/**
 * POST /api/agent-chat/register
 * body: { agentId, capabilities?: string[] }
 * Mendaftarkan agent ke registry (status idle).
 */
export async function POST(req: Request) {
  try {
    const b = await req.json().catch(() => null)
    const agentId = String(b?.agentId ?? '').trim().toLowerCase()
    if (!agentId) return NextResponse.json({ error: 'agentId wajib' }, { status: 400 })

    const caps = Array.isArray(b?.capabilities) ? b.capabilities.slice(0, 30) : []

    const db = supabaseAdmin()
    const { data, error } = await db.from('agent_registry').upsert({
      agent_id: agentId,
      capabilities: caps,
      status: 'idle',
      progress: 0,
      message: null,
      last_seen_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }, { onConflict: 'agent_id' }).select().single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ data }, { status: 201 })
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'error' }, { status: 500 })
  }
}

/** GET /api/agent-chat/register?agentId=x — ambil data satu agent */
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const agentId = searchParams.get('agentId')?.toLowerCase()
    const db = supabaseAdmin()
    if (agentId) {
      const { data, error } = await db.from('agent_registry').select('*').eq('agent_id', agentId).single()
      if (error) return NextResponse.json({ error: error.message }, { status: 404 })
      return NextResponse.json({ data })
    }
    const { data, error } = await db.from('agent_registry').select('*').order('last_seen_at', { ascending: false })
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ data: data ?? [] })
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'error' }, { status: 500 })
  }
}
