import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function GET(req: Request) {
  const cookie = req.headers.get('cookie') ?? ''
  const token = cookie.split(';').map(s => s.trim()).find(s => s.startsWith('sb-access-token='))?.split('=')[1]
  if (!token) return NextResponse.json({ user: null }, { status: 401 })
  const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)
  const { data, error } = await db.auth.getUser(token)
  if (error) return NextResponse.json({ user: null }, { status: 401 })
  return NextResponse.json({ user: data.user })
}
