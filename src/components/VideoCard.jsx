import { useState } from 'react'
import { useLang } from '../context/LanguageContext'
import VideoPlayerModal from './VideoPlayerModal'

// ── Channel dot: 6 accent colours, hash-derived ─────────────────────────────
const DOT_COLORS = [
  'rgb(234,179,8)',   // amber/yellow
  'rgb(59,130,246)',  // blue
  'rgb(249,115,22)',  // orange
  'rgb(34,197,94)',   // green
  'rgb(168,85,247)',  // purple
  'rgb(239,68,68)',   // red
]

// ── Domain badge bg/text pairs ───────────────────────────────────────────────
const DOMAIN_PAIRS = [
  { bg: 'rgba(14,165,233,0.12)',  color: 'rgb(2,132,199)' },    // sky-blue
  { bg: 'rgba(239,68,68,0.12)',   color: 'rgb(220,38,38)' },    // red
  { bg: 'rgba(168,85,247,0.12)',  color: 'rgb(147,51,234)' },   // purple
  { bg: 'rgba(34,197,94,0.12)',   color: 'rgb(21,128,60)' },    // green
  { bg: 'rgba(249,115,22,0.12)',  color: 'rgb(194,65,12)' },    // orange
  { bg: 'rgba(234,179,8,0.12)',   color: 'rgb(133,77,14)' },    // amber
]

function strHash(str, arr) {
  if (!str) return arr[0]
  let h = 0
  for (let i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) >>> 0
  return arr[h % arr.length]
}

// ── Thumbnail with fallback ──────────────────────────────────────────────────
function Thumbnail({ src, title }) {
  const [err, setErr] = useState(false)
  if (!src || err) {
    return (
      <div className="w-full h-full flex items-center justify-center"
           style={{ background: 'rgb(240,242,244)' }}>
        <svg className="w-10 h-10" style={{ color: 'rgb(180,186,198)' }}
             fill="currentColor" viewBox="0 0 24 24">
          <path d="M23.495 6.205a3.007 3.007 0 0 0-2.088-2.088c-1.87-.501-9.396-.501-9.396-.501
            s-7.507-.01-9.396.501A3.007 3.007 0 0 0 .527 6.205a31.247 31.247 0 0 0-.522 5.805
            31.247 31.247 0 0 0 .522 5.783 3.007 3.007 0 0 0 2.088 2.088c1.868.502 9.396.502
            9.396.502s7.506 0 9.396-.502a3.007 3.007 0 0 0 2.088-2.088 31.247 31.247 0 0 0
            .5-5.783 31.247 31.247 0 0 0-.5-5.805zM9.609 15.601V8.408l6.264 3.602z"/>
        </svg>
      </div>
    )
  }
  return (
    <img
      src={src}
      alt={title}
      onError={() => setErr(true)}
      className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
    />
  )
}

// ── Main component ───────────────────────────────────────────────────────────
export default function VideoCard({ video, onToggleWatched, onToggleSaved, onDelete }) {
  const { t } = useLang()
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [busy, setBusy] = useState(false)
  const [showPlayer, setShowPlayer] = useState(false)

  const isWatched = video.watch_status === 'watched'
  const isSaved   = !!video.saved_for_later

  const run = async (fn) => {
    if (busy) return
    setBusy(true)
    await fn()
    setBusy(false)
  }

  const handlePlay = () => {
    if (video.youtube_id) {
      setShowPlayer(true)
    } else {
      window.open(video.url, '_blank', 'noopener,noreferrer')
    }
  }

  const tags = Array.isArray(video.tags)
    ? video.tags
    : typeof video.tags === 'string'
      ? video.tags.split(',').map(s => s.trim()).filter(Boolean)
      : []

  const dotColor = strHash(video.channel, DOT_COLORS)
  const dp       = strHash(video.domain,  DOMAIN_PAIRS)

  return (
    <>
      <article
        className={`
          group relative flex flex-col rounded-xl overflow-hidden
          bg-white dark:bg-gray-800
          transition-all duration-200
          hover:-translate-y-0.5 hover:shadow-md
          ${isWatched ? 'opacity-70 hover:opacity-100' : ''}
        `}
        style={{ border: '1px solid rgb(232,234,237)' }}
      >

        {/* ── Thumbnail ── */}
        <div
          className="relative aspect-video w-full overflow-hidden cursor-pointer"
          style={{ background: 'rgb(240,242,244)' }}
          onClick={handlePlay}
          title={t.playVideo}
        >
          <Thumbnail src={video.thumbnail_url} title={video.title} />

          {/* Hover dark overlay */}
          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30
                          transition-colors duration-200 pointer-events-none" />

          {/* Play button — visible on hover */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-200
                            bg-white/95 rounded-full shadow-xl"
                 style={{ padding: '12px' }}>
              <svg className="w-5 h-5 text-gray-900" fill="currentColor" viewBox="0 0 24 24">
                <path d="M8 5v14l11-7z"/>
              </svg>
            </div>
          </div>

          {/* Watched badge */}
          {isWatched && (
            <div className="absolute top-2 start-2 flex items-center gap-1
                            bg-black/60 text-white text-[10px] px-2 py-0.5 rounded-full backdrop-blur-sm">
              <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd"
                  d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                  clipRule="evenodd"/>
              </svg>
              {t.watched}
            </div>
          )}

          {/* Saved indicator */}
          {isSaved && (
            <div className="absolute top-2 end-2" style={{ color: 'rgb(245,158,11)' }}>
              <svg className="w-4 h-4 drop-shadow" fill="currentColor" viewBox="0 0 24 24">
                <path d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z"/>
              </svg>
            </div>
          )}
        </div>

        {/* ── Body ── */}
        <div className="flex flex-col flex-1 gap-1.5"
             style={{ padding: '12px 12px 10px' }}>

          {/* Title */}
          <h3
            className="font-medium line-clamp-2 cursor-pointer
                       dark:text-white
                       hover:text-blue-600 dark:hover:text-blue-400
                       transition-colors duration-150"
            style={{
              fontSize: '14px',
              color: 'rgb(26,28,35)',
              lineHeight: '1.375',
              minHeight: '2.5rem',
            }}
            onClick={handlePlay}
            title={t.playVideo}
          >
            {video.title || '—'}
          </h3>

          {/* Meta row: dot + channel + domain badge */}
          <div className="flex items-center gap-1.5"
               style={{ fontSize: '12px', color: 'rgb(104,111,125)' }}>
            {video.channel && (
              <span className="flex-shrink-0 rounded-full"
                    style={{ width: '6px', height: '6px', background: dotColor }} />
            )}
            {video.channel && (
              <span className="flex-1 truncate dark:text-gray-400">{video.channel}</span>
            )}
            {video.domain && (
              <span
                className="flex-shrink-0 font-medium"
                style={{
                  fontSize: '10px',
                  padding: '2px 6px',
                  borderRadius: '4px',
                  background: dp.bg,
                  color: dp.color,
                }}
              >
                {video.domain}
              </span>
            )}
          </div>

          {/* Tags */}
          {tags.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {tags.slice(0, 4).map(tag => (
                <span
                  key={tag}
                  className="cursor-default hover:bg-blue-50 dark:hover:bg-blue-900/20 hover:text-blue-500 transition-colors"
                  style={{
                    fontSize: '10px',
                    padding: '2px 6px',
                    borderRadius: '6px',
                    background: 'rgb(240,242,244)',
                    color: 'rgb(104,111,125)',
                  }}
                >
                  #{tag}
                </span>
              ))}
              {tags.length > 4 && (
                <span
                  style={{
                    fontSize: '10px',
                    padding: '2px 6px',
                    borderRadius: '6px',
                    background: 'rgb(240,242,244)',
                    color: 'rgb(156,163,175)',
                  }}
                >
                  +{tags.length - 4}
                </span>
              )}
            </div>
          )}

          <div className="flex-1 min-h-0" />

          {/* ── Footer ── */}
          <div
            className="flex items-center pt-2"
            style={{ borderTop: '1px solid rgba(229,231,235,0.5)' }}
          >
            {confirmDelete ? (
              /* Confirm delete row */
              <div className="flex w-full gap-1.5">
                <button
                  onClick={(e) => { e.stopPropagation(); run(onDelete) }}
                  disabled={busy}
                  className="flex-1 text-[11px] font-semibold rounded-md
                             bg-red-600 hover:bg-red-700 text-white
                             transition-colors disabled:opacity-50"
                  style={{ paddingTop: '5px', paddingBottom: '5px' }}
                >
                  {t.confirmDelete}
                </button>
                <button
                  onClick={(e) => { e.stopPropagation(); setConfirmDelete(false) }}
                  className="flex-1 text-[11px] rounded-md
                             border border-gray-200 dark:border-gray-600
                             text-gray-500 dark:text-gray-400
                             hover:bg-gray-50 dark:hover:bg-gray-700
                             transition-colors"
                  style={{ paddingTop: '5px', paddingBottom: '5px' }}
                >
                  {t.cancel}
                </button>
              </div>
            ) : (
              <div className="flex items-center justify-between w-full">

                {/* Delete */}
                <button
                  onClick={(e) => { e.stopPropagation(); setConfirmDelete(true) }}
                  disabled={busy}
                  title={t.deleteVideo}
                  className="flex items-center justify-center
                             hover:bg-red-50 dark:hover:bg-red-900/20 hover:text-red-500
                             transition-colors disabled:opacity-50"
                  style={{
                    width: '32px',
                    height: '32px',
                    borderRadius: '6px',
                    color: 'rgb(104,111,125)',
                  }}
                >
                  <svg className="w-[15px] h-[15px]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75}
                      d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
                  </svg>
                </button>

                {/* Save */}
                <button
                  onClick={(e) => { e.stopPropagation(); run(onToggleSaved) }}
                  disabled={busy}
                  title={isSaved ? t.removeSaved : t.saveForLater}
                  className="flex items-center justify-center transition-colors disabled:opacity-50"
                  style={{
                    width: '32px',
                    height: '32px',
                    borderRadius: '6px',
                    background: isSaved ? 'rgba(245,158,11,0.1)' : 'transparent',
                    color: isSaved ? 'rgb(217,119,6)' : 'rgb(104,111,125)',
                  }}
                >
                  <svg className="w-[15px] h-[15px]"
                       fill={isSaved ? 'currentColor' : 'none'}
                       stroke="currentColor"
                       strokeWidth={isSaved ? 0 : 1.75}
                       viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round"
                      d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z"/>
                  </svg>
                </button>

                {/* Watched */}
                <button
                  onClick={(e) => { e.stopPropagation(); run(onToggleWatched) }}
                  disabled={busy}
                  title={isWatched ? t.markUnwatched : t.markWatched}
                  className="flex items-center justify-center transition-colors disabled:opacity-50"
                  style={{
                    width: '32px',
                    height: '32px',
                    borderRadius: '6px',
                    background: isWatched ? 'rgba(34,197,94,0.1)' : 'transparent',
                    color: isWatched ? 'rgb(21,128,60)' : 'rgb(104,111,125)',
                  }}
                >
                  <svg className="w-[15px] h-[15px]"
                       fill="none"
                       stroke="currentColor"
                       strokeWidth={isWatched ? 2.5 : 1.75}
                       viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7"/>
                  </svg>
                </button>

              </div>
            )}
          </div>

        </div>
      </article>

      {/* ── Video Player Modal ── */}
      {showPlayer && (
        <VideoPlayerModal
          video={video}
          onClose={() => setShowPlayer(false)}
        />
      )}
    </>
  )
}
