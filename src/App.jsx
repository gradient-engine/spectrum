import { useState, useMemo, useEffect, useRef } from 'react'
import BrandSlider from './components/BrandSlider'
import ImageGrid   from './components/ImageGrid'
import metadata    from './metadata.json'
import { idbSet, idbDelete, idbGetAll } from './utils/db'
import './App.css'

const SPECTRUMS = [
  {
    group: 'VISUAL EXPRESSION',
    items: [
      { key: 'minimal_decorative',        left: 'Minimal',      right: 'Decorative'    },
      { key: 'bold_subtle',               left: 'Bold',         right: 'Subtle'        },
    ],
  },
  {
    group: 'PERSONALITY',
    items: [
      { key: 'playful_formal',            left: 'Playful',      right: 'Formal'        },
      { key: 'emotional_rational',        left: 'Emotional',    right: 'Rational'      },
    ],
  },
  {
    group: 'CULTURAL POSITION',
    items: [
      { key: 'approachable_aspirational', left: 'Approachable', right: 'Aspirational'  },
      { key: 'rebellion_authority',       left: 'Rebellion',    right: 'Authority'     },
      { key: 'mass_niche',                left: 'Mass',         right: 'Niche'         },
    ],
  },
  {
    group: 'STRATEGIC ORIENTATION',
    items: [
      { key: 'innovation_craft',          left: 'Innovation',   right: 'Craft'         },
      { key: 'broad_focused',             left: 'Broad',        right: 'Focused'       },
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

function loadSet(key) {
  try { return new Set(JSON.parse(localStorage.getItem(key) || '[]')) }
  catch { return new Set() }
}

export default function App() {
  const [values,       setValues]   = useState(DEFAULT_VALUES)
  const [uploaded,     setUploaded] = useState({})
  const [tagging,      setTagging]  = useState([])
  const [tagErrors,    setTagErrors]= useState([])
  const [hiddenImages, setHidden]   = useState(() => loadSet('spectrum:hidden'))
  const [deletedImages,setDeleted]  = useState(() => loadSet('spectrum:deleted'))
  const [showHidden,   setShowHidden] = useState(false)
  const fileInputRef = useRef(null)

  // Restore uploaded images from IndexedDB on mount
  useEffect(() => {
    idbGetAll().then(data => {
      if (data && Object.keys(data).length > 0) setUploaded(data)
    })
  }, [])

  // Persist hidden / deleted sets
  useEffect(() => {
    localStorage.setItem('spectrum:hidden',  JSON.stringify([...hiddenImages]))
  }, [hiddenImages])
  useEffect(() => {
    localStorage.setItem('spectrum:deleted', JSON.stringify([...deletedImages]))
  }, [deletedImages])

  const allImages = useMemo(() => [
    ...Object.keys(metadata).filter(f => !deletedImages.has(f)),
    ...Object.keys(uploaded).filter(f  => !deletedImages.has(f)),
  ], [uploaded, deletedImages])

  const urlMap = useMemo(() =>
    Object.fromEntries(Object.entries(uploaded).map(([n, { url }]) => [n, url])),
    [uploaded]
  )

  const allMeta = useMemo(() => ({
    ...metadata,
    ...Object.fromEntries(
      Object.entries(uploaded).map(([n, { tags }]) => [n, tags ?? {}])
    ),
  }), [uploaded])

  const activeCount = useMemo(
    () => ALL_KEYS.filter(k => values[k] !== 0).length,
    [values]
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
    () => allImages.filter(f => hiddenImages.has(f)).length,
    [allImages, hiddenImages]
  )

  function handleChange(key, val) { setValues(prev => ({ ...prev, [key]: val })) }
  function handleReset()          { setValues(DEFAULT_VALUES) }

  function handleHide(filename) {
    setHidden(prev => new Set([...prev, filename]))
  }
  function handleUnhide(filename) {
    setHidden(prev => { const n = new Set(prev); n.delete(filename); return n })
  }
  function handleDelete(filename) {
    setDeleted(prev => new Set([...prev, filename]))
    if (uploaded[filename]) {
      idbDelete(filename)
      setUploaded(prev => { const n = { ...prev }; delete n[filename]; return n })
    }
  }

  async function handleFileSelect(e) {
    const files = Array.from(e.target.files)
    e.target.value = ''
    if (!files.length) return

    const tooBig = files.filter(f => f.size > MAX_FILE_MB * 1024 * 1024)
    if (tooBig.length) alert(`Skipped (>${MAX_FILE_MB}MB):\n${tooBig.map(f => f.name).join('\n')}`)
    const valid = files.filter(f => f.size <= MAX_FILE_MB * 1024 * 1024)
    if (!valid.length) return

    setTagging(prev => [...prev, ...valid.map(f => f.name)])
    setTagErrors(prev => prev.filter(n => !valid.find(f => f.name === n)))

    for (const file of valid) {
      const dataUrl = await fileToDataUrl(file)
      const base64  = dataUrl.split(',')[1]

      // Show image immediately while tagging
      setUploaded(prev => ({ ...prev, [file.name]: { url: dataUrl, tags: null } }))

      try {
        const res = await fetch('/api/tag', {
          method:  'POST',
          headers: { 'Content-Type': 'application/json' },
          body:    JSON.stringify({ imageData: base64, mimeType: file.type }),
        })
        if (!res.ok) throw new Error(await res.text())
        const tags  = await res.json()
        const entry = { url: dataUrl, tags }
        await idbSet(file.name, entry)
        setUploaded(prev => ({ ...prev, [file.name]: entry }))
        setTagging(prev => prev.filter(n => n !== file.name))
      } catch (err) {
        console.error('Tag error:', file.name, err)
        const entry = { url: dataUrl, tags: Object.fromEntries(ALL_KEYS.map(k => [k, 0])) }
        await idbSet(file.name, entry)
        setUploaded(prev => ({ ...prev, [file.name]: entry }))
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
    const blob = new Blob([JSON.stringify(out, null, 2)], { type: 'application/json' })
    const a = Object.assign(document.createElement('a'), {
      href: URL.createObjectURL(blob), download: 'spectrum-results.json',
    })
    a.click()
    URL.revokeObjectURL(a.href)
  }

  const isFiltering = activeCount > 0
  const isTagging   = tagging.length > 0

  return (
    <div className="app">
      <aside className="sidebar">
        <header className="sidebar__header">
          <div className="sidebar__title">SPECTRUM</div>
          <div className="sidebar__sub">Brand Personality Filter</div>
        </header>

        <div className="sidebar__counter">
          <span className="sidebar__count">
            {visibleSet.size}
            <span className="sidebar__count-total"> / {allImages.length - hiddenCount}</span>
          </span>
          <span className="sidebar__count-label">images</span>
        </div>

        {isFiltering && (
          <div className="sidebar__active-bar">
            <span>{activeCount} dimension{activeCount !== 1 ? 's' : ''} active</span>
            <button className="reset-btn" onClick={handleReset}>Reset all</button>
          </div>
        )}

        <div className="sidebar__sliders">
          {SPECTRUMS.map(({ group, items }) => (
            <div key={group} className="slider-group">
              <div className="slider-group__label">{group}</div>
              {items.map(({ key, left, right }) => (
                <BrandSlider
                  key={key}
                  leftLabel={left}
                  rightLabel={right}
                  value={values[key]}
                  onChange={val => handleChange(key, val)}
                />
              ))}
            </div>
          ))}
        </div>

        <div className="sidebar__footer">
          <div className="sidebar__filter-hint">
            {isFiltering
              ? 'Drag sliders toward center to widen the filter'
              : 'Move any slider to begin filtering'}
          </div>
        </div>
      </aside>

      <main className="main">
        <div className="toolbar">
          <div className="toolbar__left">
            <button
              className={`upload-btn${isTagging ? ' upload-btn--loading' : ''}`}
              onClick={() => fileInputRef.current?.click()}
              disabled={isTagging}
            >
              {isTagging
                ? `Tagging ${tagging.length} image${tagging.length !== 1 ? 's' : ''}…`
                : '+ Add Images'}
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              multiple
              style={{ display: 'none' }}
              onChange={handleFileSelect}
            />
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
            <button
              className="export-btn"
              onClick={handleExport}
              disabled={visibleSet.size === 0}
            >
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
      </main>
    </div>
  )
}
