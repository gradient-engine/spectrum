import { useMemo, useRef, useEffect, useState } from 'react'
import { motion }    from 'framer-motion'
import brandProfiles from '../data/brandProfiles.json'
import './BrandMap.css'

const LENSES = [
  { id: 'market',   name: 'Market Position',  x: 'minimal_decorative',        y: 'rebellion_authority'   },
  { id: 'audience', name: 'Audience Signal',   x: 'approachable_aspirational', y: 'mass_niche'            },
  { id: 'energy',   name: 'Brand Energy',      x: 'bold_subtle',               y: 'playful_formal'        },
  { id: 'trust',    name: 'Trust vs Edge',     x: 'playful_formal',            y: 'rebellion_authority'   },
]

// SVG viewBox dimensions
const W   = 900
const H   = 520
const PAD = { top: 56, right: 130, bottom: 56, left: 130 }
const PW  = W - PAD.left - PAD.right
const PH  = H - PAD.top  - PAD.bottom

// Target visual sizes in CSS px — never changes
const PX_AXIS  = 10   // matches .brand-slider__label
const PX_BRAND = 12   // matches .slider-group__label
const PX_BOARD = 10

const CHAR_RATIO = 0.58
const GAP        = 4

function toX(v) { return PAD.left + ((v + 3) / 6) * PW }
function toY(v) { return PAD.top  + ((3 - v) / 6) * PH }

// charW and labelH are in SVG units (already scaled)
function layoutLabels(entries, lensX, lensY, charW, labelH) {
  const placed = []
  return entries.map(([name, profile]) => {
    const dx = toX(profile[lensX] ?? 0)
    const dy = toY(profile[lensY] ?? 0)
    const lw = name.length * charW

    const candidates = [
      { lx: dx + 9,       ly: dy + labelH * 0.4   },
      { lx: dx + 9,       ly: dy - labelH * 0.8   },
      { lx: dx + 9,       ly: dy + labelH * 1.6   },
      { lx: dx - lw - 9,  ly: dy + labelH * 0.4   },
      { lx: dx - lw - 9,  ly: dy - labelH * 0.8   },
      { lx: dx - lw - 9,  ly: dy + labelH * 1.6   },
      { lx: dx - lw / 2,  ly: dy - labelH * 1.4   },
      { lx: dx - lw / 2,  ly: dy + labelH * 2.2   },
      { lx: dx + 9,       ly: dy + labelH * 2.8   },
      { lx: dx + 9,       ly: dy - labelH * 2.2   },
    ]

    let chosen = candidates[0]
    for (const c of candidates) {
      const overlaps = placed.some(p =>
        c.lx         < p.x2 + GAP &&
        c.lx + lw    > p.x1 - GAP &&
        c.ly - labelH < p.y2 + GAP &&
        c.ly         > p.y1 - GAP
      )
      if (!overlaps) { chosen = c; break }
    }
    placed.push({ x1: chosen.lx, y1: chosen.ly - labelH, x2: chosen.lx + lw, y2: chosen.ly })
    return { name, dx, dy, lx: chosen.lx, ly: chosen.ly }
  })
}

export default function BrandMap({ boardPosition, spectrums, lensId = 'market' }) {
  const lens   = LENSES.find(l => l.id === lensId) ?? LENSES[0]
  const svgRef = useRef(null)

  // svgScale: how many SVG units = 1 CSS px at current render size
  // e.g. SVG viewBox 900px wide rendered at 600px → scale = 900/600 = 1.5
  // so to display 12px visually, use fontSize = 12 * 1.5 = 18 SVG units
  const [svgScale, setSvgScale] = useState(W / 700)

  useEffect(() => {
    const el = svgRef.current
    if (!el) return
    const update = () => {
      const w = el.getBoundingClientRect().width
      if (w > 0) setSvgScale(W / w)
    }
    update()
    const ro = new ResizeObserver(update)
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  // Font sizes in SVG units that render at exactly the target CSS px
  const fAxis  = PX_AXIS  * svgScale
  const fBrand = PX_BRAND * svgScale
  const fBoard = PX_BOARD * svgScale

  const charW  = fBrand * CHAR_RATIO
  const labelH = fBrand

  function getLabels(key) {
    for (const g of spectrums) {
      const item = g.items.find(i => i.key === key)
      if (item) return { left: item.left.toUpperCase(), right: item.right.toUpperCase() }
    }
    return { left: '', right: '' }
  }

  const xL     = getLabels(lens.x)
  const yL     = getLabels(lens.y)
  const brands = useMemo(() => Object.entries(brandProfiles), [])

  const labelPositions = useMemo(
    () => layoutLabels(brands, lens.x, lens.y, charW, labelH),
    [brands, lens.x, lens.y, charW, labelH]
  )

  const bx = boardPosition ? toX(boardPosition[lens.x] ?? 0) : null
  const by = boardPosition ? toY(boardPosition[lens.y] ?? 0) : null

  // Board dot radius scales inversely so it stays visually consistent
  const rBrand = 4   * svgScale
  const rRing  = 10  * svgScale
  const rDot   =  2.5 * svgScale

  return (
    <div className="brand-map">
      <div className="brand-map__wrap">
        <svg
          ref={svgRef}
          viewBox={`0 0 ${W} ${H}`}
          className="brand-map__svg"
          preserveAspectRatio="xMidYMid meet"
        >
          {/* Center axes */}
          <line x1={toX(0)} y1={PAD.top - 20} x2={toX(0)} y2={PAD.top + PH + 20} className="brand-map__axis" />
          <line x1={PAD.left - 20} y1={toY(0)} x2={PAD.left + PW + 20} y2={toY(0)} className="brand-map__axis" />

          {/* Axis labels — IBM Plex Mono 10px, uppercase, tracked */}
          <text x={PAD.left + PW / 2} y={PAD.top - 28}      textAnchor="middle"            fontSize={fAxis} className="brand-map__edge-label">{yL.right}</text>
          <text x={PAD.left + PW / 2} y={PAD.top + PH + 42} textAnchor="middle"            fontSize={fAxis} className="brand-map__edge-label">{yL.left}</text>
          <text x={PAD.left - 28}     y={PAD.top + PH / 2}  textAnchor="end"   dominantBaseline="middle" fontSize={fAxis} className="brand-map__edge-label">{xL.left}</text>
          <text x={PAD.left + PW + 28} y={PAD.top + PH / 2} textAnchor="start" dominantBaseline="middle" fontSize={fAxis} className="brand-map__edge-label">{xL.right}</text>

          {/* Brand dots + labels — Helvetica Neue 600 12px */}
          {labelPositions.map(({ name, dx, dy, lx, ly }) => (
            <g key={name} className="brand-map__brand">
              <circle cx={dx} cy={dy} r={rBrand} className="brand-map__brand-dot" />
              <text x={lx} y={ly} fontSize={fBrand} className="brand-map__brand-name">{name}</text>
            </g>
          ))}

          {/* Your board — minimal ring + dot */}
          {bx !== null && (
            <motion.g
              animate={{ x: bx, y: by }}
              initial={{ x: bx, y: by }}
              transition={{ type: 'spring', stiffness: 120, damping: 22 }}
            >
              <circle r={rRing} className="brand-map__board-ring" />
              <circle r={rDot}  className="brand-map__board-dot"  />
              <text x={0} y={rRing + fBoard * 1.6} textAnchor="middle" fontSize={fBoard} className="brand-map__board-label">your board</text>
            </motion.g>
          )}

          {bx === null && (
            <text x={W / 2} y={H / 2} textAnchor="middle" dominantBaseline="middle" fontSize={fAxis} className="brand-map__empty">
              MOVE ANY SLIDER TO SEE YOUR POSITION
            </text>
          )}
        </svg>
      </div>
    </div>
  )
}
