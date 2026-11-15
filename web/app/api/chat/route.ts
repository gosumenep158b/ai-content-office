import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { bangunBalasan } from '@/lib/chat-reply'

/**
 * Chat antar worker — memakai tabel `agent_messages` yang sudah ada
 * (payload.kind = 'chat'), jadi tidak perlu tabel baru.
 *
 * Room:
 *   'kantor'                          -> grup semua worker
 *   'dm:<botA>:<botB>' (urut alfabet) -> percakapan 1:1
 */

const GRUP = 'kantor'
const BOTS = ['davadevis_bot', 'dika_vm_bot', 'om_muse_bot']
const PENGIRIM_BOLEH = [...BOTS, 'owner']

function roomDM(a: string, b: string) {
  return `dm:${[a, b].sort().join(':')}`
}

function kePesan(row: any) {
  const p = row?.payload ?? {}
  return {
    id: row.id,
    room: p.room ?? GRUP,
    sender: row.sender,
    body: p.body ?? '',
    created_at: row.created_at,
  }
}

/** GET /api/chat?room=kantor&after=<iso>&limit=200 */
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const room = searchParams.get('room') || GRUP
    const after = searchParams.get('after')
    const limit = Math.min(parseInt(searchParams.get('limit') || '200'), 300)

    const db = supabaseAdmin()
    let q = db.from('agent_messages')
      .select('*')
      .filter('payload->>kind', 'eq', 'chat')
      .filter('payload->>room', 'eq', room)
      .order('created_at', { ascending: true })
      .limit(limit)

    if (after) q = q.gt('created_at', after)

    const { data, error } = await q
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ data: (data ?? []).map(kePesan) })
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'error' }, { status: 500 })
  }
}

/** POST /api/chat  body: { room?, sender, body, to? } */
export async function POST(req: Request) {
  try {
    const b = await req.json().catch(() => null)
    if (!b?.sender || !String(b?.body ?? '').trim()) {
      return NextResponse.json({ error: 'sender & body wajib' }, { status: 400 })
    }
    const sender = String(b.sender)
    if (!PENGIRIM_BOLEH.includes(sender)) {
      return NextResponse.json({ error: `sender harus salah satu: ${PENGIRIM_BOLEH.join(', ')}` }, { status: 400 })
    }

    let room = b.room ? String(b.room) : GRUP
    if (!b.room && b.to) {
      if (!BOTS.includes(String(b.to))) return NextResponse.json({ error: 'to tidak dikenal' }, { status: 400 })
      room = roomDM(sender, String(b.to))
    }

    const teks = String(b.body).trim().slice(0, 4000)
    const db = supabaseAdmin()

    const { data, error } = await db.from('agent_messages')
      .insert({
        task_id: null,
        sender,
        receiver: room === GRUP ? 'all' : 'dm',
        payload: { kind: 'chat', room, body: teks },
      })
      .select()
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    // ==== balasan otomatis dari worker lain ====
    let balasan = null
    if (!b.no_auto) {
      try {
        const r = await bangunBalasan({ room, sender, body: teks })
        if (r && r.bot !== sender) {
          const ins = await db.from('agent_messages')
            .insert({
              task_id: null,
              sender: r.bot,
              receiver: room === GRUP ? 'all' : 'dm',
              payload: { kind: 'chat', room, body: r.teks, auto: true },
            })
            .select()
            .single()
          if (ins.data) balasan = kePesan(ins.data)
        }
      } catch {
        /* balasan gagal tidak boleh menggagalkan pengiriman pesan */
      }
    }

    return NextResponse.json({ data: kePesan(data), balasan }, { status: 201 })
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'error' }, { status: 500 })
  }
}
