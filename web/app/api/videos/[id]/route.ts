import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

const STATUS_VIDEO = ['draft', 'preview', 'revision', 'final']

async function agentId(db: any, nama: string): Promise<string | null> {
  const { data } = await db.from('agents').select('id').eq('nama', nama).single()
  return data?.id ?? null
}

/** GET /api/videos/[id] */
export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params
  const db = supabaseAdmin()
  const { data, error } = await db.from('video_versions').select('*').eq('id', id).single()
  if (error) return NextResponse.json({ error: error.message }, { status: 404 })
  return NextResponse.json({ data })
}

/**
 * PATCH /api/videos/[id]
 * body: { status?, file_path?, checksum?, catatan?, spec? }
 * Jika status menjadi 'final' -> buat task Anton (paket unggah).
 */
export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await ctx.params
    const b = await req.json().catch(() => null)
    if (!b) return NextResponse.json({ error: 'body wajib' }, { status: 400 })
    if (b.status && !STATUS_VIDEO.includes(b.status)) {
      return NextResponse.json({ error: `status harus: ${STATUS_VIDEO.join(', ')}` }, { status: 400 })
    }

    const db = supabaseAdmin()
    const before = await db.from('video_versions').select('*').eq('id', id).single()
    if (!before.data) return NextResponse.json({ error: 'versi video tidak ditemukan' }, { status: 404 })

    const patch: Record<string, unknown> = {}
    for (const k of ['status', 'file_path', 'checksum', 'catatan', 'spec']) {
      if (k in b) patch[k] = b[k]
    }

    const upd = await db.from('video_versions').update(patch).eq('id', id).select().single()
    if (upd.error) return NextResponse.json({ error: upd.error.message }, { status: 500 })

    let taskAnton: any = null
    if (b.status === 'final' && before.data.status !== 'final' && before.data.content_id) {
      const content = await db.from('contents').select('*').eq('id', before.data.content_id).single()
      const anton = await agentId(db, 'anton')
      if (anteonSafe(anton) && content.data) {
        const ins = await db.from('tasks').insert({
          title: `Paket unggah: ${content.data.title}`,
          description: `Video final tersedia (${upd.data.file_path ?? 'file belum dilampirkan'}). Siapkan paket: caption, hashtag, cover, checklist. Status Published hanya setelah Owner konfirmasi URL.`,
          goal: 'Paket publikasi siap unggah manual',
          assigned_agent_id: anton,
          priority: 'high',
          status: 'Assigned',
          content_id: before.data.content_id,
        }).select().single()
        taskAnton = ins.data
      }
      await db.from('contents').update({ status: 'Ready to Publish', updated_at: new Date().toISOString() }).eq('id', before.data.content_id)
    }

    await db.from('audit_logs').insert({
      actor: 'yanti', actor_type: 'agent', action: 'video.update',
      entity: 'video_versions', entity_id: id, before: before.data, after: upd.data,
    })

    return NextResponse.json({ data: upd.data, task_anton: taskAnton })
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'error' }, { status: 500 })
  }
}

function anteonSafe(v: string | null): boolean {
  return typeof v === 'string' && v.length > 0
}