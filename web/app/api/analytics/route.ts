import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

// GET: ringkasan analytics per publication (join publications utk judul/platform)
export async function GET() {
  const db = supabaseAdmin()
  const { data, error } = await db
    .from('analytics')
    .select('*, publication:publication_id(id,akun,url,published_at,caption,hashtags,status,content_id)')
    .order('captured_at', { ascending: true })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  // agregasi: snapshot terakhir per publication
  const byPub: Record<string, any> = {}
  for (const row of data ?? []) {
    const key = row.publication_id ?? 'none'
    byPub[key] = { publication: row.publication ?? null, rows: (byPub[key]?.rows ?? []).concat(row) }
  }
  const summary = Object.entries(byPub).map(([pid, v]: any) => {
    const rows = v.rows
    const last = rows[rows.length - 1]
    const first = rows[0]
    return {
      publication_id: pid,
      title: (last.publication?.caption ?? '').slice(0, 60) || '(tanpa caption)',
      platform: last.publication?.akun ?? '-',
      posted_at: last.publication?.published_at ?? null,
      url: last.publication?.url ?? null,
      views: last.views, likes: last.likes, comments: last.comments, shares: last.shares, saves: last.saves,
      growth_views: (last.views ?? 0) - (first.views ?? 0),
      snapshots: rows.length,
      first_at: first.captured_at, last_at: last.captured_at,
    }
  })
  const pubs = await db.from('publications').select('id,caption,akun,url,published_at,status').order('created_at', { ascending: false })
  return NextResponse.json({ data: summary.sort((a: any, b: any) => (b.views ?? 0) - (a.views ?? 0)), publications: pubs.data ?? [] })
}

// POST: input snapshot manual {publication_id, views, likes, comments, shares, saves}
export async function POST(req: Request) {
  const body = await req.json().catch(() => null)
  if (!body?.publication_id || body?.views == null) return NextResponse.json({ error: 'publication_id & views wajib' }, { status: 400 })
  const db = supabaseAdmin()
  const { data, error } = await db.from('analytics').insert({
    publication_id: body.publication_id,
    views: body.views ?? 0, likes: body.likes ?? 0, comments: body.comments ?? 0,
    shares: body.shares ?? 0, saves: body.saves ?? 0,
    input_by: body.input_by ?? 'owner', interval: body.interval ?? 'manual',
  }).select().single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ data }, { status: 201 })
}
