import { useState, useMemo, useEffect, useRef } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import BrandSlider      from './components/BrandSlider'
import ImageGrid        from './components/ImageGrid'
import BrandMap         from './components/BrandMap'
import Auth             from './components/Auth'
import CollectionSetup  from './components/CollectionSetup'
import PresenceAvatars  from './components/PresenceAvatars'
import metadata         from './metadata.json'
import { supabase, BUCKET } from './lib/supabase'
import './App.css'

const SPECTRUMS = [
  {
    group: 'Visual Expression',
    items: [
      { key: 'minimal_decorative',        left: 'Minimal',      right: 'Decorative'   },
      { key: 'bold_subtle',               left: 'Bold',         right: 'Subtle'       },
    ],
  },
  {
    group: 'Personality',
    items: [
      { key: 'playful_formal',            left: 'Playful',      right: 'Formal'       },
      { key: 'emotional_rational',        left: 'Emotional',    right: 'Rational'     },
    ],
  },
  {
    group: 'Cultural Position',
    items: [
      { key: 'approachable_aspirational', left: 'Approachable', right: 'Aspirational' },
      { key: 'rebellion_authority',       left: 'Rebellion',    right: 'Authority'    },
      { key: 'mass_niche',                left: 'Mass',         right: 'Niche'        },
    ],
  },
  {
    group: 'Strategic Orientation',
    items: [
      { key: 'innovation_craft',          left: 'Innovation',   right: 'Craft'        },
      { key: 'broad_focused',             left: 'Broad',        right: 'Focused'      },
    ],
  },
]

const ALL_KEYS       = SPECTRUMS.flatMap(g => g.items.map(i => i.key))
const DEFAULT_VALUES = Object.fromEntries(ALL_KEYS.map(k => [k, 0]))
const MAX_FILE_MB    = 5

function passes(imageValue, sliderValue) {
  if (sliderValue === 0) return true
  const tolerance = (3 - Math.abs(sliderValue)) + 1
  return Math.abs(imageValue - sliderValue) <= tolerance
}

const LENSES = [
  { id: 'market',   name: 'Market Position',  x: 'minimal_decorative',        y: 'rebellion_authority'   },
  { id: 'audience', name: 'Audience Signal',   x: 'approachable_aspirational', y: 'mass_niche'            },
  { id: 'energy',   name: 'Brand Energy',      x: 'bold_subtle',               y: 'playful_formal'        },
  { id: 'trust',    name: 'Trust vs Edge',     x: 'playful_formal',            y: 'rebellion_authority'   },
]

function fileToDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload  = e => resolve(e.target.result)
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

function getPublicUrl(path) {
  return supabase.storage.from(BUCKET).getPublicUrl(path).data.publicUrl
}

function LinkIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/>
      <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>
    </svg>
  )
}

function ChevronDownIcon() {
  return (
    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="6 9 12 15 18 9"/>
    </svg>
  )
}

function MoonIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
    </svg>
  )
}

function SunIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="5"/>
      <line x1="12" y1="1"  x2="12" y2="3"/>
      <line x1="12" y1="21" x2="12" y2="23"/>
      <line x1="4.22" y1="4.22"  x2="5.64" y2="5.64"/>
      <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/>
      <line x1="1"  y1="12" x2="3"  y2="12"/>
      <line x1="21" y1="12" x2="23" y2="12"/>
      <line x1="4.22"  y1="19.78" x2="5.64"  y2="18.36"/>
      <line x1="18.36" y1="5.64"  x2="19.78" y2="4.22"/>
    </svg>
  )
}

export default function App() {
  // ── Dark mode ─────────────────────────────────────────────
  const [darkMode, setDarkMode] = useState(() => {
    const stored = localStorage.getItem('spectrum-dark')
    const isDark = stored !== null ? stored === 'true' : true   // default: dark
    document.documentElement.dataset.theme = isDark ? 'dark' : 'light'
    return isDark
  })

  useEffect(() => {
    document.documentElement.dataset.theme = darkMode ? 'dark' : 'light'
    localStorage.setItem('spectrum-dark', darkMode)
  }, [darkMode])

  // ── Auth ─────────────────────────────────────────────────
  const [session,          setSession]          = useState(null)
  const [authLoading,      setAuthLoading]      = useState(true)
  const [showAuthOverlay,  setShowAuthOverlay]  = useState(false)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      setAuthLoading(false)
      if (!session) setShowAuthOverlay(true)
    }).catch(() => { setAuthLoading(false); setShowAuthOverlay(true) })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, session) => {
      setSession(session)
      if (!session) {
        setUserImages([])
        setHiddenStatic(new Set())
        setDeletedStatic(new Set())
        setCollection(null)
        setOnlineUsers([])
        setShowAuthOverlay(true)
      } else {
        setShowAuthOverlay(false)
      }
    })
    return () => subscription.unsubscribe()
  }, [])

  // ── Collection ────────────────────────────────────────────
  const [collection,             setCollection]             = useState(null)
  const [allCollections,         setAllCollections]         = useState([])
  const [showSetup,              setShowSetup]              = useState(false)
  const [showCollectionSwitcher, setShowCollectionSwitcher] = useState(false)
  const [pendingJoinCode,        setPendingJoinCode]        = useState(null)
  const [onlineUsers,            setOnlineUsers]            = useState([])
  const [copied,                 setCopied]                 = useState(false)
  const switcherRef = useRef(null)

  useEffect(() => {
    if (!collection || !session) return

    const userId = session.user.id
    const colId  = collection.id

    // Load all active presence rows for this collection (active = seen in last 2 min)
    async function loadPresence() {
      const cutoff = new Date(Date.now() - 2 * 60 * 1000).toISOString()
      const { data } = await supabase
        .from('user_presence')
        .select('*')
        .eq('collection_id', colId)
        .gte('updated_at', cutoff)
      if (data) setOnlineUsers(data)
    }

    // Upsert own row — called on mount and every 30s as a heartbeat
    async function heartbeat() {
      await supabase.from('user_presence').upsert({
        user_id:       userId,
        collection_id: colId,
        name:          session.user.user_metadata?.full_name || session.user.email,
        avatar_url:    session.user.user_metadata?.avatar_url || null,
        updated_at:    new Date().toISOString(),
      }, { onConflict: 'user_id' })
    }

    heartbeat()
    loadPresence()
    const timer = setInterval(() => { heartbeat(); loadPresence() }, 30_000)

    // Realtime: re-load presence whenever any row in this collection changes
    const ch = supabase.channel(`presence-db:${colId}`)
      .on('postgres_changes', {
        event: '*', schema: 'public', table: 'user_presence',
        filter: `collection_id=eq.${colId}`,
      }, loadPresence)
      .subscribe()

    return () => {
      clearInterval(timer)
      supabase.removeChannel(ch)
      // Mark ourselves offline immediately on unmount
      supabase.from('user_presence').delete().eq('user_id', userId).then(() => {})
    }
  }, [collection?.id])

  async function joinCollectionByCode(code) {
    const { data: col } = await supabase
      .from('collections')
      .select('*')
      .eq('invite_code', code.trim().toLowerCase())
      .single()
    if (!col) return null
    await supabase.from('collection_members')
      .upsert({ collection_id: col.id, user_id: session.user.id })
    window.history.replaceState({}, '', window.location.pathname)
    return col
  }

  function handleShare() {
    if (!collection) return
    const url = `${window.location.origin}?join=${collection.invite_code}`
    navigator.clipboard.writeText(url).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  // ── User data ─────────────────────────────────────────────
  const [userImages,    setUserImages]    = useState([])
  const [hiddenStatic,  setHiddenStatic]  = useState(new Set())
  const [deletedStatic, setDeletedStatic] = useState(new Set())
  const [dataLoading,   setDataLoading]   = useState(false)

  useEffect(() => {
    if (session) loadUserData()
  }, [session])

  async function loadUserData() {
    setDataLoading(true)

    // Check URL first, then localStorage (survives OAuth redirect)
    let joinCode = new URLSearchParams(window.location.search).get('join')
    if (!joinCode) joinCode = localStorage.getItem('spectrum-join-code')

    if (joinCode) {
      localStorage.removeItem('spectrum-join-code')
      window.history.replaceState({}, '', window.location.pathname)
      await joinCollectionByCode(joinCode)
    }

    const { data: memberships } = await supabase
      .from('collection_members')
      .select('collection_id, collections(*)')
      .eq('user_id', session.user.id)
      .order('joined_at', { ascending: false })

    if (!memberships?.length) {
      // Pass any pending code to CollectionSetup so it can auto-join
      setPendingJoinCode(joinCode || null)
      setShowSetup(true)
      setDataLoading(false)
      return
    }

    const cols = memberships.map(m => m.collections)
    setAllCollections(cols)

    // Restore last-used collection; default to most recently joined
    const savedId = localStorage.getItem('spectrum-active-collection')
    const active  = memberships.find(m => m.collection_id === savedId) || memberships[0]
    const col     = active.collections
    localStorage.setItem('spectrum-active-collection', col.id)
    setCollection(col)
    loadFiltersForCollection(col)

    // Static prefs are collection-scoped so all members share the same view
    setHiddenStatic(new Set(col.hidden_static   || []))
    setDeletedStatic(new Set(col.deleted_static  || []))

    const { data: imgs } = await supabase
      .from('images')
      .select('*')
      .eq('collection_id', col.id)
      .order('created_at', { ascending: false })

    if (imgs) {
      setUserImages(imgs.map(img => ({ ...img, url: getPublicUrl(img.storage_path) })))
    }
    setDataLoading(false)
  }

  async function handleCollectionCreated(col) {
    setAllCollections(prev => {
      const already = prev.find(c => c.id === col.id)
      return already ? prev : [col, ...prev]
    })
    setCollection(col)
    setHiddenStatic(new Set(col.hidden_static  || []))
    setDeletedStatic(new Set(col.deleted_static || []))
    setShowSetup(false)
    setPendingJoinCode(null)
    setUserImages([])
  }

  async function switchCollection(col) {
    setCollection(col)
    loadFiltersForCollection(col)
    setHiddenStatic(new Set(col.hidden_static  || []))
    setDeletedStatic(new Set(col.deleted_static || []))
    localStorage.setItem('spectrum-active-collection', col.id)
    setShowCollectionSwitcher(false)
    const { data: imgs } = await supabase
      .from('images')
      .select('*')
      .eq('collection_id', col.id)
      .order('created_at', { ascending: false })
    if (imgs) setUserImages(imgs.map(img => ({ ...img, url: getPublicUrl(img.storage_path) })))
  }

  // Close collection switcher on outside click
  useEffect(() => {
    if (!showCollectionSwitcher) return
    function onMouseDown(e) {
      if (switcherRef.current && !switcherRef.current.contains(e.target)) {
        setShowCollectionSwitcher(false)
      }
    }
    document.addEventListener('mousedown', onMouseDown)
    return () => document.removeEventListener('mousedown', onMouseDown)
  }, [showCollectionSwitcher])

  async function saveStaticPrefs(hidden, deleted) {
    if (!session || !collection) return
    // Prefs are stored on the collection so all members share the same view
    await supabase.from('collections').update({
      hidden_static:  [...hidden],
      deleted_static: [...deleted],
    }).eq('id', collection.id)
  }

  // ── Slider / UI state ─────────────────────────────────────
  const [values,     setValues]     = useState(DEFAULT_VALUES)
  const [tagging,    setTagging]    = useState([])
  const [tagErrors,    setTagErrors]    = useState([])
  const [uploadNotice, setUploadNotice] = useState(null)   // { msg, isError }
  const [showHidden, setShowHidden] = useState(false)
  const [viewMode,   setViewMode]   = useState('grid')
  const [lensId,     setLensId]     = useState('market')
  const fileInputRef     = useRef(null)
  const lastClipboardUrl = useRef('')
  const [showUrlModal, setShowUrlModal] = useState(false)
  const [urlInput,     setUrlInput]     = useState('')

  // ── Derived ───────────────────────────────────────────────
  const allImages = useMemo(() => [
    // Uploaded images first (newest first per DB order), then static reference library
    ...userImages.filter(img => !img.is_deleted).map(img => img.filename),
    ...Object.keys(metadata).filter(f => !deletedStatic.has(f)),
  ], [userImages, deletedStatic])

  const urlMap = useMemo(() => {
    const map = {}
    userImages.forEach(img => { if (!img.is_deleted) map[img.filename] = img.url })
    return map
  }, [userImages])

  const allMeta = useMemo(() => ({
    ...metadata,
    ...Object.fromEntries(
      userImages.filter(img => !img.is_deleted).map(img => [img.filename, img.tags ?? {}])
    ),
  }), [userImages])

  const hiddenImages = useMemo(() => {
    const h = new Set(hiddenStatic)
    userImages.filter(img => img.is_hidden && !img.is_deleted).forEach(img => h.add(img.filename))
    return h
  }, [userImages, hiddenStatic])

  const activeCount = useMemo(
    () => ALL_KEYS.filter(k => values[k] !== 0).length, [values]
  )

  const visibleSet = useMemo(() => {
    const s = new Set()
    for (const f of allImages) {
      if (hiddenImages.has(f)) continue
      const meta = allMeta[f] || {}
      if (ALL_KEYS.every(k => passes(meta[k] ?? 0, values[k]))) s.add(f)
    }
    return s
  }, [allImages, hiddenImages, allMeta, values])

  const sortedImages = useMemo(() => {
    const pool = showHidden ? allImages : allImages.filter(f => !hiddenImages.has(f))
    return [...pool].sort((a, b) => {
      const aH = hiddenImages.has(a), bH = hiddenImages.has(b)
      if (aH !== bH) return aH ? 1 : -1
      return (visibleSet.has(a) ? 0 : 1) - (visibleSet.has(b) ? 0 : 1)
    })
  }, [allImages, hiddenImages, showHidden, visibleSet])

  const hiddenCount = useMemo(
    () => allImages.filter(f => hiddenImages.has(f)).length, [allImages, hiddenImages]
  )

  const boardPosition = useMemo(() => {
    const visible = [...visibleSet]
    if (!visible.length) return null
    const result = {}
    ALL_KEYS.forEach(k => {
      const vals = visible.map(f => (allMeta[f] ?? {})[k] ?? 0)
      result[k] = vals.reduce((a, b) => a + b, 0) / vals.length
    })
    return result
  }, [visibleSet, allMeta])

  // ── Actions ───────────────────────────────────────────────
  function loadFiltersForCollection(col) {
    try {
      const saved = localStorage.getItem(`spectrum-filters-${col.id}`)
      setValues(saved ? JSON.parse(saved) : DEFAULT_VALUES)
    } catch { setValues(DEFAULT_VALUES) }
  }

  function handleChange(key, val) {
    setValues(prev => {
      const next = { ...prev, [key]: val }
      if (collection) localStorage.setItem(`spectrum-filters-${collection.id}`, JSON.stringify(next))
      return next
    })
  }
  function handleReset() {
    setValues(DEFAULT_VALUES)
    if (collection) localStorage.removeItem(`spectrum-filters-${collection.id}`)
  }

  async function handleHide(filename) {
    const img = userImages.find(i => i.filename === filename)
    if (img) {
      await supabase.from('images').update({ is_hidden: true }).eq('id', img.id)
      setUserImages(prev => prev.map(i => i.id === img.id ? { ...i, is_hidden: true } : i))
    } else {
      const next = new Set([...hiddenStatic, filename])
      setHiddenStatic(next)
      saveStaticPrefs(next, deletedStatic)
    }
  }

  async function handleUnhide(filename) {
    const img = userImages.find(i => i.filename === filename)
    if (img) {
      await supabase.from('images').update({ is_hidden: false }).eq('id', img.id)
      setUserImages(prev => prev.map(i => i.id === img.id ? { ...i, is_hidden: false } : i))
    } else {
      const next = new Set([...hiddenStatic].filter(f => f !== filename))
      setHiddenStatic(next)
      saveStaticPrefs(next, deletedStatic)
    }
  }

  async function handleDelete(filename) {
    const img = userImages.find(i => i.filename === filename)
    if (img) {
      await supabase.from('images').update({ is_deleted: true }).eq('id', img.id)
      setUserImages(prev => prev.map(i => i.id === img.id ? { ...i, is_deleted: true } : i))
    } else {
      const next = new Set([...deletedStatic, filename])
      setDeletedStatic(next)
      saveStaticPrefs(hiddenStatic, next)
    }
  }

  function handleUploadClick() {
    if (!session) { setShowAuthOverlay(true); return }
    if (!collection) return
    fileInputRef.current?.click()
  }

  async function handleFileSelect(e) {
    const files = Array.from(e.target.files)
    e.target.value = ''
    if (!files.length || !session || !collection) return

    const SUPPORTED = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif']
    const badType = files.filter(f => !SUPPORTED.includes(f.type))
    const typed   = files.filter(f => SUPPORTED.includes(f.type))
    const tooBig  = typed.filter(f => f.size > MAX_FILE_MB * 1024 * 1024)
    const valid   = typed.filter(f => f.size <= MAX_FILE_MB * 1024 * 1024)

    const notices = []
    if (badType.length) {
      const ext = badType.map(f => f.name.split('.').pop().toUpperCase()).join(', ')
      notices.push(`${ext} not supported — use JPG, PNG, WebP or GIF`)
    }
    if (tooBig.length) {
      notices.push(`${tooBig.map(f => f.name).join(', ')} exceeds the ${MAX_FILE_MB}MB limit`)
    }
    if (notices.length) {
      setUploadNotice({ msg: notices.join(' · '), isError: true })
      setTimeout(() => setUploadNotice(null), 6000)
    }
    if (!valid.length) return

    setTagging(prev => [...prev, ...valid.map(f => f.name)])

    for (const file of valid) {
      const dataUrl     = await fileToDataUrl(file)
      const base64      = dataUrl.split(',')[1]
      const storagePath = `${session.user.id}/${Date.now()}-${file.name}`
      const tempId      = `temp-${Date.now()}-${file.name}`

      const tempImg = {
        id: tempId, filename: file.name, storage_path: storagePath,
        tags: null, is_hidden: false, is_deleted: false, url: dataUrl,
      }
      setUserImages(prev => [tempImg, ...prev])

      try {
        const { error: uploadErr } = await supabase.storage.from(BUCKET).upload(storagePath, file)
        if (uploadErr) throw uploadErr

        const res = await fetch('/api/tag', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ imageData: base64, mimeType: file.type }),
        })
        if (!res.ok) throw new Error(await res.text())
        const tags = await res.json()

        const { data: newImg, error: dbErr } = await supabase.from('images').insert({
          filename: file.name, storage_path: storagePath, tags,
          user_id: session.user.id, collection_id: collection.id,
        }).select().single()
        if (dbErr) throw dbErr

        setUserImages(prev => prev.map(i =>
          i.id === tempId ? { ...newImg, url: getPublicUrl(storagePath) } : i
        ))
        setTagging(prev => prev.filter(n => n !== file.name))
      } catch (err) {
        console.error('Upload error:', file.name, err)
        setUserImages(prev => prev.filter(i => i.id !== tempId))
        setTagErrors(prev => [...prev, file.name])
        setTagging(prev => prev.filter(n => n !== file.name))
      }
    }
  }

  // ── Clipboard detection: auto-open URL modal when image URL is copied ──
  useEffect(() => {
    if (!session || !collection) return
    const onFocus = async () => {
      try {
        const text = await navigator.clipboard.readText()
        if (!text || text === lastClipboardUrl.current) return
        const looksLikeImage =
          /^https?:\/\/.+\.(jpg|jpeg|png|webp|gif|avif|svg)/i.test(text) ||
          /images\.(unsplash|squarespace)|cdn\.(dribbble|behance)|framerusercontent|imagekit/i.test(text)
        if (looksLikeImage) {
          lastClipboardUrl.current = text
          setUrlInput(text)
          setShowUrlModal(true)
        }
      } catch { /* clipboard permission denied — silent */ }
    }
    window.addEventListener('focus', onFocus)
    return () => window.removeEventListener('focus', onFocus)
  }, [session, collection])

  async function handleUrlImport(url) {
    if (!url || !session || !collection) return
    const filename = url.split('/').pop().split('?')[0] || `import-${Date.now()}`
    const tempId   = `temp-url-${Date.now()}`
    setShowUrlModal(false)
    setUrlInput('')
    setTagging(prev => [...prev, filename])
    setUserImages(prev => [{
      id: tempId, filename, url, tags: null, is_hidden: false, is_deleted: false,
    }, ...prev])

    try {
      const res = await fetch('/api/import-url', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url }),
      })
      if (!res.ok) throw new Error(await res.text())
      const { tags, imageData, mimeType } = await res.json()

      const ext         = mimeType.split('/')[1]?.split('+')[0] || 'jpg'
      const storagePath = `${session.user.id}/${Date.now()}-${filename}.${ext}`
      const bytes       = Uint8Array.from(atob(imageData), c => c.charCodeAt(0))
      const blob        = new Blob([bytes], { type: mimeType })

      const { error: uploadErr } = await supabase.storage.from(BUCKET).upload(storagePath, blob)
      if (uploadErr) throw uploadErr

      const { data: newImg, error: dbErr } = await supabase.from('images').insert({
        filename, storage_path: storagePath, tags,
        user_id: session.user.id, collection_id: collection.id,
      }).select().single()
      if (dbErr) throw dbErr

      setUserImages(prev => prev.map(i =>
        i.id === tempId ? { ...newImg, url: getPublicUrl(storagePath) } : i
      ))
    } catch (err) {
      console.error('URL import error:', err)
      setUserImages(prev => prev.filter(i => i.id !== tempId))
      setTagErrors(prev => [...prev, filename])
    } finally {
      setTagging(prev => prev.filter(n => n !== filename))
    }
  }

  function handleExport() {
    const out = {}
    for (const f of sortedImages) {
      if (visibleSet.has(f)) out[f] = allMeta[f] || {}
    }
    const a = Object.assign(document.createElement('a'), {
      href: URL.createObjectURL(new Blob([JSON.stringify(out, null, 2)], { type: 'application/json' })),
      download: 'spectrum-results.json',
    })
    a.click()
  }

  // ── Render ────────────────────────────────────────────────
  if (authLoading) return (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'center',
      minHeight:'100vh', background: darkMode ? '#111' : '#EDECE8',
      fontFamily:'IBM Plex Mono, monospace',
      fontSize:'11px', color:'#aaa', letterSpacing:'0.06em' }}>
      Loading…
    </div>
  )

  if (showSetup && session) return (
    <CollectionSetup
      session={session}
      onDone={handleCollectionCreated}
      pendingCode={pendingJoinCode}
      onClose={collection ? () => setShowSetup(false) : null}
    />
  )

  const isFiltering = activeCount > 0
  const isTagging   = tagging.length > 0
  const user        = session?.user

  return (
    <div className="app">
      {showAuthOverlay && (
        <Auth onGuest={() => setShowAuthOverlay(false)} />
      )}

      {showUrlModal && (
        <div className="url-modal-overlay" onClick={() => setShowUrlModal(false)}>
          <div className="url-modal" onClick={e => e.stopPropagation()}>
            <span className="url-modal__icon"><LinkIcon /></span>
            <input
              className="url-modal__input"
              type="url"
              placeholder="https://"
              value={urlInput}
              autoFocus
              onChange={e => setUrlInput(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter' && urlInput) handleUrlImport(urlInput)
                if (e.key === 'Escape') setShowUrlModal(false)
              }}
            />
            <button
              className="url-modal__btn"
              disabled={!urlInput}
              onClick={() => handleUrlImport(urlInput)}
            >Add URL</button>
          </div>
        </div>
      )}

      <aside className="sidebar">
        <header className="sidebar__header">
          <div className="sidebar__header-top">
            <div className="sidebar__title">Spectrum</div>
            <div className="sidebar__header-actions">
              <button
                className="dark-toggle"
                onClick={() => setDarkMode(v => !v)}
                title={darkMode ? 'Light mode' : 'Dark mode'}
              >
                {darkMode ? <SunIcon /> : <MoonIcon />}
              </button>
              <PresenceAvatars users={onlineUsers} currentUserId={session?.user?.id} />
              {user ? (
                <button className="signout-btn" onClick={() => supabase.auth.signOut()} title="Sign out">
                  {user.user_metadata?.avatar_url
                    ? <img src={user.user_metadata.avatar_url} alt="" className="signout-btn__avatar" />
                    : <span className="signout-btn__initial">
                        {(user.user_metadata?.full_name || user.email || 'U')[0].toUpperCase()}
                      </span>
                  }
                </button>
              ) : (
                <button className="signin-pill" onClick={() => setShowAuthOverlay(true)}>
                  Sign in
                </button>
              )}
            </div>
          </div>

          {collection && (
          <div className="sidebar__header-meta">
              <div className="sidebar__collection-wrap" ref={switcherRef}>
                <button
                  className="sidebar__collection-trigger"
                  onClick={() => setShowCollectionSwitcher(v => !v)}
                >
                  <span>{collection.name}</span>
                  <ChevronDownIcon />
                </button>
                {showCollectionSwitcher && (
                  <div className="collection-switcher">
                    {allCollections.map(c => (
                      <button
                        key={c.id}
                        className={`collection-switcher__item${c.id === collection.id ? ' collection-switcher__item--active' : ''}`}
                        onClick={() => c.id === collection.id ? setShowCollectionSwitcher(false) : switchCollection(c)}
                      >
                        <span className="collection-switcher__name">{c.name}</span>
                        {c.owner_id !== session?.user?.id && (
                          <span className="collection-switcher__badge">shared</span>
                        )}
                      </button>
                    ))}
                    <div className="collection-switcher__divider" />
                    <button
                      className="collection-switcher__new"
                      onClick={() => { setShowSetup(true); setShowCollectionSwitcher(false) }}
                    >
                      + New collection
                    </button>
                  </div>
                )}
              </div>
          </div>
          )}
        </header>

        <div className="sidebar__counter">
          <span className="sidebar__count">{visibleSet.size}</span>
          <span className="sidebar__count-total"> / {allImages.length - hiddenCount}</span>
          <span className="sidebar__count-label"> images</span>
        </div>

        <div className={`sidebar__active-bar${isFiltering ? '' : ' sidebar__active-bar--hidden'}`}>
          <span>{activeCount} dimension{activeCount !== 1 ? 's' : ''} active</span>
          <button className="reset-btn" onClick={handleReset}>Reset all</button>
        </div>

        <div className="sidebar__sliders">
          {SPECTRUMS.map(({ group, items }) => (
            <div key={group} className="slider-group">
              <div className="slider-group__label">{group}</div>
              {items.map(({ key, left, right }) => (
                <BrandSlider key={key} leftLabel={left} rightLabel={right}
                  value={values[key]} onChange={val => handleChange(key, val)} />
              ))}
            </div>
          ))}
        </div>

        <div className="sidebar__footer">
          <div className="sidebar__filter-hint">
            {isFiltering ? 'Drag sliders toward center to widen the filter'
                         : 'Move any slider to begin filtering'}
          </div>
        </div>
      </aside>

      <main className={`main${viewMode === 'map' ? ' main--map' : ''}`}>
        {dataLoading ? (
          <div className="loading-state">Loading your images…</div>
        ) : (
          <>
            <div className="toolbar">
              <div className="toolbar__left">
                {viewMode === 'map' ? (
                  <div className="toolbar__lenses">
                    {LENSES.map(l => (
                      <button
                        key={l.id}
                        className={`toolbar__lens${lensId === l.id ? ' toolbar__lens--active' : ''}`}
                        onClick={() => setLensId(l.id)}
                      >{l.name}</button>
                    ))}
                  </div>
                ) : (
                  <>
                    <button
                      className={`upload-btn${isTagging ? ' upload-btn--loading' : ''}`}
                      onClick={handleUploadClick}
                      disabled={isTagging}
                    >
                      {isTagging ? `Tagging ${tagging.length}…` : '+ Add Images'}
                    </button>
                    <button
                      className="upload-url-btn"
                      onClick={() => { if (!session) { setShowAuthOverlay(true); return }; setShowUrlModal(true) }}
                      disabled={isTagging}
                    >
                      <LinkIcon /> URL
                    </button>
                    <input ref={fileInputRef} type="file" accept="image/jpeg,image/png,image/webp,image/gif" multiple
                      style={{ display: 'none' }} onChange={handleFileSelect} />
                    {hiddenCount > 0 && (
                      <button
                        className={`show-hidden-btn${showHidden ? ' show-hidden-btn--active' : ''}`}
                        onClick={() => setShowHidden(v => !v)}
                      >
                        {showHidden ? 'Hide hidden' : `Show hidden (${hiddenCount})`}
                      </button>
                    )}
                    {uploadNotice && (
                      <span className="toolbar__notice toolbar__notice--error">
                        {uploadNotice.msg}
                        <button onClick={() => setUploadNotice(null)}>✕</button>
                      </span>
                    )}
                    {tagErrors.length > 0 && (
                      <span className="toolbar__notice toolbar__notice--error">
                        {tagErrors.length === 1
                          ? `Tagging failed for ${tagErrors[0]}`
                          : `${tagErrors.length} images failed to tag`}
                        <button onClick={() => setTagErrors([])}>✕</button>
                      </span>
                    )}
                  </>
                )}
              </div>

              <div className="toolbar__center">
                <div className="view-toggle">
                  <button
                    className={`view-toggle__btn${viewMode === 'grid' ? ' view-toggle__btn--active' : ''}`}
                    onClick={() => setViewMode('grid')}
                  >Grid</button>
                  <button
                    className={`view-toggle__btn${viewMode === 'map' ? ' view-toggle__btn--active' : ''}`}
                    onClick={() => setViewMode('map')}
                  >Map</button>
                </div>
              </div>

              <div className="toolbar__right">
                {collection && (
                  <button className="share-btn" onClick={handleShare}>
                    {copied ? 'Copied!' : 'Share'}
                  </button>
                )}
                <button className="export-btn" onClick={handleExport} disabled={visibleSet.size === 0}>
                  Export {visibleSet.size > 0 ? `${visibleSet.size} ` : ''}results
                </button>
              </div>
            </div>

            <AnimatePresence mode="wait">
              {viewMode === 'grid' ? (
                <motion.div key="grid" className="view-panel"
                  initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                  transition={{ duration: 0.18 }}
                >
                  <ImageGrid
                    images={sortedImages}
                    visibleSet={visibleSet}
                    hiddenSet={hiddenImages}
                    showHidden={showHidden}
                    urlMap={urlMap}
                    onHide={handleHide}
                    onUnhide={handleUnhide}
                    onDelete={handleDelete}
                  />
                </motion.div>
              ) : (
                <motion.div key="map" className="view-panel"
                  initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                  transition={{ duration: 0.18 }}
                >
                  <BrandMap boardPosition={boardPosition} spectrums={SPECTRUMS} lensId={lensId} />
                </motion.div>
              )}
            </AnimatePresence>
          </>
        )}
      </main>
    </div>
  )
}
