import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

const KEPUTUSAN = ['Approved', 'Revision', 'Rejected']

async function agentId(db: any, nama: string): Promise<string | null> {
  const { data } = await db.from('agents').select('id').eq('nama', nama).single()
  return data?.id ?? null
}

/**
 * GET /api/approvals/pending
 * Daftar konten yang menunggu keputusan + isi brief/naskah/storyboard.
 */
export async function GET() {
  try {
    const db = supabaseAdmin()

    const { data: contents, error } = await db
      .from('contents')
      .select('*')
      .eq('status', 'Ready for Review')
      .order('updated_at', { ascending: false })

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    const hasil = []
    for (const c of contents ?? []) {
      const b = await db.from('content_briefs').select('*').eq('content_id', c.id).order('version', { ascending: false }).limit(1).maybeSingle()
      const s = await db.from('content_scripts').select('*').eq('content_id', c.id).order('version', { ascending: false }).limit(1).maybeSingle()
      const sb = await db.from('storyboards').select('*').eq('content_id', c.id).order('version', { ascending: false }).limit(1).maybeSingle()

      hasil.push({
        ...c,
        brief: b.data ?? null,
        script: s.data ?? null,
        storyboard: sb.data ?? null,
      })
    }

    return NextResponse.json({ data: hasil })
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'error' }, { status: 500 })
  }
}

/**
 * POST /api/approvals
 * body: { content_id, decision, catatan?, reviewer? }
 *
 * Efek:
 *  - Approved  -> status konten 'Approved' + task untuk Yanti (produksi video)
 *  - Revision  -> status konten 'Revision' + task revisi untuk Dava
 *  - Rejected  -> status konten 'Rejected'
 */
export async function POST(req: Request) {
  try {
    const b = await req.json().catch(() => null)
    if (!b?.content_id) return NextResponse.json({ error: 'content_id wajib' }, { status: 400 })
    if (!KEPUTUSAN.includes(b.decision)) {
      return NextResponse.json({ error: `decision harus: ${KEPUTUSAN.join(', ')}` }, { status: 400 })
    }
    if ((b.decision === 'Revision' || b.decision === 'Rejected') && !String(b.catatan ?? '').trim()) {
      return NextResponse.json({ error: 'catatan wajib untuk Revision/Rejected' }, { status: 400 })
    }

    const db = supabaseAdmin()
    const { data: content, error: e0 } = await db.from('contents').select('*').eq('id', b.content_id).single()
    if (e0 || !content) return NextResponse.json({ error: 'konten tidak ditemukan' }, { status: 404 })

    const dika = await agentId(db, 'dika')
    if (!dika) return NextResponse.json({ error: 'agent dika tidak ditemukan' }, { status: 500 })

    // 1. catat keputusan
    const { data: approval, error: e1 } = await db.from('approvals').insert({
      content_id: b.content_id,
      decision: b.decision,
      catatan: b.catatan ?? null,
      reviewer_type: 'agent',
      reviewer_agent_id: dika,
      reviewer_user_id: null,
    }).select().single()

    if (e1) return NextResponse.json({ error: e1.message }, { status: 500 })

    // 2. ubah status konten
    const statusBaru = b.decision === 'Approved' ? 'Approved'
      : b.decision === 'Revision' ? 'Revision'
      : 'Rejected'

    await db.from('contents').update({
      status: statusBaru, updated_at: new Date().toISOString(),
    }).eq('id', b.content_id)

    // 3. task turunan
    let taskBaru: any = null
    if (b.decision === 'Approved') {
      const yanti = await agentId(db, 'yanti')
      if (yanti) {
        const ins = await db.from('tasks').insert({
          title: `Produksi video: ${content.title}`,
          description: `Konten disetujui Dika. Buat video faceless 9:16 (1080x1920), subtitle terbakar, durasi 30-90 detik.\n\nCatatan review: ${b.catatan ?? '-'}`,
          goal: 'Hasilkan video final siap unggah',
          assigned_agent_id: yanti,
          priority: 'high',
          status: 'Assigned',
          content_id: b.content_id,
        }).select().single()
        taskBaru = ins.data
      }
    } else if (b.decision === 'Revision') {
      const dava = await agentId(db, 'dava')
      if (dava) {
        const ins = await db.from('tasks').insert({
          title: `Revisi naskah: ${content.title}`,
          description: `Dikembalikan oleh Dika.\n\nCatatan revisi: ${b.catatan}`,
          goal: 'Perbaiki naskah sesuai catatan review',
          assigned_agent_id: dava,
          priority: 'high',
          status: 'Assigned',
          content_id: b.content_id,
        }).select().single()
        taskBaru = ins.data
      }
    }

    // 4. audit + pesan ke chat kantor
    await db.from('audit_logs').insert({
      actor: 'dika', actor_type: 'agent', action: 'approval.decide',
      entity: 'contents', entity_id: b.content_id,
      before: { status: content.status }, after: { status: statusBaru, decision: b.decision },
      alasan: b.catatan ?? null,
    })

    await db.from('agent_messages').insert({
      task_id: null, sender: 'davadevis_bot', receiver: 'all',
      payload: {
        kind: 'chat', room: 'kantor', auto: true,
        body: `Review "${content.title}": ${b.decision}.${b.catatan ? ` Catatan: ${b.catatan}` : ''}${taskBaru ? ` Task diteruskan ke ${b.decision === 'Approved' ? 'Yanti (video)' : 'Dava (revisi)'}.` : ''}`,
      },
    })

    return NextResponse.json({ data: { approval, status: statusBaru, task: taskBaru } }, { status: 201 })
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'error' }, { status: 500 })
  }
}
