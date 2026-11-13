import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

// Data Main Office: profil agen + tugas mereka + aktivitas (agent_messages & audit_logs) hari ini
export async function GET() {
  const db = supabaseAdmin()
  const since = new Date(Date.now() - 12 * 3600 * 1000).toISOString() // jam kerja 12 jam terakhir

  const [{ data: agents }, { data: tasks }, { data: msgs }, { data: logs }] = await Promise.all([
    db.from('agents').select('*').order('created_at'),
    db.from('tasks').select('id,title,status,assigned_agent_id,priority,updated_at,created_at'),
    db.from('agent_messages').select('sender,task_id,payload,created_at').gte('created_at', since).order('created_at', { ascending: false }).limit(200),
    db.from('audit_logs').select('actor,action,entity,entity_id,created_at,after').gte('created_at', since).order('created_at', { ascending: false }).limit(200),
  ])
  if (!agents) return NextResponse.json({ error: 'agents kosong' }, { status: 500 })

  const done = new Set(['Completed', 'In Review'])
  const wip = new Set(['In Progress', 'Assigned', 'Revision', 'Waiting Input', 'Blocked'])

  const office = agents.map((a: any) => {
    const mine = (tasks ?? []).filter((t: any) => t.assigned_agent_id === a.id)
    const selesai = mine.filter((t: any) => done.has(t.status)).length
    const aktif = mine.filter((t: any) => wip.has(t.status)).length
    const total = mine.length
    const progress = total ? Math.round(((selesai + (mine.filter((t: any) => t.status === 'Waiting Input').length) * 0.5) / total) * 100) : 0

    // aktivitas terbaru agent ini
    const senderKey = `agent:${a.nama.toLowerCase()}`
    const acts = [
      ...(msgs ?? []).filter((m: any) => (m.sender || '').toLowerCase() === senderKey).map((m: any) => {
        let ringkas = ''
        try { const p = JSON.parse(m.payload); ringkas = p.catatan || p.hasil?.slice(0, 140) || '' } catch { ringkas = String(m.payload).slice(0, 140) }
        return { t: m.created_at, teks: ringkas || 'Update tugas', sumber: 'pesan' }
      }),
      ...(logs ?? []).filter((l: any) => (l.actor || '').toLowerCase() === a.nama.toLowerCase()).map((l: any) => ({
        t: l.created_at, teks: `${l.action} pada ${(l.after as any)?.title ?? l.entity ?? ''}`, sumber: 'sistem',
      })),
    ].sort((x, y) => (x.t < y.t ? 1 : -1)).slice(0, 6)

    const lastAct = acts[0]?.t ?? a.updated_at
    const minutesAgo = lastAct ? Math.round((Date.now() - new Date(lastAct).getTime()) / 60000) : null
    const status = minutesAgo != null && minutesAgo <= 30 ? 'bekerja' : total && aktif > 0 ? 'siaga' : 'idle'

    return {
      id: a.id, nama: a.nama, role: a.role, status, deskripsi: a.deskripsi,
      stats: { total, selesai, aktif, progress },
      aktivitas: acts,
      last_activity: lastAct,
    }
  })

  // feed gabungan untuk timeline kantor
  const feed = (msgs ?? []).map((m: any) => {
    let ringkas = ''
    try { const p = JSON.parse(m.payload); ringkas = p.catatan || (p.hasil ? String(p.hasil).slice(0, 120) : '') } catch { ringkas = String(m.payload).slice(0, 120) }
    return { t: m.created_at, agent: (m.sender || '').replace('agent:', ''), teks: ringkas }
  })
    .concat((logs ?? []).map((l: any) => ({ t: l.created_at, agent: l.actor, teks: `${l.action} ${l.entity ?? ''}` })))
    .sort((x, y) => (x.t < y.t ? 1 : -1)).slice(0, 30)

  return NextResponse.json({ data: office, feed })
}
