import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

/**
 * POST /api/content/[id]/step
 * body: { step: 'brief' | 'script' | 'storyboard', ...payload }
 *
 * Menyimpan hasil kerja Dava per tahap, dengan versioning otomatis.
 * Setiap step juga memajukan status konten sesuai alur PRD.
 */
export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params
  const body = await req.json().catch(() => null)
  if (!body?.step) return NextResponse.json({ error: 'step wajib' }, { status: 400 })

  const db = supabaseAdmin()

  const { data: content, error: e0 } = await db.from('contents').select('*').eq('id', id).single()
  if (e0 || !content) return NextResponse.json({ error: 'content tidak ditemukan' }, { status: 404 })

  const step = String(body.step)

  if (step === 'brief') {
    if (!body.body || typeof body.body !== 'object') {
      return NextResponse.json({ error: 'body (objek brief) wajib' }, { status: 400 })
    }
    const { data: last } = await db
      .from('content_briefs').select('version').eq('content_id', id)
      .order('version', { ascending: false }).limit(1).maybeSingle()
    const version = (last?.version ?? 0) + 1

    const { data, error } = await db.from('content_briefs')
      .insert({ content_id: id, body: body.body, version })
      .select().single()
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    await db.from('contents').update({ status: 'Briefing', updated_at: new Date().toISOString() }).eq('id', id)
    await db.from('audit_logs').insert({
      actor: 'dava', actor_type: 'agent', action: 'content.brief',
      entity: 'contents', entity_id: id, after: data,
    })
    return NextResponse.json({ data }, { status: 201 })
  }

  if (step === 'script') {
    for (const f of ['hook', 'narasi', 'cta']) {
      if (!body[f] || !String(body[f]).trim()) {
        return NextResponse.json({ error: `${f} wajib` }, { status: 400 })
      }
    }
    const { data: last } = await db
      .from('content_scripts').select('version').eq('content_id', id)
      .order('version', { ascending: false }).limit(1).maybeSingle()
    const version = (last?.version ?? 0) + 1

    const { data, error } = await db.from('content_scripts').insert({
      content_id: id,
      hook: body.hook,
      narasi: body.narasi,
      cta: body.cta,
      caption: body.caption ?? null,
      hashtags: body.hashtags ?? null,
      estimasi_durasi: body.estimasi_durasi ?? null,
      version,
      catatan_perubahan: body.catatan_perubahan ?? null,
      created_by: 'dava',
    }).select().single()
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    await db.from('contents').update({ status: 'Scripting', updated_at: new Date().toISOString() }).eq('id', id)
    await db.from('audit_logs').insert({
      actor: 'dava', actor_type: 'agent', action: 'content.script',
      entity: 'contents', entity_id: id, after: data,
    })
    return NextResponse.json({ data }, { status: 201 })
  }

  if (step === 'storyboard') {
    const scenes = body.scenes
    if (!Array.isArray(scenes) || scenes.length === 0) {
      return NextResponse.json({ error: 'scenes (array) wajib dan tidak boleh kosong' }, { status: 400 })
    }
    for (const [i, sc] of scenes.entries()) {
      if (!sc || typeof sc !== 'object') {
        return NextResponse.json({ error: `scenes[${i}] tidak valid` }, { status: 400 })
      }
      if (!sc.visual && !sc.teks) {
        return NextResponse.json({ error: `scenes[${i}] butuh minimal visual atau teks` }, { status: 400 })
      }
    }
    const { data: last } = await db
      .from('storyboards').select('version').eq('content_id', id)
      .order('version', { ascending: false }).limit(1).maybeSingle()
    const version = (last?.version ?? 0) + 1

    const { data, error } = await db.from('storyboards')
      .insert({ content_id: id, scenes, version })
      .select().single()
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    await db.from('contents').update({ status: 'Storyboarding', updated_at: new Date().toISOString() }).eq('id', id)
    await db.from('audit_logs').insert({
      actor: 'dava', actor_type: 'agent', action: 'content.storyboard',
      entity: 'contents', entity_id: id, after: data,
    })
    return NextResponse.json({ data }, { status: 201 })
  }

  return NextResponse.json({ error: "step harus 'brief' | 'script' | 'storyboard'" }, { status: 400 })
}
