import { supabaseAdmin } from '@/lib/supabase'

export type AgentMessage = {
  id: string
  from: string
  to: string
  type: string
  payload: any
  created_at: string
}

export function upsertAgent(agentId: string, capabilities: string[] = [], status = 'idle') {
  return supabaseAdmin().from('agent_registry').upsert({
    agent_id: agentId,
    capabilities: capabilities.slice(0, 30),
    status,
    progress: 0,
    message: null,
    last_seen_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }, { onConflict: 'agent_id' })
}

export function setAgentStatus(agentId: string, status: string, message: string | null, progress: number | null) {
  const patch: Record<string, unknown> = {
    status,
    last_seen_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }
  if (message !== undefined) patch.message = message
  if (progress !== undefined && progress !== null) patch.progress = progress
  return supabaseAdmin().from('agent_registry').update(patch).eq('agent_id', agentId).select().single()
}

export function listAgents() {
  return supabaseAdmin().from('agent_registry').select('*')
    .order('last_seen_at', { ascending: false })
}

export function insertMessage(from: string, to: string, type: string, payload: any) {
  return supabaseAdmin().from('agent_messages').insert({
    task_id: null,
    sender: from,
    receiver: to,
    payload: { kind: 'agentchat', to, type, body: payload },
  }).select().single()
}

export function messagesFor(agentId: string, after?: string | null) {
  let q = supabaseAdmin().from('agent_messages')
    .select('*')
    .eq('payload->>kind', 'agentchat')
    .or(`payload->>to.eq.${agentId},payload->>to.eq.all`)
    .order('created_at', { ascending: true })
    .limit(200)
  if (after) q = q.gt('created_at', after)
  return q
}

export function toClientMessage(row: any): AgentMessage {
  const p = row?.payload ?? {}
  return {
    id: row.id,
    from: row.sender,
    to: p.to ?? 'all',
    type: p.type ?? 'broadcast',
    payload: p.body ?? {},
    created_at: row.created_at,
  }
}
