import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useLang } from '../context/LanguageContext'

const TABS = ['notes', 'prompts', 'links']

function TabButton({ id, activeTab, label, onClick }) {
  const active = activeTab === id
  return (
    <button
      onClick={() => onClick(id)}
      className={`
        relative py-3 px-4 text-sm font-medium transition-colors shrink-0
        ${active ? 'text-primary-400' : 'text-gray-400 hover:text-gray-200'}
      `}
    >
      {label}
      {active && (
        <span className="absolute bottom-0 start-0 end-0 h-0.5 bg-primary-500 rounded-t-full" />
      )}
    </button>
  )
}

function RemoveBtn({ onClick }) {
  return (
    <button
      onClick={onClick}
      className="p-1.5 rounded-lg text-gray-600 hover:text-red-400 hover:bg-red-900/20 transition-colors shrink-0"
    >
      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12"/>
      </svg>
    </button>
  )
}

// Safely coerce a jsonb value to a non-null array
function toArr(raw) {
  return Array.isArray(raw) ? raw : []
}

export default function VideoPlayerModal({ video, onClose }) {
  const { t } = useLang()

  const [activeTab, setActiveTab] = useState('notes')

  // Notes
  const [notes, setNotes]             = useState('')
  const [notesDirty, setNotesDirty]   = useState(false)
  const [notesSaving, setNotesSaving] = useState(false)
  const [notesSaved, setNotesSaved]   = useState(false)

  // Prompts — each item: { text: string, createdAt: string }
  const [prompts, setPrompts]       = useState([])
  const [newPrompt, setNewPrompt]   = useState('')
  const [copiedIdx, setCopiedIdx]   = useState(null)

  // Links — each item: { url: string, label: string, createdAt: string }
  const [links, setLinks]           = useState([])
  const [newLinkUrl, setNewLinkUrl]   = useState('')
  const [newLinkLabel, setNewLinkLabel] = useState('')

  // Fetch fresh data (select * so any column set works regardless of migration state)
  useEffect(() => {
    async function load() {
      const { data } = await supabase
        .from('videos')
        .select('*')
        .eq('id', video.id)
        .single()
      if (data) {
        setNotes(data.notes ?? '')
        setPrompts(toArr(data.prompts))
        setLinks(toArr(data.links))
      }
    }
    load()
  }, [video.id])

  // Escape key
  useEffect(() => {
    const h = (e) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [onClose])

  // Lock body scroll
  useEffect(() => {
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = '' }
  }, [])

  // ── Notes ──────────────────────────────────────────────────────────────────
  const handleSaveNotes = async () => {
    setNotesSaving(true)
    await supabase.from('videos').update({ notes: notes || null }).eq('id', video.id)
    setNotesSaving(false)
    setNotesDirty(false)
    setNotesSaved(true)
    setTimeout(() => setNotesSaved(false), 2000)
  }

  // ── Prompts ────────────────────────────────────────────────────────────────
  const handleAddPrompt = async () => {
    const text = newPrompt.trim()
    if (!text) return
    const entry = { text, createdAt: new Date().toISOString() }
    const next = [...prompts, entry]
    setPrompts(next)
    setNewPrompt('')
    await supabase.from('videos').update({ prompts: next }).eq('id', video.id)
  }

  const handleRemovePrompt = async (idx) => {
    const next = prompts.filter((_, i) => i !== idx)
    setPrompts(next)
    await supabase.from('videos').update({ prompts: next.length ? next : null }).eq('id', video.id)
  }

  const handleCopyPrompt = (idx) => {
    navigator.clipboard.writeText(prompts[idx].text).then(() => {
      setCopiedIdx(idx)
      setTimeout(() => setCopiedIdx(null), 2000)
    })
  }

  // ── Links ──────────────────────────────────────────────────────────────────
  const handleAddLink = async () => {
    const url = newLinkUrl.trim()
    if (!url) return
    const entry = { url, label: newLinkLabel.trim() || url, createdAt: new Date().toISOString() }
    const next = [...links, entry]
    setLinks(next)
    setNewLinkUrl('')
    setNewLinkLabel('')
    await supabase.from('videos').update({ links: next }).eq('id', video.id)
  }

  const handleRemoveLink = async (idx) => {
    const next = links.filter((_, i) => i !== idx)
    setLinks(next)
    await supabase.from('videos').update({ links: next.length ? next : null }).eq('id', video.id)
  }

  const tabLabel = { notes: t.tabNotes, prompts: t.tabPrompts, links: t.tabLinks }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-3xl bg-gray-900 rounded-2xl shadow-2xl
                   max-h-[90dvh] flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close — RTL-safe */}
        <button
          onClick={onClose}
          title={t.close}
          className="absolute top-3 end-3 z-10 p-2 rounded-full bg-black/60 text-white
                     hover:bg-black/80 transition-colors"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M6 18L18 6M6 6l12 12"/>
          </svg>
        </button>

        {/* Scrollable body */}
        <div className="overflow-y-auto flex-1">

          {/* 16:9 Video */}
          <div className="relative w-full flex-shrink-0" style={{ paddingTop: '56.25%' }}>
            <iframe
              className="absolute inset-0 w-full h-full"
              src={`https://www.youtube.com/embed/${video.youtube_id}?autoplay=1`}
              title={video.title}
              frameBorder="0"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          </div>

          {/* Title + Channel */}
          <div className="px-4 py-3 border-b border-gray-700/60">
            <h2 className="text-sm font-semibold text-white line-clamp-2">{video.title}</h2>
            {video.channel && (
              <p className="text-xs text-gray-400 mt-0.5">{video.channel}</p>
            )}
          </div>

          {/* ── Knowledge Hub ── */}
          <div>

            {/* Tab bar */}
            <div className="flex border-b border-gray-700/60 px-2 overflow-x-auto">
              {TABS.map(tab => (
                <TabButton
                  key={tab}
                  id={tab}
                  activeTab={activeTab}
                  label={tabLabel[tab]}
                  onClick={setActiveTab}
                />
              ))}
            </div>

            {/* Tab content */}
            <div className="p-4">

              {/* ── Notes ── */}
              {activeTab === 'notes' && (
                <div className="space-y-3">
                  <textarea
                    value={notes}
                    onChange={e => {
                      setNotes(e.target.value)
                      setNotesDirty(true)
                      setNotesSaved(false)
                    }}
                    placeholder={t.notesPlaceholder}
                    rows={6}
                    className="w-full px-3 py-2.5 rounded-xl border border-gray-700
                               bg-gray-800 text-gray-100 placeholder-gray-500
                               focus:outline-none focus:ring-2 focus:ring-primary-500
                               text-sm resize-none"
                  />
                  <div className="flex justify-end">
                    <button
                      onClick={handleSaveNotes}
                      disabled={!notesDirty || notesSaving}
                      className={`
                        px-5 py-2 rounded-xl text-sm font-semibold transition-all
                        ${notesSaved
                          ? 'bg-emerald-600 text-white'
                          : notesDirty
                            ? 'bg-primary-600 hover:bg-primary-700 text-white'
                            : 'bg-gray-700 text-gray-500 cursor-not-allowed'}
                      `}
                    >
                      {notesSaving ? t.saving : notesSaved ? t.notesSaved : t.save}
                    </button>
                  </div>
                </div>
              )}

              {/* ── Prompts ── */}
              {activeTab === 'prompts' && (
                <div className="space-y-3">

                  {prompts.length === 0 && (
                    <p className="text-center text-gray-500 text-sm py-6">{t.noPromptsYet}</p>
                  )}

                  <div className="space-y-2">
                    {prompts.map((item, idx) => (
                      <div key={item.createdAt ?? idx} className="flex gap-2 items-start">
                        <pre
                          className="flex-1 bg-gray-800 border border-gray-700 rounded-xl
                                     px-3 py-2.5 text-xs text-gray-200 whitespace-pre-wrap
                                     font-mono overflow-x-auto"
                        >
                          {item.text}
                        </pre>
                        <div className="flex flex-col gap-1.5 shrink-0">
                          <button
                            onClick={() => handleCopyPrompt(idx)}
                            className={`
                              px-3 py-1.5 rounded-lg text-xs font-semibold transition-all whitespace-nowrap
                              ${copiedIdx === idx
                                ? 'bg-emerald-600 text-white'
                                : 'bg-gray-700 hover:bg-gray-600 text-gray-200'}
                            `}
                          >
                            {copiedIdx === idx ? t.copied : t.copyPrompt}
                          </button>
                          <button
                            onClick={() => handleRemovePrompt(idx)}
                            className="px-3 py-1.5 rounded-lg text-xs font-medium
                                       bg-gray-800 border border-gray-700
                                       text-gray-500 hover:text-red-400 hover:border-red-800/50 hover:bg-red-900/20
                                       transition-colors"
                          >
                            {t.remove}
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Add prompt */}
                  <div className="flex gap-2 pt-2 border-t border-gray-700/60">
                    <textarea
                      value={newPrompt}
                      onChange={e => setNewPrompt(e.target.value)}
                      onKeyDown={e => {
                        if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) handleAddPrompt()
                      }}
                      placeholder={t.promptPlaceholder}
                      rows={2}
                      className="flex-1 px-3 py-2 rounded-xl border border-gray-700
                                 bg-gray-800 text-gray-100 placeholder-gray-500
                                 focus:outline-none focus:ring-2 focus:ring-primary-500
                                 text-sm resize-none"
                    />
                    <button
                      onClick={handleAddPrompt}
                      disabled={!newPrompt.trim()}
                      className="self-start px-4 py-2 bg-primary-600 hover:bg-primary-700
                                 disabled:bg-gray-700 disabled:text-gray-500
                                 text-white rounded-xl text-sm font-semibold transition-colors shrink-0"
                    >
                      {t.add}
                    </button>
                  </div>
                </div>
              )}

              {/* ── Links ── */}
              {activeTab === 'links' && (
                <div className="space-y-3">

                  {links.length === 0 && (
                    <p className="text-center text-gray-500 text-sm py-6">{t.noLinksYet}</p>
                  )}

                  <div className="space-y-2">
                    {links.map((item, idx) => (
                      <div key={item.createdAt ?? idx} className="flex items-center gap-2">
                        <a
                          href={item.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex-1 flex items-center gap-2.5 px-3 py-2.5 rounded-xl
                                     bg-gray-800 border border-gray-700
                                     hover:border-primary-600/50 hover:bg-gray-800/80
                                     transition-colors min-w-0"
                        >
                          <svg className="w-3.5 h-3.5 text-gray-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                              d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"/>
                          </svg>
                          <span className="text-sm text-primary-400 truncate">
                            {item.label || item.url}
                          </span>
                        </a>
                        <RemoveBtn onClick={() => handleRemoveLink(idx)} />
                      </div>
                    ))}
                  </div>

                  {/* Add link */}
                  <div className="pt-2 border-t border-gray-700/60 space-y-2">
                    <input
                      type="url"
                      value={newLinkUrl}
                      onChange={e => setNewLinkUrl(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && handleAddLink()}
                      placeholder={t.linkUrlPlaceholder}
                      className="w-full px-3 py-2 rounded-xl border border-gray-700
                                 bg-gray-800 text-gray-100 placeholder-gray-500
                                 focus:outline-none focus:ring-2 focus:ring-primary-500 text-sm"
                    />
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={newLinkLabel}
                        onChange={e => setNewLinkLabel(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && handleAddLink()}
                        placeholder={t.linkLabelPlaceholder}
                        className="flex-1 px-3 py-2 rounded-xl border border-gray-700
                                   bg-gray-800 text-gray-100 placeholder-gray-500
                                   focus:outline-none focus:ring-2 focus:ring-primary-500 text-sm"
                      />
                      <button
                        onClick={handleAddLink}
                        disabled={!newLinkUrl.trim()}
                        className="px-4 py-2 bg-primary-600 hover:bg-primary-700
                                   disabled:bg-gray-700 disabled:text-gray-500
                                   text-white rounded-xl text-sm font-semibold transition-colors shrink-0"
                      >
                        {t.add}
                      </button>
                    </div>
                  </div>
                </div>
              )}

            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
