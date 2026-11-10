import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

const STATUS = ['Backlog','Assigned','In Progress','Waiting Input','In Review','Revision','Completed','Blocked','Cancelled']

export async function GET() {
  const db = supabaseAdmin()
  const { data, error } = await db
    .from('tasks')
    .select('*, assigned_agent:agents(id,nama,role)')
    .order('created_at', { ascending: false })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ data })
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => null)
  if (!body?.title) return NextResponse.json({ error: 'title wajib' }, { status: 400 })
  if (body.status && !STATUS.includes(body.status)) return NextResponse.json({ error: 'status tidak valid' }, { status: 400 })
  const db = supabaseAdmin()
  const { data, error } = await db.from('tasks').insert({
    title: body.title,
    description: body.description ?? null,
    goal: body.goal ?? null,
    assigned_agent_id: body.assigned_agent_id ?? null,
    priority: body.priority ?? 'medium',
    status: body.status ?? 'Backlog',
    due_at: body.due_at ?? null,
    content_id: body.content_id ?? null,
  }).select().single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  await db.from('audit_logs').insert({ actor: 'owner', actor_type: 'owner', action: 'task.create', entity: 'tasks', entity_id: data.id, after: data })
  return NextResponse.json({ data }, { status: 201 })
}

export async function PATCH(req: Request) {
  const body = await req.json().catch(() => null)
  if (!body?.id) return NextResponse.json({ error: 'id wajib' }, { status: 400 })
  if (body.status && !STATUS.includes(body.status)) return NextResponse.json({ error: 'status tidak valid' }, { status: 400 })
  const db = supabaseAdmin()
  const { data: before } = await db.from('tasks').select('*').eq('id', body.id).single()
  const patch: Record<string, unknown> = { updated_at: new Date().toISOString() }
  for (const k of ['title','description','goal','assigned_agent_id','priority','status','due_at','content_id']) {
    if (k in body) patch[k] = body[k]
  }
  const { data, error } = await db.from('tasks').update(patch).eq('id', body.id).select().single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  await db.from('audit_logs').insert({ actor: 'owner', actor_type: 'owner', action: 'task.update', entity: 'tasks', entity_id: body.id, before, after: data, alasan: body.alasan ?? null })
  return NextResponse.json({ data })
}
