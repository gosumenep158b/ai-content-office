import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { AGENT_PROMPTS } from '@/lib/agent-prompts'

/**
 * POST /api/admin/seed-prompts
 * Mengisi tabel agent_prompts (versi 1) dari docs/prompts/*.md
 * (dibundel ke src/lib/agent-prompts.ts karena docs/ tidak ikut deploy).
 *
 * Idempotent: agent yang sudah punya prompt versi yang sama tidak diduplikasi.
 */
export async function GET() {
  try {
    const db = supabaseAdmin()
    const { data: agents } = await db.from('agents').select('id,nama')
    const { data: rows } = await db.from('agent_prompts').select('agent_id,version')
    const hasil = (agents ?? []).map((a: any) => ({
      nama: a.nama,
      ada_prompt: (rows ?? []).some((r: any) => r.agent_id === a.id),
      versi: Math.max(0, ...(rows ?? []).filter((r: any) => r.agent_id === a.id).map((r: any) => r.version ?? 0)),
    }))
    return NextResponse.json({ data: hasil })
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'error' }, { status: 500 })
  }
}

export async function POST() {
  try {
    const db = supabaseAdmin()
    const { data: agents, error } = await db.from('agents').select('id,nama')
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    const hasil: any[] = []

    for (const a of agents ?? []) {
      const prompt = AGENT_PROMPTS[a.nama?.toLowerCase?.() ?? '']
      if (!prompt) {
        hasil.push({ nama: a.nama, status: 'dilewati', alasan: 'tidak ada file prompt' })
        continue
      }

      const { data: last } = await db
        .from('agent_prompts')
        .select('version')
        .eq('agent_id', a.id)
        .order('version', { ascending: false })
        .limit(1)
        .maybeSingle()

      const versiTerakhir = last?.version ?? 0

      // jika sudah v1 dan isinya sama, lewati
      if (versiTerakhir >= 1) {
        const { data: existing } = await db
          .from('agent_prompts')
          .select('prompt')
          .eq('agent_id', a.id)
          .eq('version', versiTerakhir)
          .maybeSingle()
        if (existing?.prompt === prompt) {
          hasil.push({ nama: a.nama, status: 'sudah ada', versi: versiTerakhir })
          continue
        }
      }

      const { error: e2 } = await db.from('agent_prompts').insert({
        agent_id: a.id,
        version: versiTerakhir + 1,
        prompt,
      })
      if (e2) {
        hasil.push({ nama: a.nama, status: 'gagal', alasan: e2.message })
        continue
      }
      hasil.push({ nama: a.nama, status: 'ditanam', versi: versiTerakhir + 1 })
    }

    await db.from('audit_logs').insert({
      actor: 'system', actor_type: 'system', action: 'agent_prompts.seed',
      entity: 'agent_prompts', after: { hasil },
    })

    return NextResponse.json({ data: hasil })
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'error' }, { status: 500 })
  }
}
