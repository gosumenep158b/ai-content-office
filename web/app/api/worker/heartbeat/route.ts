import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

const BOTS = ['davadevis_bot', 'dika_vm_bot', 'om_muse_bot', 'staf_ai_cue_bot']

/**
 * POST /api/worker/heartbeat
 * body: { bot, agents?: string[], status?: 'idle'|'working'|'error', note? }
 */
export async function POST(req: Request) {
  try {
    const b = await req.json().catch(() => null)
    if (!b?.bot) return NextResponse.json({ error: 'bot wajib' }, { status: 400 })
    if (!BOTS.includes(String(b.bot))) {
      return NextResponse.json({ error: `bot harus: ${BOTS.join(', ')}` }, { status: 400 })
    }

    const db = supabaseAdmin()
    const { data, error } = await db.from('audit_logs').insert({
      actor: String(b.bot),
      actor_type: 'agent',
      action: 'worker.heartbeat',
      entity: 'worker',
      entity_id: null,
      after: {
        agents: Array.isArray(b.agents) ? b.agents : [],
        status: b.status ?? 'idle',
        note: b.note ?? null,
      },
    }).select().single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ ok: true, at: data.created_at }, { status: 201 })
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'error' }, { status: 500 })
  }
}

/** GET /api/worker/heartbeat -> denyut terakhir per bot */
export async function GET() {
  try {
    const db = supabaseAdmin()
    const { data, error } = await db.from('audit_logs')
      .select('actor,after,created_at')
      .eq('action', 'worker.heartbeat')
      .order('created_at', { ascending: false })
      .limit(200)

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    const terakhir: Record<string, any> = {}
    for (const row of data ?? []) {
      if (!terakhir[row.actor]) terakhir[row.actor] = row
    }

    const sekarang = Date.now()
    const hasil = BOTS.map((bot) => {
      const row = terakhir[bot]
      if (!row) return { bot, status: 'tidak pernah lapor', terakhir: null, umur_menit: null }
      const umur = Math.round((sekarang - new Date(row.created_at).getTime()) / 60000)
      return {
        bot,
        status: umur <= 15 ? 'hidup' : 'mangkir',
        terakhir: row.created_at,
        umur_menit: umur,
        detail: row.after,
      }
    })

    return NextResponse.json({ data: hasil })
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'error' }, { status: 500 })
  }
}