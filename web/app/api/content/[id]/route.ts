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

  const { data: content, error } = await db.from('contents').select('*').eq('id', id).single()
  if (error) return NextResponse.json({ error: error.message }, { status: 404 })

  const [{ data: briefs }, { data: scripts }, { data: boards }, { data: ideas }] = await Promise.all([
    db.from('content_briefs').select('*').eq('content_id', id).order('version', { ascending: false }),
    db.from('content_scripts').select('*').eq('content_id', id).order('version', { ascending: false }),
    db.from('storyboards').select('*').eq('content_id', id).order('version', { ascending: false }),
    db.from('content_ideas').select('*, research_item:research_items(*)').eq('content_id', id),
  ])

  return NextResponse.json({
    data: {
      ...content,
      brief: briefs?.[0] ?? null,
      script: scripts?.[0] ?? null,
      storyboard: boards?.[0] ?? null,
      scripts_history: scripts ?? [],
      storyboards_history: boards ?? [],
      ideas: ideas ?? [],
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
  const { data: before } = await db.from('contents').select('*').eq('id', id).single()

  const patch: Record<string, unknown> = { updated_at: new Date().toISOString() }
  for (const k of ['title', 'platform', 'purpose', 'audience', 'topic', 'angle', 'status']) {
    if (k in body) patch[k] = body[k]
  }

  const { data, error } = await db.from('contents').update(patch).eq('id', id).select().single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  await db.from('audit_logs').insert({
    actor: 'dava', actor_type: 'agent', action: 'content.update',
    entity: 'contents', entity_id: id, before, after: data,
  })

  return NextResponse.json({ data })
}
