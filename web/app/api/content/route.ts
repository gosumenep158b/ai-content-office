import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

const STATUS = [
  'Idea', 'Selected', 'Briefing', 'Scripting', 'Storyboarding', 'Production',
  'Rendering', 'Ready for Review', 'Revision', 'Approved', 'Rejected',
  'Ready to Publish', 'Published', 'Archived',
]

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const status = searchParams.get('status')
  const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 200)
  const db = supabaseAdmin()

  let q = db.from('contents').select('*').order('created_at', { ascending: false }).limit(limit)
  if (status) q = q.eq('status', status)

  const { data, error } = await q
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ data: data ?? [] })
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => null)
  if (!body?.title) return NextResponse.json({ error: 'title wajib' }, { status: 400 })
  if (body.status && !STATUS.includes(body.status)) {
    return NextResponse.json({ error: 'status tidak valid' }, { status: 400 })
  }

  const db = supabaseAdmin()
  const { data: content, error } = await db
    .from('contents')
    .insert({
      title: body.title,
      platform: body.platform ?? 'tiktok',
      purpose: body.purpose ?? null,
      audience: body.audience ?? null,
      topic: body.topic ?? null,
      angle: body.angle ?? null,
      status: body.status ?? 'Idea',
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Kaitkan ke item riset (opsional) — content_ideas
  if (body.research_item_id) {
    await db.from('content_ideas').insert({
      research_item_id: body.research_item_id,
      content_id: content.id,
      status: 'selected',
      skor: body.skor ?? null,
    })
  }

  await db.from('audit_logs').insert({
    actor: 'dava', actor_type: 'agent', action: 'content.create',
    entity: 'contents', entity_id: content.id, after: content,
  })

  return NextResponse.json({ data: content }, { status: 201 })
}
