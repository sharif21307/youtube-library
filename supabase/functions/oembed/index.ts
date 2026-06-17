// supabase/functions/oembed/index.ts
// Server-side YouTube oEmbed proxy — no API key, no cost.
// Avoids browser CORS restrictions on youtube.com/oembed.

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'

// ── CORS headers ────────────────────────────────────────────────────────────
const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

// ── Helpers ──────────────────────────────────────────────────────────────────
function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS, 'Content-Type': 'application/json' },
  })
}

/**
 * Extract YouTube video ID from any common URL format:
 *   https://www.youtube.com/watch?v=XXXXXXXXXXX
 *   https://youtu.be/XXXXXXXXXXX
 *   https://www.youtube.com/shorts/XXXXXXXXXXX
 *   https://www.youtube.com/embed/XXXXXXXXXXX
 *   https://www.youtube.com/v/XXXXXXXXXXX
 */
function extractYouTubeId(url: string): string | null {
  const patterns: RegExp[] = [
    /[?&]v=([a-zA-Z0-9_-]{11})/,           // watch?v=
    /youtu\.be\/([a-zA-Z0-9_-]{11})/,       // youtu.be/
    /\/shorts\/([a-zA-Z0-9_-]{11})/,        // /shorts/
    /\/embed\/([a-zA-Z0-9_-]{11})/,         // /embed/
    /\/v\/([a-zA-Z0-9_-]{11})/,             // /v/
  ]
  for (const pattern of patterns) {
    const m = url.match(pattern)
    if (m) return m[1]
  }
  return null
}

// ── Main handler ─────────────────────────────────────────────────────────────
serve(async (req: Request) => {
  // Preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: CORS })
  }

  if (req.method !== 'POST') {
    return json({ error: 'Method not allowed' }, 405)
  }

  let body: { url?: string } = {}
  try {
    body = await req.json()
  } catch {
    return json({ error: 'Invalid JSON body' }, 400)
  }

  const rawUrl = (body?.url ?? '').trim()
  if (!rawUrl) {
    return json({ error: 'url is required' }, 400)
  }

  // Extract YouTube ID
  const youtubeId = extractYouTubeId(rawUrl)
  if (!youtubeId) {
    return json({ error: 'Invalid YouTube URL — could not extract video ID' }, 400)
  }

  // Build canonical URL for oEmbed
  const canonicalUrl = `https://www.youtube.com/watch?v=${youtubeId}`
  const oembedEndpoint =
    `https://www.youtube.com/oembed?format=json&url=${encodeURIComponent(canonicalUrl)}`

  let oembedResp: Response
  try {
    oembedResp = await fetch(oembedEndpoint, {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; VideoLibrary/1.0)' },
    })
  } catch (err) {
    return json({ error: `Network error reaching YouTube: ${String(err)}` }, 502)
  }

  if (!oembedResp.ok) {
    const msg =
      oembedResp.status === 401 ? 'Video is private or embedding is disabled' :
      oembedResp.status === 404 ? 'Video not found' :
      `YouTube oEmbed returned HTTP ${oembedResp.status}`
    return json({ error: msg }, 422)
  }

  let oembed: Record<string, unknown>
  try {
    oembed = await oembedResp.json()
  } catch {
    return json({ error: 'Failed to parse YouTube oEmbed response' }, 502)
  }

  // Prefer maxresdefault; oEmbed thumbnail_url is a low-res fallback
  const thumbnail = `https://img.youtube.com/vi/${youtubeId}/maxresdefault.jpg`

  return json({
    title:      oembed.title       ?? '',
    channel:    oembed.author_name ?? '',
    thumbnail,
    youtube_id: youtubeId,
  })
})
