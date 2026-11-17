import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

const MAX_ATTEMPTS = 3
const SPEC_DEFAULT = {
  ratio: '9:16', resolution: '1080x1920', container: 'mp4',
  vcodec: 'h264', acodec: 'aac', fps: 30, subtitle: 'embedded',
}

/** Update toleran: buang kolom yang tidak ada di skema live lalu ulangi. */
async function updateTolerant(
  db: any, id: string, patch: Record<string, unknown>, expectStatus?: string,
) {
  const p: Record<string, unknown> = { ...patch }
  for (let i = 0; i < 6; i++) {
    let q = db.from('render_jobs').update({ ...p, updated_at: new Date().toISOString() }).eq('id', id)
    if (expectStatus) q = q.eq('status', expectStatus)
    const r = await q.select().single()
    if (!r.error) return r
    const m = /'([a-z_]+)'\s+column/i.exec(r.error.message) || /column\s+"([a-z_]+)"/i.exec(r.error.message)
    const kolom = m?.[1]
    if (kolom && kolom in p) { delete p[kolom]; continue }
    return r
  }
  return { data: null, error: { message: 'gagal update' } }
}

/** GET /api/render-jobs?status=pending&limit=10 */
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const status = searchParams.get('status')
    const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 100)

    const db = supabaseAdmin()
    let q = db.from('render_jobs').select('*').order('created_at', { ascending: true }).limit(limit)
    if (status) q = q.eq('status', status)

    const { data, error } = await q
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ data: data ?? [] })
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'error' }, { status: 500 })
  }
}

/** POST /api/render-jobs  body: { content_id, task_id?, spec? } */
export async function POST(req: Request) {
  try {
    const b = await req.json().catch(() => null)
    if (!b?.content_id) return NextResponse.json({ error: 'content_id wajib' }, { status: 400 })

    const db = supabaseAdmin()
    const content = await db.from('contents').select('id,title').eq('id', b.content_id).single()
    if (!content.data) return NextResponse.json({ error: 'konten tidak ditemukan' }, { status: 404 })

    const payload: Record<string, unknown> = {
      content_id: b.content_id,
      status: 'pending',
      spec: { ...SPEC_DEFAULT, ...(b.spec ?? {}) },
    }
    if (b.task_id) payload.task_id = b.task_id

    let ins = await db.from('render_jobs').insert(payload).select().single()
    const m = ins.error && /'([a-z_]+)'\s+column/i.exec(ins.error.message)
    if (ins.error && m?.[1] && m[1] in payload) {
      delete payload[m[1]]
      ins = await db.from('render_jobs').insert(payload).select().single()
    }
    if (ins.error) return NextResponse.json({ error: ins.error.message }, { status: 500 })

    await db.from('audit_logs').insert({
      actor: 'yanti', actor_type: 'agent', action: 'render.enqueue',
      entity: 'render_jobs', entity_id: ins.data.id, after: ins.data,
    })
    return NextResponse.json({ data: ins.data }, { status: 201 })
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'error' }, { status: 500 })
  }
}

/** PATCH /api/render-jobs  body: { id, action, bot?, output_path?, error? } */
export async function PATCH(req: Request) {
  try {
    const b = await req.json().catch(() => null)
    if (!b?.id) return NextResponse.json({ error: 'id wajib' }, { status: 400 })
    if (!['claim', 'done', 'fail'].includes(b.action)) {
      return NextResponse.json({ error: "action harus 'claim' | 'done' | 'fail'" }, { status: 400 })
    }

    const db = supabaseAdmin()

    if (b.action === 'claim') {
      const bot = String(b.bot ?? '').trim()
      if (!bot) return NextResponse.json({ error: 'bot wajib saat claim' }, { status: 400 })

      const upd = await updateTolerant(db, b.id, {
        status: 'claimed', claimed_by: bot, claimed_at: new Date().toISOString(),
      }, 'pending')

      if (upd.error || !upd.data) {
        return NextResponse.json({ error: 'job sudah diklaim worker lain / gagal klaim' }, { status: 409 })
      }
      return NextResponse.json({ data: upd.data })
    }

    if (b.action === 'done') {
      const upd = await updateTolerant(db, b.id, {
        status: 'done',
        output_path: b.output_path ?? null,
        result: b.result ?? null,
        error: null,
      }, 'claimed')
      if (upd.error) return NextResponse.json({ error: upd.error.message }, { status: 409 })
      return NextResponse.json({ data: upd.data })
    }

    const job = await db.from('render_jobs').select('*').eq('id', b.id).single()
    if (!job.data) return NextResponse.json({ error: 'job tidak ditemukan' }, { status: 404 })

    const attempts = (job.data.attempts ?? 0) + 1
    const status = attempts >= MAX_ATTEMPTS ? 'failed' : 'pending'
    const upd = await updateTolerant(db, b.id, {
      status, attempts,
      error: String(b.error ?? 'render gagal').slice(0, 1000),
      claimed_by: status === 'pending' ? null : job.data.claimed_by,
    })
    if (upd.error) return NextResponse.json({ error: upd.error.message }, { status: 500 })
    return NextResponse.json({ data: upd.data })
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'error' }, { status: 500 })
  }
}