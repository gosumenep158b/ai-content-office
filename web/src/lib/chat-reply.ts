import { supabaseAdmin } from '@/lib/supabase'

/**
 * Pembuat balasan otomatis untuk chat worker.
 *
 * Alur:
 *  1. Bila pesan menyebut nama agent (mis. "dika", "yanti") -> bot pemilik agent itu menjawab.
 *  2. Bila DM -> bot lawan bicara menjawab.
 *  3. Bila grup tanpa sebutan -> koordinator (davadevis_bot) memberi ringkasan status.
 *
 * Bila env LLM tersedia (CHAT_LLM_API_KEY + CHAT_LLM_BASE_URL + CHAT_LLM_MODEL),
 * balasan dibuat oleh model memakai system prompt agent. Bila tidak ada,
 * dipakai ringkasan deterministik dari database (tetap informatif, tanpa mengarang).
 */

const AGENT_KE_BOT: Record<string, string> = {
  dika: 'davadevis_bot',
  kinan: 'davadevis_bot',
  dava: 'dika_vm_bot',
  yanti: 'dika_vm_bot',
  anton: 'om_muse_bot',
}

const NAMA_BOT: Record<string, string> = {
  davadevis_bot: 'davadevis',
  dika_vm_bot: 'dika_vm',
  om_muse_bot: 'om_muse',
}

const PERAN: Record<string, string> = {
  davadevis_bot: 'Dika & Kinan — orkestrasi & riset',
  dika_vm_bot: 'Dava & Yanti — naskah & video',
  om_muse_bot: 'Anton — paket unggah & publikasi',
}

const DITERIMA = ['Backlog', 'Assigned', 'In Progress', 'Waiting Input', 'Revision']
const SELESAI = ['Completed', 'Cancelled']

/** Ringkasan status nyata dari database untuk satu bot. */
async function ringkasanBot(db: any, bot: string): Promise<string> {
  const { data: agents } = await db.from('agents').select('id,nama')
  const { data: tasks } = await db.from('tasks').select('id,title,status,assigned_agent_id')

  const milikBot = (agents ?? []).filter((a: any) => (AGENT_KE_BOT[a.nama] ?? null) === bot)
  const ids = milikBot.map((a: any) => a.id)
  const tugas = (tasks ?? []).filter((t: any) => ids.includes(t.assigned_agent_id))

  const berjalan = tugas.filter((t: any) => DITERIMA.includes(t.status))
  const selesai = tugas.filter((t: any) => SELESAI.includes(t.status))
  const teratas = berjalan.slice(0, 2).map((t: any) => `"${t.title}"`).join(' dan ')

  const bagian = [`${PERAN[bot]}`, `${tugas.length} tugas · ${berjalan.length} berjalan · ${selesai.length} selesai`]
  if (teratas) bagian.push(`sedang dikerjakan: ${teratas}`)
  return bagian.join(' — ')
}

/** Balasan bila ada LLM; null bila tidak dikonfigurasi. */
async function balasanLLM(bot: string, prompt: string, pesan: string, ringkasan: string): Promise<string | null> {
  const key = process.env.CHAT_LLM_API_KEY
  const base = process.env.CHAT_LLM_BASE_URL
  const model = process.env.CHAT_LLM_MODEL
  if (!key || !base || !model) return null

  try {
    const r = await fetch(`${base.replace(/\/$/, '')}/chat/completions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
      body: JSON.stringify({
        model,
        temperature: 0.6,
        max_tokens: 220,
        messages: [
          { role: 'system', content: `${prompt}\n\nKamu adalah bot ${NAMA_BOT[bot]}. Balas singkat (maks 3 kalimat) dalam Bahasa Indonesia, seperti rekan kerja di grup kantor. Status kerja saat ini: ${ringkasan}` },
          { role: 'user', content: pesan },
        ],
      }),
    })
    if (!r.ok) return null
    const j = await r.json()
    const teks = j?.choices?.[0]?.message?.content?.trim()
    return teks ? teks.slice(0, 1200) : null
  } catch {
    return null
  }
}

/**
 * Tentukan bot yang menjawab + isi balasannya.
 */
export async function bangunBalasan(args: {
  room: string
  sender: string
  body: string
}): Promise<{ bot: string; teks: string } | null> {
  const { room, sender, body } = args
  const db = supabaseAdmin()
  const teks = body.toLowerCase()

  // DM: lawan bicara yang menjawab
  let calon: string | null = null
  if (room.startsWith('dm:')) {
    calon = room.split(':').find((x) => x !== 'dm' && x !== sender) ?? null
  } else {
    // sebutan agent di grup
    const disebut = Object.keys(AGENT_KE_BOT).find((a) => new RegExp(`(^|[^a-z])${a}([^a-z]|$)`).test(teks))
    if (disebut) calon = AGENT_KE_BOT[disebut]
    else calon = 'davadevis_bot' // koordinator menjawab default
  }

  if (!calon) return null

  // jangan menjawab diri sendiri — alihkan ke bot lain
  if (calon === sender) {
    calon = sender === 'davadevis_bot' ? 'om_muse_bot' : 'davadevis_bot'
  }

  // prompt agent (bila ada)
  let prompt = ''
  try {
    const { data: agents } = await db.from('agents').select('id,nama').eq('nama', (Object.keys(AGENT_KE_BOT).find((k) => AGENT_KE_BOT[k] === calon) ?? '').toLowerCase())
    const agentId = (agents ?? [])[0]?.id
    if (agentId) {
      const { data: p } = await db.from('agent_prompts').select('prompt').eq('agent_id', agentId).order('version', { ascending: false }).limit(1).maybeSingle()
      if (p?.prompt) prompt = p.prompt
    }
  } catch { /* abaikan */ }

  const ringkasan = await ringkasanBot(db, calon)
  const llm = await balasanLLM(calon, prompt, body, ringkasan)
  if (llm) return { bot: calon, teks: llm }

  // deterministik
  const sapaan = room === 'kantor' ? 'Siap.' : 'Halo.'
  return { bot: calon, teks: `${sapaan} ${ringkasan}.` }
}