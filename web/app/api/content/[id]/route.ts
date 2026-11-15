import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const db = supabaseAdmin()
  const { data: before } = await db.from('contents').select('*').eq('id', id).single()
  if (!before) return NextResponse.json({ error: 'tidak ditemukan' }, { status: 404 })

  // hapus storyboards & scripts terlebih dahulu
  await db.from('storyboards').delete().eq('content_id', id)
  await db.from('content_scripts').delete().eq('content_id', id)
  const { error } = await db.from('contents').delete().eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  await db.from('audit_logs').insert({
    actor: 'owner', actor_type: 'owner', action: 'content.delete',
    entity: 'contents', entity_id: id, before,
  })
  return NextResponse.json({ ok: true })
}
