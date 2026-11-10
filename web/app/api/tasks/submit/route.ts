import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

export async function POST(req: Request) {
  const body = await req.json().catch(() => null)
  if (!body?.task_id) return NextResponse.json({ error: 'task_id wajib' }, { status: 400 })
  const db = supabaseAdmin()
  const { data: task } = await db.from('tasks').select('*').eq('id', body.task_id).single()
  if (!task) return NextResponse.json({ error: 'task tidak ditemukan' }, { status: 404 })
  if (['Completed', 'Cancelled'].includes(task.status)) return NextResponse.json({ error: 'task sudah selesai/dibatalkan' }, { status: 400 })
  // dependensi wajib harus Completed
  const { data: deps } = await db.from('task_dependencies').select('depends_on_task_id').eq('task_id', body.task_id)
  if (deps?.length) {
    const { data: depTasks } = await db.from('tasks').select('id,title,status').in('id', deps.map((d: {depends_on_task_id: string}) => d.depends_on_task_id))
    const unfinished = (depTasks ?? []).filter((t: {status: string}) => t.status !== 'Completed')
    if (unfinished.length) {
      return NextResponse.json({ error: 'dependensi belum selesai', unfinished }, { status: 400 })
    }
  }
  // submit: naikkan attempt, simpan output, status In Review
  const { data, error } = await db.from('tasks').update({
    status: 'In Review',
    attempt: (task.attempt ?? 0) + 1,
    updated_at: new Date().toISOString(),
  }).eq('id', body.task_id).select().single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  await db.from('agent_messages').insert({
    task_id: body.task_id,
    sender: body.sender ?? 'agent',
    receiver: 'dika',
    payload: { type: 'submit', output: body.output ?? null, attempt: (task.attempt ?? 0) + 1, notes: body.notes ?? null },
  })
  await db.from('audit_logs').insert({ actor: body.sender ?? 'agent', actor_type: 'agent', action: 'task.submit', entity: 'tasks', entity_id: body.task_id, after: data })
  return NextResponse.json({ data }, { status: 200 })
}
