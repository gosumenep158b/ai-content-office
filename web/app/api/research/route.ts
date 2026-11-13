import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

const PLATFORMS = ['instagram', 'tiktok', 'threads']
const VERIF = ['Verified', 'Estimated', 'Unverified', 'Unavailable']

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const withItems = searchParams.get('with_items') === '1'
    const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 100)
    const db = supabaseAdmin()

    const { data: reports, error } = await db
      .from('research_reports')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit)

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    if (!withItems || !reports?.length) {
      return NextResponse.json({ data: reports ?? [] })
    }

    const ids = reports.map((r: any) => r.id)
    const { data: items, error: e2 } = await db
      .from('research_items')
      .select('*')
      .in('report_id', ids)
      .order('created_at', { ascending: true })

    if (e2) return NextResponse.json({ error: e2.message }, { status: 500 })

    const byReport: Record<string, any[]> = {}
    for (const it of items ?? []) {
      (byReport[it.report_id] ||= []).push(it)
    }
    return NextResponse.json({
      data: reports.map((r: any) => ({ ...r, items: byReport[r.id] ?? [] })),
    })
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'kesalahan server' },
      { status: 500 }
    )
  }
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => null)
  if (!body?.periode) return NextResponse.json({ error: 'periode wajib' }, { status: 400 })
  if (body.platform && !PLATFORMS.includes(String(body.platform).toLowerCase())) {
    return NextResponse.json({ error: `platform harus salah satu: ${PLATFORMS.join(', ')}` }, { status: 400 })
  }

  const items = Array.isArray(body.items) ? body.items : []
  for (const [i, it] of items.entries()) {
    if (!it?.topic) return NextResponse.json({ error: `items[${i}].topic wajib` }, { status: 400 })
    if (it.verification_status && !VERIF.includes(it.verification_status)) {
      return NextResponse.json({ error: `items[${i}].verification_status tidak valid` }, { status: 400 })
    }
  }

  const db = supabaseAdmin()

  const { data: report, error } = await db
    .from('research_reports')
    .insert({
      periode: body.periode,
      platform: body.platform ?? null,
      summary: body.summary ?? null,
      created_by: 'kinan',
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  let insertedItems: any[] = []
  if (items.length) {
    const rows = items.map((it: any) => ({
      report_id: report.id,
      platform: it.platform ?? body.platform ?? null,
      topic: it.topic,
      source_url: it.source_url ?? null,
      captured_at: it.captured_at ?? new Date().toISOString(),
      published_at: it.published_at ?? null,
      metric_values: it.metric_values ?? null,
      metric_source: it.metric_source ?? null,
      verification_status: it.verification_status ?? 'Unverified',
      notes: it.notes ?? null,
    }))
    const { data: ins, error: e2 } = await db.from('research_items').insert(rows).select()
    if (e2) return NextResponse.json({ error: e2.message }, { status: 500 })
    insertedItems = ins ?? []
  }

  await db.from('audit_logs').insert({
    actor: 'kinan', actor_type: 'agent', action: 'research.create',
    entity: 'research_reports', entity_id: report.id,
    after: { report, items: insertedItems },
  })

  return NextResponse.json({ data: { ...report, items: insertedItems } }, { status: 201 })
}
