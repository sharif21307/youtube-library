// supabase/functions/oembed/index.ts
import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS, 'Content-Type': 'application/json' },
  })
}

function extractYouTubeId(url: string): string | null {
  const patterns: RegExp[] = [
    /[?&]v=([a-zA-Z0-9_-]{11})/,
    /youtu\.be\/([a-zA-Z0-9_-]{11})/,
    /\/shorts\/([a-zA-Z0-9_-]{11})/,
    /\/embed\/([a-zA-Z0-9_-]{11})/,
    /\/v\/([a-zA-Z0-9_-]{11})/,
  ]
  for (const pattern of patterns) {
    const m = url.match(pattern)
    if (m) return m[1]
  }
  return null
}

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS })
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405)

  let body: { url?: string } = {}
  try { body = await req.json() } catch { return json({ error: 'Invalid JSON' }, 400) }

  const rawUrl = (body?.url ?? '').trim()
  if (!rawUrl) return json({ error: 'url is required' }, 400)

  const youtubeId = extractYouTubeId(rawUrl)
  if (!youtubeId) return json({ error: 'Invalid YouTube URL' }, 400)

  const canonicalUrl = `https://www.youtube.com/watch?v=${youtubeId}`
  const oembedUrl = `https://www.youtube.com/oembed?format=json&url=${encodeURIComponent(canonicalUrl)}`

  let resp: Response
  try { resp = await fetch(oembedUrl, { headers: { 'User-Agent': 'Mozilla/5.0' } }) }
  catch (err) { return json({ error: String(err) }, 502) }

  if (!resp.ok) return json({ error: `YouTube HTTP ${resp.status}` }, 422)

  let data: Record<string, unknown>
  try { data = await resp.json() } catch { return json({ error: 'Parse error' }, 502) }

  return json({
    title: data.title ?? '',
    channel: data.author_name ?? '',
    thumbnail: `https://img.youtube.com/vi/${youtubeId}/maxresdefault.jpg`,
    youtube_id: youtubeId,
  })
})
