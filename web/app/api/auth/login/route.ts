import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function POST(req: Request) {
  const { email, password } = await req.json().catch(() => ({}) as any)
  if (!email || !password) return NextResponse.json({ error: 'email & password wajib' }, { status: 400 })
  const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)
  const { data, error } = await db.auth.signInWithPassword({ email, password })
  if (error) return NextResponse.json({ error: error.message }, { status: 401 })
  const res = NextResponse.json({ user: data.user })
  res.cookies.set('sb-access-token', data.session!.access_token, { httpOnly: true, sameSite: 'lax', maxAge: 60 * 60 * 24 * 7, path: '/' })
  res.cookies.set('sb-refresh-token', data.session!.refresh_token, { httpOnly: true, sameSite: 'lax', maxAge: 60 * 60 * 24 * 7, path: '/' })
  return res
}
