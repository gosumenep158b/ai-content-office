import assert from 'node:assert/strict'
import { after, before, test } from 'node:test'
import { createServer } from 'node:http'
import { readFileSync } from 'node:fs'
import { Module } from 'node:module'
import { dirname, resolve } from 'node:path'
import ts from 'typescript'

const helperPath = resolve(import.meta.dirname, '../app/api/_lib/worker-queue-auth.ts')
const helperSource = readFileSync(helperPath, 'utf8')
const compiledHelper = ts.transpileModule(helperSource, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true },
}).outputText
const helperModule = new Module(helperPath)
helperModule.filename = helperPath
helperModule.paths = Module._nodeModulePaths(dirname(helperPath))
helperModule._compile(compiledHelper, helperPath)
const { authorizeWorkerQueueRequest } = helperModule.exports

const adminId = 'a985882a-6118-4eb9-9bc1-4449175f1c48'
const memberId = 'e723f19c-23b9-4f20-931a-4bfbe9842a21'
const bots = [
  { name: 'davadevis_bot', env: 'STAF_AI_QUEUE_TOKEN_DAVADEVIS_BOT', token: 'test-davadevis-only-token' },
  { name: 'dika_vm_bot', env: 'STAF_AI_QUEUE_TOKEN_DIKA_VM_BOT', token: 'test-dika-vm-only-token' },
  { name: 'om_muse_bot', env: 'STAF_AI_QUEUE_TOKEN_OM_MUSE_BOT', token: 'test-om-muse-only-token' },
]
const envKeys = [
  'STAF_AI_QUEUE_TOKEN_DAVADEVIS_BOT',
  'STAF_AI_QUEUE_TOKEN_DIKA_VM_BOT',
  'STAF_AI_QUEUE_TOKEN_OM_MUSE_BOT',
  'STAF_AI_ADMIN_USER_IDS',
  'NEXT_PUBLIC_SUPABASE_URL',
  'NEXT_PUBLIC_SUPABASE_ANON_KEY',
]
const originalEnv = new Map(envKeys.map((key) => [key, process.env[key]]))
let authMode = 'normal'
let authServer
let authBaseUrl

function request({ bot, bearer, cookie } = {}) {
  const url = new URL('http://localhost/api/worker/queue')
  if (bot !== undefined) url.searchParams.set('bot', bot)
  const headers = {}
  if (bearer !== undefined) headers.authorization = `Bearer ${bearer}`
  if (cookie !== undefined) headers.cookie = cookie
  return new Request(url, { headers })
}

async function withEnv(values, operation) {
  const previous = new Map(Object.entries(values).map(([key]) => [key, process.env[key]]))
  for (const [key, value] of Object.entries(values)) {
    if (value === undefined) delete process.env[key]
    else process.env[key] = value
  }
  try { return await operation() }
  finally {
    for (const [key, value] of previous) {
      if (value === undefined) delete process.env[key]
      else process.env[key] = value
    }
  }
}

before(async () => {
  for (const bot of bots) process.env[bot.env] = bot.token
  process.env.STAF_AI_ADMIN_USER_IDS = `${adminId}`
  authServer = createServer((req, res) => {
    res.setHeader('content-type', 'application/json')
    if (authMode === 'unavailable') {
      res.writeHead(503); return res.end(JSON.stringify({ message: 'temporary unavailable' }))
    }
    if (req.url?.startsWith('/auth/v1/user')) {
      const token = req.headers.authorization
      const id = token === 'Bearer admin-access' ? adminId : token === 'Bearer member-access' ? memberId : null
      if (!id) {
        res.writeHead(401); return res.end(JSON.stringify({ message: 'invalid token', statusCode: 401 }))
      }
      res.writeHead(200)
      return res.end(JSON.stringify({ id, aud: 'authenticated', role: 'authenticated', email: 'test@example.invalid', app_metadata: {}, user_metadata: {}, created_at: '2026-01-01T00:00:00.000Z' }))
    }
    res.writeHead(404); res.end(JSON.stringify({ message: 'not found' }))
  })
  await new Promise((resolve) => authServer.listen(0, '127.0.0.1', resolve))
  authBaseUrl = `http://127.0.0.1:${authServer.address().port}`
  process.env.NEXT_PUBLIC_SUPABASE_URL = authBaseUrl
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'local-test-anon-key'
})

after(async () => {
  if (authServer?.listening) await new Promise((resolve) => authServer.close(resolve))
  for (const [key, value] of originalEnv) {
    if (value === undefined) delete process.env[key]
    else process.env[key] = value
  }
})

for (const bot of bots) {
  test(`accepts only the dedicated token for ${bot.name}`, async () => {
    const result = await authorizeWorkerQueueRequest(request({ bot: bot.name, bearer: bot.token }), bot.name)
    assert.equal(result.ok, true)
    assert.equal(result.kind, 'bot')
    assert.equal(result.bot, bot.name)
  })
}

test('rejects missing and incorrect bot bearer credentials', async () => {
  const missing = await authorizeWorkerQueueRequest(request({ bot: bots[0].name }), bots[0].name)
  const wrong = await authorizeWorkerQueueRequest(request({ bot: bots[0].name, bearer: 'wrong-token' }), bots[0].name)
  assert.equal(missing.ok, false); assert.equal(missing.response.status, 401)
  assert.equal(wrong.ok, false); assert.equal(wrong.response.status, 401)
})

test('does not accept a token belonging to a different bot', async () => {
  for (const expected of bots) {
    for (const supplied of bots) {
      if (expected === supplied) continue
      const result = await authorizeWorkerQueueRequest(request({ bot: expected.name, bearer: supplied.token }), expected.name)
      assert.equal(result.ok, false, `${supplied.name} token must not authorize ${expected.name}`)
      assert.equal(result.response.status, 401)
    }
  }
})

test('fails closed when a bot token is not configured or the bot identity is unknown', async () => {
  const unconfigured = await withEnv({ STAF_AI_QUEUE_TOKEN_OM_MUSE_BOT: undefined }, () =>
    authorizeWorkerQueueRequest(request({ bot: 'om_muse_bot', bearer: 'any-token' }), 'om_muse_bot'))
  const unknown = await authorizeWorkerQueueRequest(request({ bot: 'unmapped_bot', bearer: 'any-token' }), 'unmapped_bot')
  assert.equal(unconfigured.ok, false); assert.equal(unconfigured.response.status, 503)
  assert.equal(unknown.ok, false); assert.equal(unknown.response.status, 404)
})

test('requires an explicit bot identity for bot credentials', async () => {
  const result = await authorizeWorkerQueueRequest(request({ bearer: bots[0].token }), null)
  assert.equal(result.ok, false)
  assert.equal(result.response.status, 401)
})

test('allows aggregate summary only to a verified UID in the admin allowlist', async () => {
  const allowed = await authorizeWorkerQueueRequest(request({ cookie: 'sb-access-token=admin-access' }), null)
  const ordinaryUser = await authorizeWorkerQueueRequest(request({ cookie: 'sb-access-token=member-access' }), null)
  assert.equal(allowed.ok, true)
  assert.equal(allowed.kind, 'admin')
  assert.equal(allowed.userId, adminId)
  assert.equal(ordinaryUser.ok, false)
  assert.equal(ordinaryUser.response.status, 403)
})

test('rejects the aggregate summary without a verified session or admin allowlist', async () => {
  const missingSession = await authorizeWorkerQueueRequest(request(), null)
  const invalidSession = await authorizeWorkerQueueRequest(request({ cookie: 'sb-access-token=bad-access' }), null)
  const noAllowlist = await withEnv({ STAF_AI_ADMIN_USER_IDS: undefined }, () =>
    authorizeWorkerQueueRequest(request({ cookie: 'sb-access-token=admin-access' }), null))
  const invalidAllowlist = await withEnv({ STAF_AI_ADMIN_USER_IDS: 'not-a-uuid' }, () =>
    authorizeWorkerQueueRequest(request({ cookie: 'sb-access-token=admin-access' }), null))
  assert.equal(missingSession.ok, false); assert.equal(missingSession.response.status, 401)
  assert.equal(invalidSession.ok, false); assert.equal(invalidSession.response.status, 401)
  assert.equal(noAllowlist.ok, false); assert.equal(noAllowlist.response.status, 503)
  assert.equal(invalidAllowlist.ok, false); assert.equal(invalidAllowlist.response.status, 503)
})

test('returns unavailable rather than trusting a session when Supabase Auth is down', async () => {
  authMode = 'unavailable'
  try {
    const result = await authorizeWorkerQueueRequest(request({ cookie: 'sb-access-token=admin-access' }), null)
    assert.equal(result.ok, false)
    assert.equal(result.response.status, 503)
  } finally {
    authMode = 'normal'
  }
})
