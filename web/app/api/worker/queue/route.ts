import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { AGENT_OWNER, agentsOfBot } from '@/lib/agent-owner'
import {
  authorizeWorkerQueueRequest,
  finalizeWorkerQueueResponse,
  type WorkerQueueAuthorization,
} from '../../_lib/worker-queue-auth'

export const dynamic = 'force-dynamic'

const AKTIF = ['Assigned', 'In Progress', 'Waiting Input', 'Revision']
const PRIVATE_HEADERS = { 'Cache-Control': 'private, no-store', Vary: 'Authorization, Cookie' }

function privateResponse(response: NextResponse): NextResponse {
  response.headers.set('Cache-Control', PRIVATE_HEADERS['Cache-Control'])
  response.headers.set('Vary', PRIVATE_HEADERS.Vary)
  return response
}

/**
 * GET /api/worker/queue?bot=<bot_owner>
 * Bot requests require their dedicated bearer credential and explicit identity.
 * Without `bot`, only a verified UID in STAF_AI_ADMIN_USER_IDS may view the summary.
 */
export async function GET(req: Request) {
  let authorization: WorkerQueueAuthorization | null = null
  try {
    const { searchParams } = new URL(req.url)
    const botParams = searchParams.getAll('bot')
    if (botParams.length > 1) {
      return privateResponse(NextResponse.json({ error: 'bot parameter must appear once' }, { status: 400 }))
    }
    const bot = botParams.length === 0 ? null : botParams[0].trim()
    if (botParams.length === 1 && !bot) {
      return privateResponse(NextResponse.json({ error: 'bot parameter is required when supplied' }, { status: 400 }))
    }

    authorization = await authorizeWorkerQueueRequest(req, bot)
    if (!authorization.ok) return finalizeWorkerQueueResponse(authorization, authorization.response)

    const db = supabaseAdmin()
    const { data: agents, error: eA } = await db.from('agents').select('*')
    if (eA) return finalizeWorkerQueueResponse(authorization, NextResponse.json({ error: eA.message }, { status: 500 }))

    // pemilik: kolom DB bila ada, selain itu fallback statis
    const ownerOf = (a: any) => a.bot_owner || AGENT_OWNER[(a.nama || '').toLowerCase()] || null
    const botList = Array.from(new Set((agents ?? []).map(ownerOf).filter(Boolean))) as string[]

    if (!bot) {
      const { data: tasks } = await db.from('tasks').select('id,status,assigned_agent_id')
      const ringkasan = botList.map((b) => {
        const namaAgent = (agents ?? []).filter((a: any) => ownerOf(a) === b).map((a: any) => a.nama)
        const ids = (agents ?? []).filter((a: any) => ownerOf(a) === b).map((a: any) => a.id)
        const milik = (tasks ?? []).filter((t: any) => ids.includes(t.assigned_agent_id))
        return {
          bot: b,
          agents: namaAgent,
          jumlah_task: milik.length,
          aktif: milik.filter((t: any) => AKTIF.includes(t.status)).length,
          selesai: milik.filter((t: any) => t.status === 'Completed').length,
        }
      })
      return finalizeWorkerQueueResponse(authorization, NextResponse.json({ data: ringkasan }))
    }

    // antrean untuk satu bot
    const namaDiBot = (agents ?? [])
      .filter((a: any) => ownerOf(a) === bot)
      .map((a: any) => a.nama)

    const fallback = agentsOfBot(bot)
    const targetNama = namaDiBot.length ? namaDiBot : fallback
    if (!targetNama.length) {
      return finalizeWorkerQueueResponse(authorization, NextResponse.json({ error: `bot '${bot}' tidak punya agent terdaftar` }, { status: 404 }))
    }

    const agentRows = (agents ?? []).filter((a: any) => targetNama.includes(a.nama))
    const ids = agentRows.map((a: any) => a.id)

    const { data: tasks, error: eT } = await db
      .from('tasks')
      .select('*')
      .in('assigned_agent_id', ids)
      .in('status', AKTIF)
      .order('created_at', { ascending: true })
      .limit(50)

    if (eT) return finalizeWorkerQueueResponse(authorization, NextResponse.json({ error: eT.message }, { status: 500 }))

    // prompt terbaru per agent
    const prompts: Record<string, string> = {}
    for (const a of agentRows) {
      const { data: p } = await db
        .from('agent_prompts')
        .select('prompt,version')
        .eq('agent_id', a.id)
        .order('version', { ascending: false })
        .limit(1)
        .maybeSingle()
      if (p?.prompt) prompts[a.nama] = p.prompt
    }

    return finalizeWorkerQueueResponse(authorization, NextResponse.json({
      data: {
        bot,
        agents: agentRows.map((a: any) => ({
          id: a.id, nama: a.nama, role: a.role,
          prompt: prompts[a.nama] ?? null,
        })),
        tugas: tasks ?? [],
      },
    }))
  } catch (err) {
    const errorResponse = NextResponse.json(
      { error: err instanceof Error ? err.message : 'kesalahan server' },
      { status: 500, headers: PRIVATE_HEADERS },
    )
    return authorization ? finalizeWorkerQueueResponse(authorization, errorResponse) : errorResponse
  }
}
