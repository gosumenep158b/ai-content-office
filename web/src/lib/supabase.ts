import { createClient } from '@supabase/supabase-js'

const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
const service = process.env.SUPABASE_SERVICE_ROLE_KEY

// Client browser (RLS aktif)
export const supabase = createClient(url ?? 'http://localhost', anon ?? 'public-anon-key')

// Server-only (API routes) — service role, JANGAN pernah dipakai di client component
export function supabaseAdmin() {
  if (!service) throw new Error('SUPABASE_SERVICE_ROLE_KEY belum diset')
  return createClient(url ?? 'http://localhost', service, { auth: { persistSession: false } })
}
