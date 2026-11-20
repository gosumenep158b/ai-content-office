import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

const AGENTS = ['lightvela', 'muse', 'cue', 'dika_vm']

function roomOf(agent: string) {
  return `mobile:${agent}`
}

function kePesan(row: any) {
  const p = row?.payload ?? {}
  return {
    id: row.id,
    agent: p.agent ?? '',
    sender: row.sender,
    body: p.body ?? '',
    created_at: row.created_at,
  }
}

/** GET /api/m/chat?agent=lightvela&after=<iso> */
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const agent = String(searchParams.get('agent') ?? 'dika_vm').toLowerCase()
    if (!AGENTS.includes(agent)) return NextResponse.json({ error: 'agent tidak dikenal' }, { status: 400 })
    const after = searchParams.get('after')

    const db = supabaseAdmin()
    let q = db.from('agent_messages').select('*')
      .filter('payload->>kind', 'eq', 'mobile')
      .filter('payload->>room', 'eq', roomOf(agent))
      .order('created_at', { ascending: true })
      .limit(200)
    if (after) q = q.gt('created_at', after)

    const { data, error } = await q
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ data: (data ?? []).map(kePesan) })
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'error' }, { status: 500 })
  }
}

/** POST /api/m/chat  body: { agent, sender?: 'me'|'agent', body } */
export async function POST(req: Request) {
  try {
    const b = await req.json().catch(() => null)
    const agent = String(b?.agent ?? '').toLowerCase()
    if (!AGENTS.includes(agent)) return NextResponse.json({ error: 'agent tidak dikenal' }, { status: 400 })
    const teks = String(b?.body ?? '').trim()
    if (!teks) return NextResponse.json({ error: 'body wajib' }, { status: 400 })

    const sender = b?.sender === 'agent' ? agent : 'me'
    const db = supabaseAdmin()

    const { data, error } = await db.from('agent_messages').insert({
      task_id: null,
      sender,
      receiver: agent,
      payload: { kind: 'mobile', room: roomOf(agent), agent, body: teks.slice(0, 4000) },
    }).select().single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ data: kePesan(data) }, { status: 201 })
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'error' }, { status: 500 })
  }
}
