import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

const MAX_ATTEMPTS = 3
const SPEC_DEFAULT = {
  ratio: '9:16', resolution: '1080x1920', container: 'mp4',
  vcodec: 'h264', acodec: 'aac', fps: 30, subtitle: 'embedded',
}

/** GET /api/render-jobs?status=pending&limit=10 */
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const status = searchParams.get('status')
    const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 100)

    const db = supabaseAdmin()
    let q = db.from('render_jobs').select('*, content:contents(id,title)')
      .order('created_at', { ascending: true }).limit(limit)
    if (status) q = q.eq('status', status)

    const { data, error } = await q
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ data: data ?? [] })
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'error' }, { status: 500 })
  }
}

/** POST /api/render-jobs  body: { content_id, spec? } */
export async function POST(req: Request) {
  try {
    const b = await req.json().catch(() => null)
    if (!b?.content_id) return NextResponse.json({ error: 'content_id wajib' }, { status: 400 })

    const db = supabaseAdmin()
    const content = await db.from('contents').select('id,title').eq('id', b.content_id).single()
    if (!content.data) return NextResponse.json({ error: 'konten tidak ditemukan' }, { status: 404 })

    const { data, error } = await db.from('render_jobs').insert({
      content_id: b.content_id,
      status: 'pending',
      spec: { ...SPEC_DEFAULT, ...(b.spec ?? {}) },
    }).select().single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    await db.from('audit_logs').insert({
      actor: 'yanti', actor_type: 'agent', action: 'render.enqueue',
      entity: 'render_jobs', entity_id: data.id, after: data,
    })
    return NextResponse.json({ data }, { status: 201 })
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'error' }, { status: 500 })
  }
}

/**
 * PATCH /api/render-jobs
 * body: { id, action: 'claim'|'done'|'fail', bot, result?, error? }
 */
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

      // UPDATE bersyarat: hanya berhasil bila masih pending (anti dobel-klaim)
      const upd = await db.from('render_jobs')
        .update({ status: 'claimed', claimed_by: bot, claimed_at: new Date().toISOString(), updated_at: new Date().toISOString() })
        .eq('id', b.id).eq('status', 'pending')
        .select().single()

      if (upd.error) return NextResponse.json({ error: 'job sudah diklaim worker lain', status: 409 }, { status: 409 })
      return NextResponse.json({ data: upd.data })
    }

    if (b.action === 'done') {
      const upd = await db.from('render_jobs')
        .update({ status: 'done', result: b.result ?? null, error: null, updated_at: new Date().toISOString() })
        .eq('id', b.id).eq('status', 'claimed')
        .select().single()
      if (upd.error) return NextResponse.json({ error: upd.error.message }, { status: 409 })
      return NextResponse.json({ data: upd.data })
    }

    // fail
    const job = await db.from('render_jobs').select('*').eq('id', b.id).single()
    if (!job.data) return NextResponse.json({ error: 'job tidak ditemukan' }, { status: 404 })

    const attempts = (job.data.attempts ?? 0) + 1
    const status = attempts >= MAX_ATTEMPTS ? 'failed' : 'pending'
    const upd = await db.from('render_jobs').update({
      status, attempts, error: String(b.error ?? 'render gagal').slice(0, 1000),
      claimed_by: status === 'pending' ? null : job.data.claimed_by,
      updated_at: new Date().toISOString(),
    }).eq('id', b.id).select().single()

    if (upd.error) return NextResponse.json({ error: upd.error.message }, { status: 500 })
    return NextResponse.json({ data: upd.data })
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'error' }, { status: 500 })
  }
}