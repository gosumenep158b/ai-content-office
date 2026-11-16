import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

const STATUS = ['Draft', 'Package Ready', 'Awaiting Owner Confirmation', 'Published', 'Failed/Cancelled']

/**
 * GET /api/publications
 * Daftar paket publikasi + kontennya.
 */
export async function GET() {
  try {
    const db = supabaseAdmin()
    const { data, error } = await db
      .from('publications')
      .select('*, content:contents(id,title,platform,status)')
      .order('created_at', { ascending: false })
      .limit(100)

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    // sertakan snapshots analytics terakhir
    const hasil = []
    for (const p of data ?? []) {
      const a = await db.from('analytics').select('*').eq('publication_id', p.id)
        .order('captured_at', { ascending: false }).limit(1).maybeSingle()
      hasil.push({ ...p, analytics_terakhir: a.data ?? null })
    }
    return NextResponse.json({ data: hasil })
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'error' }, { status: 500 })
  }
}

/**
 * POST /api/publications
 * Anton menyiapkan paket unggah. Hanya untuk konten berstatus Approved.
 * body: { content_id, caption?, hashtags?, akun?, cover_path? }
 */
export async function POST(req: Request) {
  try {
    const b = await req.json().catch(() => null)
    if (!b?.content_id) return NextResponse.json({ error: 'content_id wajib' }, { status: 400 })

    const db = supabaseAdmin()
    const { data: content } = await db.from('contents').select('*').eq('id', b.content_id).single()
    if (!content) return NextResponse.json({ error: 'konten tidak ditemukan' }, { status: 404 })
    if (content.status !== 'Approved') {
      return NextResponse.json({ error: `konten harus berstatus Approved (sekarang: ${content.status})` }, { status: 409 })
    }

    const { data, error } = await db.from('publications').insert({
      content_id: b.content_id,
      status: 'Package Ready',
      package_path: b.package_path ?? null,
      caption: b.caption ?? null,
      hashtags: b.hashtags ?? null,
      cover_path: b.cover_path ?? null,
      akun: b.akun ?? null,
    }).select().single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    await db.from('contents').update({ status: 'Ready to Publish', updated_at: new Date().toISOString() }).eq('id', b.content_id)
    await db.from('audit_logs').insert({
      actor: 'anton', actor_type: 'agent', action: 'publication.prepare',
      entity: 'publications', entity_id: data.id, after: data,
    })

    return NextResponse.json({ data }, { status: 201 })
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'error' }, { status: 500 })
  }
}

/**
 * PATCH /api/publications
 * Owner mengonfirmasi unggahan manual (URL + akun + waktu).
 * body: { id, status?, url?, akun?, published_at? }
 */
export async function PATCH(req: Request) {
  try {
    const b = await req.json().catch(() => null)
    if (!b?.id) return NextResponse.json({ error: 'id wajib' }, { status: 400 })
    if (b.status && !STATUS.includes(b.status)) {
      return NextResponse.json({ error: 'status tidak valid' }, { status: 400 })
    }

    const db = supabaseAdmin()
    const before = await db.from('publications').select('*').eq('id', b.id).single()
    if (!before.data) return NextResponse.json({ error: 'paket tidak ditemukan' }, { status: 404 })

    const patch: Record<string, unknown> = { updated_at: new Date().toISOString() }
    for (const k of ['status', 'url', 'akun', 'caption', 'hashtags', 'cover_path', 'package_path']) {
      if (k in b) patch[k] = b[k]
    }
    if (b.status === 'Published') {
      patch.published_at = b.published_at ?? new Date().toISOString()
    }

    const upd = await db.from('publications').update(patch).eq('id', b.id).select().single()
    if (upd.error) return NextResponse.json({ error: upd.error.message }, { status: 500 })

    if (b.status === 'Published' && before.data.content_id) {
      await db.from('contents').update({ status: 'Published', updated_at: new Date().toISOString() }).eq('id', before.data.content_id)
    }

    await db.from('audit_logs').insert({
      actor: 'owner', actor_type: 'owner', action: 'publication.update',
      entity: 'publications', entity_id: b.id, before: before.data, after: upd.data,
    })

    return NextResponse.json({ data: upd.data })
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'error' }, { status: 500 })
  }
}
