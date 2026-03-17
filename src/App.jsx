import { useState, useMemo, useRef } from 'react'
import BrandSlider from './components/BrandSlider'
import ImageGrid from './components/ImageGrid'
import metadata from './metadata.json'
import './App.css'

const SPECTRUMS = [
  {
    group: 'VISUAL EXPRESSION',
    items: [
      { key: 'minimal_decorative', left: 'Minimal', right: 'Decorative' },
      { key: 'bold_subtle', left: 'Bold', right: 'Subtle' },
    ],
  },
  {
    group: 'PERSONALITY',
    items: [
      { key: 'playful_formal', left: 'Playful', right: 'Formal' },
      { key: 'emotional_rational', left: 'Emotional', right: 'Rational' },
    ],
  },
  {
    group: 'CULTURAL POSITION',
    items: [
      { key: 'approachable_aspirational', left: 'Approachable', right: 'Aspirational' },
      { key: 'rebellion_authority', left: 'Rebellion', right: 'Authority' },
      { key: 'mass_niche', left: 'Mass', right: 'Niche' },
    ],
  },
  {
    group: 'STRATEGIC ORIENTATION',
    items: [
      { key: 'innovation_craft', left: 'Innovation', right: 'Craft' },
      { key: 'broad_focused', left: 'Broad', right: 'Focused' },
    ],
  },
]

const ALL_KEYS = SPECTRUMS.flatMap(g => g.items.map(i => i.key))
const DEFAULT_VALUES = Object.fromEntries(ALL_KEYS.map(k => [k, 0]))
const MAX_FILE_MB = 5

function passes(imageValue, sliderValue) {
  if (sliderValue === 0) return true
  const tolerance = (3 - Math.abs(sliderValue)) + 1
  return Math.abs(imageValue - sliderValue) <= tolerance
}

function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result.split(',')[1])
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

export default function App() {
  const [values, setValues]       = useState(DEFAULT_VALUES)
  const [uploaded, setUploaded]   = useState({})   // { name: { url, tags } }
  const [tagging, setTagging]     = useState([])   // names in-flight
  const [tagErrors, setTagErrors] = useState([])   // names that failed
  const fileInputRef = useRef(null)

  // All image names: static + uploaded
  const images = useMemo(
    () => [...Object.keys(metadata), ...Object.keys(uploaded)],
    [uploaded]
  )

  // Blob URL map for uploaded images
  const urlMap = useMemo(
    () => Object.fromEntries(Object.entries(uploaded).map(([n, { url }]) => [n, url])),
    [uploaded]
  )

  // Merged metadata
  const allMeta = useMemo(() => ({
    ...metadata,
    ...Object.fromEntries(Object.entries(uploaded).map(([n, { tags }]) => [n, tags])),
  }), [uploaded])

  const activeCount = useMemo(
    () => ALL_KEYS.filter(k => values[k] !== 0).length,
    [values]
  )

  const visibleSet = useMemo(() => {
    const s = new Set()
    for (const filename of images) {
      const meta = allMeta[filename] || {}
      if (ALL_KEYS.every(key => passes(meta[key] ?? 0, values[key]))) s.add(filename)
    }
    return s
  }, [images, allMeta, values])

  const sortedImages = useMemo(() => (
    [...images].sort((a, b) => (visibleSet.has(a) ? 0 : 1) - (visibleSet.has(b) ? 0 : 1))
  ), [images, visibleSet])

  function handleChange(key, val) {
    setValues(prev => ({ ...prev, [key]: val }))
  }

  function handleReset() {
    setValues(DEFAULT_VALUES)
  }

  async function handleFileSelect(e) {
    const files = Array.from(e.target.files)
    e.target.value = ''
    if (!files.length) return

    const tooBig = files.filter(f => f.size > MAX_FILE_MB * 1024 * 1024)
    if (tooBig.length) {
      alert(`Skipped (>${MAX_FILE_MB}MB):\n${tooBig.map(f => f.name).join('\n')}`)
    }
    const valid = files.filter(f => f.size <= MAX_FILE_MB * 1024 * 1024)
    if (!valid.length) return

    setTagging(prev => [...prev, ...valid.map(f => f.name)])
    setTagErrors(prev => prev.filter(n => !valid.find(f => f.name === n)))

    for (const file of valid) {
      const blobUrl = URL.createObjectURL(file)
      try {
        const imageData = await fileToBase64(file)
        const res = await fetch('/api/tag', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ imageData, mimeType: file.type }),
        })
        if (!res.ok) throw new Error(await res.text())
        const tags = await res.json()
        setUploaded(prev => ({ ...prev, [file.name]: { url: blobUrl, tags } }))
        setTagging(prev => prev.filter(n => n !== file.name))
      } catch (err) {
        console.error('Tag error:', file.name, err)
        setTagErrors(prev => [...prev, file.name])
        setTagging(prev => prev.filter(n => n !== file.name))
        URL.revokeObjectURL(blobUrl)
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
      href: URL.createObjectURL(blob),
      download: 'spectrum-results.json',
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
            <span className="sidebar__count-total"> / {images.length}</span>
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

        <ImageGrid images={sortedImages} visibleSet={visibleSet} urlMap={urlMap} />
      </main>
    </div>
  )
}
