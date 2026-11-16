const fs = require('fs')
const { createClient } = require('@supabase/supabase-js')

const url = JSON.parse(fs.readFileSync('/tmp/url.json', 'utf8')).value
const key = JSON.parse(fs.readFileSync('/tmp/svc.json', 'utf8')).value
const sb = createClient(url, key, { auth: { persistSession: false } })

async function main() {
  const { error } = await sb.storage.createBucket('videos', { public: true })
  console.log('create:', error ? error.message : 'ok')

  const file = process.argv[2] || '../worker/output/ai-belajar-preview.mp4'
  const path = process.argv[3] || 'ai-belajar/preview-v1.mp4'
  const buf = fs.readFileSync(file)

  const { data, error: e2 } = await sb.storage.from('videos').upload(path, buf, {
    contentType: 'video/mp4',
    upsert: true,
  })
  console.log('upload:', e2 ? e2.message : JSON.stringify(data))

  const { data: pub } = sb.storage.from('videos').getPublicUrl(path)
  console.log('url:', pub.publicUrl)
  fs.writeFileSync('/tmp/published_video_url.txt', pub.publicUrl)
}

main().catch((e) => { console.error('ERR', e.message); process.exit(1) })
