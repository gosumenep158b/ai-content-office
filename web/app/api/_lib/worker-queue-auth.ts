import { createHash, timingSafeEqual } from 'node:crypto'
import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

const BOT_TOKEN_ENV: Readonly<Record<string, string>> = {
  davadevis_bot: 'STAF_AI_QUEUE_TOKEN_DAVADEVIS_BOT',
  dika_vm_bot: 'STAF_AI_QUEUE_TOKEN_DIKA_VM_BOT',
  om_muse_bot: 'STAF_AI_QUEUE_TOKEN_OM_MUSE_BOT',
  staf_ai_cue_bot: 'STAF_AI_QUEUE_TOKEN_STAF_AI_CUE_BOT',
}

const RESPONSE_HEADERS = {
  'Cache-Control': 'private, no-store',
  Vary: 'Authorization, Cookie',
}
const REFRESH_COOKIE_MAX_AGE = 7 * 24 * 60 * 60
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

type RefreshedSession = {
  access_token: string
  refresh_token: string
  expires_in?: number
}

export type WorkerQueueAuthorization =
  | { ok: true; kind: 'bot'; bot: string }
  | { ok: true; kind: 'admin'; userId: string; refreshedSession: RefreshedSession | null }
  | { ok: false; response: NextResponse; refreshedSession: RefreshedSession | null }

function response(status: number, error: string): NextResponse {
  return NextResponse.json({ error }, { status, headers: RESPONSE_HEADERS })
}

function failure(status: number, error: string, refreshedSession: RefreshedSession | null = null): WorkerQueueAuthorization {
  return { ok: false, response: response(status, error), refreshedSession }
}

function bearerToken(request: Request): string | null {
  const match = /^Bearer[\t ]+([^\s]+)$/i.exec(request.headers.get('authorization') ?? '')
  return match?.[1] ?? null
}

function tokensMatch(presented: string, expected: string): boolean {
  const presentedDigest = createHash('sha256').update(presented, 'utf8').digest()
  const expectedDigest = createHash('sha256').update(expected, 'utf8').digest()
  return timingSafeEqual(presentedDigest, expectedDigest)
}

function cookie(request: Request, name: string): string | null {
  const header = request.headers.get('cookie') ?? ''
  for (const item of header.split(';')) {
    const separator = item.indexOf('=')
    if (separator < 0 || item.slice(0, separator).trim() !== name) continue
    try {
      return decodeURIComponent(item.slice(separator + 1).trim()) || null
    } catch {
      return null
    }
  }
  return null
}

function isAuthUnavailable(error: unknown): boolean {
  if (typeof error !== 'object' || error === null) return false
  const value = error as { name?: unknown; status?: unknown }
  return value.name === 'AuthRetryableFetchError'
    || value.name === 'FetchError'
    || (typeof value.status === 'number' && value.status >= 500)
}

function adminUserIds(): Set<string> {
  const raw = process.env.STAF_AI_ADMIN_USER_IDS ?? ''
  return new Set(raw.split(',').map((id) => id.trim().toLowerCase()).filter((id) => UUID_RE.test(id)))
}

async function authorizeAdmin(request: Request): Promise<WorkerQueueAuthorization> {
  const allowedIds = adminUserIds()
  if (allowedIds.size === 0) return failure(503, 'admin authentication unavailable')

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!url || !anonKey) return failure(503, 'admin authentication unavailable')

  const accessToken = cookie(request, 'sb-access-token')
  const refreshToken = cookie(request, 'sb-refresh-token')
  if (!accessToken && !refreshToken) return failure(401, 'unauthorized')

  try {
    const authClient = createClient(url, anonKey, {
      auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false },
    })

    let user = null
    let refreshedSession: RefreshedSession | null = null

    if (accessToken) {
      const { data, error } = await authClient.auth.getUser(accessToken)
      if (!error && data.user) user = data.user
      else if (isAuthUnavailable(error)) return failure(503, 'authentication unavailable')
    }

    if (!user && refreshToken) {
      const { data, error } = await authClient.auth.refreshSession({ refresh_token: refreshToken })
      if (error) return failure(isAuthUnavailable(error) ? 503 : 401, isAuthUnavailable(error) ? 'authentication unavailable' : 'unauthorized')
      if (!data.user || !data.session?.access_token || !data.session.refresh_token) {
        return failure(401, 'unauthorized')
      }
      user = data.user
      refreshedSession = {
        access_token: data.session.access_token,
        refresh_token: data.session.refresh_token,
        expires_in: data.session.expires_in,
      }
    }

    if (!user) return failure(401, 'unauthorized')
    if (!UUID_RE.test(user.id) || !allowedIds.has(user.id.toLowerCase())) {
      return failure(403, 'forbidden', refreshedSession)
    }

    return { ok: true, kind: 'admin', userId: user.id, refreshedSession }
  } catch {
    return failure(503, 'authentication unavailable')
  }
}

/**
 * Bot requests must name an explicitly configured bot and present that bot's
 * dedicated bearer token. Requests without `bot` are reserved for an allowlisted
 * Supabase Auth user; bot credentials never authorize the aggregate summary.
 */
export async function authorizeWorkerQueueRequest(request: Request, bot: string | null): Promise<WorkerQueueAuthorization> {
  if (bot === null) return authorizeAdmin(request)

  const envName = BOT_TOKEN_ENV[bot]
  if (!envName) return failure(404, 'bot not found')

  const expected = process.env[envName]?.trim()
  if (!expected) return failure(503, 'bot authentication unavailable')

  const presented = bearerToken(request)
  if (!presented || !tokensMatch(presented, expected)) return failure(401, 'unauthorized')

  return { ok: true, kind: 'bot', bot }
}

/** Apply no-store headers to authorized responses and rotate a refreshed admin session. */
export function finalizeWorkerQueueResponse(
  result: WorkerQueueAuthorization,
  responseToSend: NextResponse = result.ok ? NextResponse.json({ error: 'internal server error' }, { status: 500 }) : result.response,
): NextResponse {
  responseToSend.headers.set('Cache-Control', RESPONSE_HEADERS['Cache-Control'])
  responseToSend.headers.set('Vary', RESPONSE_HEADERS.Vary)

  const refreshedSession = result.ok
    ? result.kind === 'admin' ? result.refreshedSession : null
    : result.refreshedSession
  if (!refreshedSession) return responseToSend

  const cookieOptions = {
    httpOnly: true,
    sameSite: 'lax' as const,
    path: '/',
    secure: process.env.NODE_ENV === 'production',
  }
  responseToSend.cookies.set('sb-access-token', refreshedSession.access_token, {
    ...cookieOptions,
    maxAge: Math.max(1, Math.floor(refreshedSession.expires_in ?? 3600)),
  })
  responseToSend.cookies.set('sb-refresh-token', refreshedSession.refresh_token, {
    ...cookieOptions,
    maxAge: REFRESH_COOKIE_MAX_AGE,
  })
  return responseToSend
}
