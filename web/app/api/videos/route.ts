import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

const STATUS_VIDEO = ['draft', 'preview', 'revision', 'final']

const SPEC_DEFAULT = {
  container: 'mp4',
  ratio: '9:16',
  resolution: '1080x1920',
  vcodec: 'h264',
  acodec: 'aac',
  fps: 30,
  subtitle: 'embedded',
}

async function agentId(db: any, nama: string): Promise<string | null> {
  const { data } = await db.from('agents').select('id').eq('nama', nama).single()
  return data?.id ?? null
}

/** GET /api/videos?content_id=<id> */
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const contentId = searchParams.get('content_id')

    const db = supabaseAdmin()
    let q = db.from('video_versions').select('*').order('created_at', { ascending: false }).limit(100)
    if (contentId) q = q.eq('content_id', contentId)

    const { data, error } = await q
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ data: data ?? [] })
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'error' }, { status: 500 })
  }
}

/**
 * POST /api/videos
 * Membuat versi video baru untuk sebuah konten.
 * body: { content_id, spec?, catatan? }
 */
export async function POST(req: Request) {
  try {
    const b = await req.json().catch(() => null)
    if (!b?.content_id) return NextResponse.json({ error: 'content_id wajib' }, { status: 400 })

    const db = supabaseAdmin()
    const content = await db.from('contents').select('*').eq('id', b.content_id).single()
    if (!content.data) return NextResponse.json({ error: 'konten tidak ditemukan' }, { status: 404 })

    // versi berikutnya (kolom `version` mungkin belum ada di DB live)
    let version: number | null = null
    try {
      const last = await db.from('video_versions').select('version')
        .eq('content_id', b.content_id).order('created_at', { ascending: false }).limit(1).maybeSingle()
      if (!last.error) version = Number(last.data?.version ?? 0) + 1
    } catch { version = null }

    const payload: Record<string, unknown> = {
      content_id: b.content_id,
      status: 'draft',
      spec: { ...SPEC_DEFAULT, ...(b.spec ?? {}) },
      catatan: b.catatan ?? null,
    }
    if (version !== null) payload.version = version

    let ins = await db.from('video_versions').insert(payload).select().single()

    // fallback bila skema live belum punya kolom version
    if (ins.error && /version/i.test(ins.error.message)) {
      delete payload.version
      ins = await db.from('video_versions').insert(payload).select().single()
    }

    const data = ins.data
    const error = ins.error
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    await db.from('contents').update({ status: 'Rendering', updated_at: new Date().toISOString() }).eq('id', b.content_id)
    await db.from('audit_logs').insert({
      actor: 'yanti', actor_type: 'agent', action: 'video.create',
      entity: 'video_versions', entity_id: data.id, after: data,
    })

    return NextResponse.json({ data }, { status: 201 })
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'error' }, { status: 500 })
  }
}