import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

const ROOM_GRUP = 'kantor'
const BOTS = ['davadevis_bot', 'dika_vm_bot', 'om_muse_bot']

function roomDM(a: string, b: string) {
  return `dm:${[a, b].sort().join(':')}`
}

/** GET /api/chat?room=kantor&after=<iso>&limit=100 */
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const room = searchParams.get('room') || ROOM_GRUP
    const after = searchParams.get('after')
    const limit = Math.min(parseInt(searchParams.get('limit') || '100'), 200)

    const db = supabaseAdmin()
    let q = db.from('chat_messages').select('*').eq('room', room)
      .order('created_at', { ascending: true }).limit(limit)
    if (after) q = q.gt('created_at', after)

    const { data, error } = await q
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ data: data ?? [] })
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'error' }, { status: 500 })
  }
}

/** POST /api/chat  body: { room?, sender, body, to? } */
export async function POST(req: Request) {
  try {
    const b = await req.json().catch(() => null)
    if (!b?.sender || !b?.body?.trim()) {
      return NextResponse.json({ error: 'sender & body wajib' }, { status: 400 })
    }
    const sender = String(b.sender)
    if (!BOTS.includes(sender)) {
      return NextResponse.json({ error: `sender harus salah satu: ${BOTS.join(', ')}` }, { status: 400 })
    }

    let room = b.room ? String(b.room) : ROOM_GRUP
    if (!b.room && b.to) {
      if (!BOTS.includes(b.to)) return NextResponse.json({ error: 'to tidak dikenal' }, { status: 400 })
      room = roomDM(sender, b.to)
    }

    const teks = String(b.body).trim().slice(0, 4000)
    const db = supabaseAdmin()

    const { data, error } = await db.from('chat_messages')
      .insert({ room, sender, body: teks })
      .select().single()
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    return NextResponse.json({ data }, { status: 201 })
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'error' }, { status: 500 })
  }
}
