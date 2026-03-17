import { useState, useMemo, useEffect, useRef } from 'react'
import BrandSlider from './components/BrandSlider'
import ImageGrid   from './components/ImageGrid'
import Auth        from './components/Auth'
import metadata    from './metadata.json'
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

export default function App() {
  // ── Auth ─────────────────────────────────────────────────
  const [session,     setSession]     = useState(null)
  const [authLoading, setAuthLoading] = useState(true)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      setAuthLoading(false)
    }).catch(() => setAuthLoading(false))
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, session) => {
      setSession(session)
      if (!session) {
        setUserImages([])
        setHiddenStatic(new Set())
        setDeletedStatic(new Set())
      }
    })
    return () => subscription.unsubscribe()
  }, [])

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
    const [{ data: imgs }, { data: prefs }] = await Promise.all([
      supabase.from('images').select('*').order('created_at', { ascending: true }),
      supabase.from('user_prefs').select('*').eq('user_id', session.user.id).maybeSingle(),
    ])
    if (imgs) {
      setUserImages(imgs.map(img => ({ ...img, url: getPublicUrl(img.storage_path) })))
    }
    if (prefs) {
      setHiddenStatic(new Set(prefs.hidden_static  || []))
      setDeletedStatic(new Set(prefs.deleted_static || []))
    }
    setDataLoading(false)
  }

  async function saveStaticPrefs(hidden, deleted) {
    if (!session) return
    await supabase.from('user_prefs').upsert({
      user_id:        session.user.id,
      hidden_static:  [...hidden],
      deleted_static: [...deleted],
    }, { onConflict: 'user_id' })
  }

  // ── Slider / UI state ─────────────────────────────────────
  const [values,     setValues]     = useState(DEFAULT_VALUES)
  const [tagging,    setTagging]    = useState([])
  const [tagErrors,  setTagErrors]  = useState([])
  const [showHidden, setShowHidden] = useState(false)
  const fileInputRef = useRef(null)

  // ── Derived ───────────────────────────────────────────────
  const allImages = useMemo(() => [
    ...Object.keys(metadata).filter(f => !deletedStatic.has(f)),
    ...userImages.filter(img => !img.is_deleted).map(img => img.filename),
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

  // ── Actions ───────────────────────────────────────────────
  function handleChange(key, val) { setValues(prev => ({ ...prev, [key]: val })) }
  function handleReset()          { setValues(DEFAULT_VALUES) }

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

  async function handleFileSelect(e) {
    const files = Array.from(e.target.files)
    e.target.value = ''
    if (!files.length || !session) return

    const tooBig = files.filter(f => f.size > MAX_FILE_MB * 1024 * 1024)
    if (tooBig.length) alert(`Skipped (>${MAX_FILE_MB}MB):\n${tooBig.map(f => f.name).join('\n')}`)
    const valid = files.filter(f => f.size <= MAX_FILE_MB * 1024 * 1024)
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
      setUserImages(prev => [...prev, tempImg])

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
          filename: file.name, storage_path: storagePath, tags, user_id: session.user.id,
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
      minHeight:'100vh', background:'#EDECE8', fontFamily:'IBM Plex Mono, monospace',
      fontSize:'11px', color:'#aaa', letterSpacing:'0.06em' }}>
      Loading…
    </div>
  )
  if (!session) return <Auth />

  const isFiltering = activeCount > 0
  const isTagging   = tagging.length > 0
  const user        = session.user

  return (
    <div className="app">
      <aside className="sidebar">
        <header className="sidebar__header">
          <div className="sidebar__header-top">
            <div>
              <div className="sidebar__title">Spectrum</div>
              <div className="sidebar__sub">Brand Personality Filter</div>
            </div>
            <button className="signout-btn" onClick={() => supabase.auth.signOut()} title="Sign out">
              {user.user_metadata?.avatar_url
                ? <img src={user.user_metadata.avatar_url} alt="" className="signout-btn__avatar" />
                : <span className="signout-btn__initial">
                    {(user.user_metadata?.full_name || user.email || 'U')[0].toUpperCase()}
                  </span>
              }
            </button>
          </div>
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

      <main className="main">
        {dataLoading ? (
          <div className="loading-state">Loading your images…</div>
        ) : (
          <>
            <div className="toolbar">
              <div className="toolbar__left">
                <button
                  className={`upload-btn${isTagging ? ' upload-btn--loading' : ''}`}
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isTagging}
                >
                  {isTagging ? `Tagging ${tagging.length}…` : '+ Add Images'}
                </button>
                <input ref={fileInputRef} type="file" accept="image/*" multiple
                  style={{ display: 'none' }} onChange={handleFileSelect} />
                {hiddenCount > 0 && (
                  <button
                    className={`show-hidden-btn${showHidden ? ' show-hidden-btn--active' : ''}`}
                    onClick={() => setShowHidden(v => !v)}
                  >
                    {showHidden ? 'Hide hidden' : `Show hidden (${hiddenCount})`}
                  </button>
                )}
                {tagErrors.length > 0 && (
                  <span className="toolbar__error">
                    {tagErrors.length} failed
                    <button onClick={() => setTagErrors([])}>✕</button>
                  </span>
                )}
              </div>
              <div className="toolbar__right">
                <button className="export-btn" onClick={handleExport} disabled={visibleSet.size === 0}>
                  Export {visibleSet.size > 0 ? `${visibleSet.size} ` : ''}results
                </button>
              </div>
            </div>

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
          </>
        )}
      </main>
    </div>
  )
}
