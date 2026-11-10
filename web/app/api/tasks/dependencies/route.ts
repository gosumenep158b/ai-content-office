import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const taskId = searchParams.get('taskId')
  const db = supabaseAdmin()
  let q = db.from('task_dependencies').select('*')
  if (taskId) q = q.eq('task_id', taskId)
  const { data, error } = await q
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ data })
}

// POST: tambah dependensi dengan validasi siklus
export async function POST(req: Request) {
  const body = await req.json().catch(() => null)
  if (!body?.task_id || !body?.depends_on_task_id) return NextResponse.json({ error: 'task_id & depends_on_task_id wajib' }, { status: 400 })
  if (body.task_id === body.depends_on_task_id) return NextResponse.json({ error: 'task tidak bisa bergantung pada dirinya' }, { status: 400 })
  const db = supabaseAdmin()
  let current: string = body.depends_on_task_id
  const visited = new Set<string>()
  for (let i = 0; i < 20; i++) {
    if (current === body.task_id) return NextResponse.json({ error: 'menambahkan ini akan membuat dependensi siklik' }, { status: 400 })
    if (visited.has(current)) break
    visited.add(current)
    const { data: next } = await db.from('task_dependencies').select('depends_on_task_id').eq('task_id', current)
    if (!next?.length) break
    current = next[0].depends_on_task_id
  }
  const { data, error } = await db.from('task_dependencies').insert({
    task_id: body.task_id,
    depends_on_task_id: body.depends_on_task_id,
  }).select().single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  await db.from('audit_logs').insert({ actor: 'owner', actor_type: 'owner', action: 'task_dependency.create', entity: 'task_dependencies', entity_id: data.id, after: data })
  return NextResponse.json({ data }, { status: 201 })
}

export async function DELETE(req: Request) {
  const { searchParams } = new URL(req.url)
  const id = searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'id wajib' }, { status: 400 })
  const db = supabaseAdmin()
  const { error } = await db.from('task_dependencies').delete().eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  await db.from('audit_logs').insert({ actor: 'owner', actor_type: 'owner', action: 'task_dependency.delete', entity: 'task_dependencies', entity_id: id })
  return NextResponse.json({ ok: true })
}
