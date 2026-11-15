import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

const STATUS = [
  'Idea', 'Selected', 'Briefing', 'Scripting', 'Storyboarding', 'Production',
  'Rendering', 'Ready for Review', 'Revision', 'Approved', 'Rejected',
  'Ready to Publish', 'Published', 'Archived',
]

export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params
  const db = supabaseAdmin()

  const content = await db.from('contents').select('*').eq('id', id).single()
  if (content.error) return NextResponse.json({ error: content.error.message }, { status: 404 })

  const briefs = await db.from('content_briefs').select('*').eq('content_id', id).order('version', { ascending: false })
  const scripts = await db.from('content_scripts').select('*').eq('content_id', id).order('version', { ascending: false })
  const boards = await db.from('storyboards').select('*').eq('content_id', id).order('version', { ascending: false })
  const ideas = await db.from('content_ideas').select('*, research_item:research_items(*)').eq('content_id', id)

  const b = briefs.data ?? []
  const s = scripts.data ?? []
  const bo = boards.data ?? []
  const id_ = ideas.data ?? []

  return NextResponse.json({
    data: {
      ...content.data,
      brief: b[0] ?? null,
      script: s[0] ?? null,
      storyboard: bo[0] ?? null,
      scripts_history: s,
      storyboards_history: bo,
      ideas: id_,
    },
  })
}

export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params
  const body = await req.json().catch(() => null)
  if (!body) return NextResponse.json({ error: 'body wajib' }, { status: 400 })
  if (body.status && !STATUS.includes(body.status)) {
    return NextResponse.json({ error: 'status tidak valid' }, { status: 400 })
  }

  const db = supabaseAdmin()
  const before = await db.from('contents').select('*').eq('id', id).single()

  const patch: Record<string, unknown> = { updated_at: new Date().toISOString() }
  for (const k of ['title', 'platform', 'purpose', 'audience', 'topic', 'angle', 'status']) {
    if (k in body) patch[k] = body[k]
  }

  const upd = await db.from('contents').update(patch).eq('id', id).select().single()
  if (upd.error) return NextResponse.json({ error: upd.error.message }, { status: 500 })

  await db.from('audit_logs').insert({
    actor: 'dava', actor_type: 'agent', action: 'content.update',
    entity: 'contents', entity_id: id, before: before.data, after: upd.data,
  })

  return NextResponse.json({ data: upd.data })
}

export async function DELETE(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params
  const db = supabaseAdmin()

  const before = await db.from('contents').select('*').eq('id', id).single()
  if (!before.data) return NextResponse.json({ error: 'tidak ditemukan' }, { status: 404 })

  // hapus turunan dulu supaya tidak melanggar foreign key
  await db.from('approvals').delete().eq('content_id', id)
  await db.from('content_ideas').delete().eq('content_id', id)
  await db.from('content_briefs').delete().eq('content_id', id)
  await db.from('storyboards').delete().eq('content_id', id)
  await db.from('content_scripts').delete().eq('content_id', id)
  await db.from('tasks').update({ content_id: null }).eq('content_id', id)

  const del = await db.from('contents').delete().eq('id', id)
  if (del.error) return NextResponse.json({ error: del.error.message }, { status: 500 })

  await db.from('audit_logs').insert({
    actor: 'owner', actor_type: 'owner', action: 'content.delete',
    entity: 'contents', entity_id: id, before: before.data,
  })

  return NextResponse.json({ ok: true, id })
}
