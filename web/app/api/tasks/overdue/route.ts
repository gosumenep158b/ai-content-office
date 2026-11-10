import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

// GET: task terlambat (due_at < sekarang, belum Completed/Cancelled)
export async function GET() {
  const db = supabaseAdmin()
  const now = new Date().toISOString()
  const { data, error } = await db
    .from('tasks')
    .select('*, assigned_agent:agents(id,nama,role)')
    .not('due_at', 'is', null)
    .lt('due_at', now)
    .not('status', 'in', '("Completed","Cancelled")')
    .order('due_at', { ascending: true })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  // tandai Blocked + audit sekali per task (idempotent via cek status sebelumnya)
  for (const t of data ?? []) {
    if (t.status !== 'Blocked') {
      await db.from('tasks').update({ status: 'Blocked', updated_at: now }).eq('id', t.id)
      await db.from('audit_logs').insert({ actor: 'system', actor_type: 'system', action: 'task.overdue_block', entity: 'tasks', entity_id: t.id, before: { status: t.status }, after: { status: 'Blocked' }, alasan: 'melewati deadline' })
      await db.from('notifications').insert({ tipe: 'task_overdue', title: `Task terlambat: ${t.title}`, body: `Melewati deadline ${t.due_at}`, link: `/tasks` })
    }
  }
  return NextResponse.json({ data })
}
