/**
 * Pemetaan agent -> bot pemilik (fallback bila kolom DB agents.bot_owner kosong).
 *
 * Pembagian kerja:
 *   davadevis_bot  : dika (Manager/Orkestrator), kinan (Research)
 *   dika_vm_bot    : dava (Content Strategist), yanti (Video Producer)
 *   om_muse_bot    : anton (Publisher)
 */
export const AGENT_OWNER: Record<string, string> = {
  dika: 'davadevis_bot',
  kinan: 'davadevis_bot',
  dava: 'dika_vm_bot',
  yanti: 'staf_ai_cue_bot',
  anton: 'om_muse_bot',
}

export const OWNER_LABEL: Record<string, string> = {
  davadevis_bot: 'Dika & Kinan — otak (orkestrasi + riset)',
  dika_vm_bot: 'Dava — naskah lanjutan',
  staf_ai_cue_bot: 'Yanti — produksi video',
  om_muse_bot: 'Anton — paket unggah & publikasi',
}

/** Daftar agent milik satu bot. */
export function agentsOfBot(bot: string): string[] {
  return Object.entries(AGENT_OWNER)
    .filter(([, owner]) => owner === bot)
    .map(([nama]) => nama)
}

/** Bot pemilik sebuah agent (fallback statis). */
export function botOfAgent(nama: string): string | null {
  return AGENT_OWNER[(nama ?? '').toLowerCase()] ?? null
}
