import { useState, useMemo } from 'react'
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

/** Returns true if image passes the given slider position on one dimension */
function passes(imageValue, sliderValue) {
  if (sliderValue === 0) return true
  const tolerance = (3 - Math.abs(sliderValue)) + 1
  return Math.abs(imageValue - sliderValue) <= tolerance
}

export default function App() {
  const [values, setValues] = useState(DEFAULT_VALUES)

  const images = useMemo(() => Object.keys(metadata), [])

  const activeCount = useMemo(
    () => ALL_KEYS.filter(k => values[k] !== 0).length,
    [values]
  )

  const visibleSet = useMemo(() => {
    const visible = new Set()
    for (const filename of images) {
      const meta = metadata[filename] || {}
      const show = ALL_KEYS.every(key => passes(meta[key] ?? 0, values[key]))
      if (show) visible.add(filename)
    }
    return visible
  }, [images, values])

  const sortedImages = useMemo(() => {
    return [...images].sort((a, b) => {
      const aVisible = visibleSet.has(a) ? 0 : 1
      const bVisible = visibleSet.has(b) ? 0 : 1
      return aVisible - bVisible
    })
  }, [images, visibleSet])

  function handleChange(key, val) {
    setValues(prev => ({ ...prev, [key]: val }))
  }

  function handleReset() {
    setValues(DEFAULT_VALUES)
  }

  const isFiltering = activeCount > 0

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
        <ImageGrid images={sortedImages} visibleSet={visibleSet} />
      </main>
    </div>
  )
}
