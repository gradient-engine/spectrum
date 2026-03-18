import { useMemo }   from 'react'
import { motion }    from 'framer-motion'
import brandProfiles from '../data/brandProfiles.json'
import './BrandMap.css'

const LENSES = [
  { id: 'market',   name: 'Market Position',  x: 'minimal_decorative',        y: 'rebellion_authority'   },
  { id: 'audience', name: 'Audience Signal',   x: 'approachable_aspirational', y: 'mass_niche'            },
  { id: 'energy',   name: 'Brand Energy',      x: 'bold_subtle',               y: 'playful_formal'        },
  { id: 'trust',    name: 'Trust vs Edge',     x: 'playful_formal',            y: 'rebellion_authority'   },
]

const W   = 900
const H   = 520
const PAD = { top: 56, right: 130, bottom: 56, left: 130 }
const PW  = W - PAD.left - PAD.right
const PH  = H - PAD.top  - PAD.bottom

// SVG units — fonts appear ~1.4× larger at typical viewport
const F_AXIS  = 7    // → ~10px visual (matches slider label)
const F_BRAND = 8.5  // → ~12px visual (matches section header)
const F_BOARD = 7    // → ~10px visual

const CHAR_W  = F_BRAND * 0.58
const LABEL_H = F_BRAND
const GAP     = 5

function toX(v) { return PAD.left + ((v + 3) / 6) * PW }
function toY(v) { return PAD.top  + ((3 - v) / 6) * PH }

function layoutLabels(entries, lensX, lensY) {
  const placed = []
  return entries.map(([name, profile]) => {
    const dx = toX(profile[lensX] ?? 0)
    const dy = toY(profile[lensY] ?? 0)
    const lw = name.length * CHAR_W

    const candidates = [
      { lx: dx + 9,       ly: dy + 4    },
      { lx: dx + 9,       ly: dy - 7    },
      { lx: dx + 9,       ly: dy + 15   },
      { lx: dx - lw - 9,  ly: dy + 4    },
      { lx: dx - lw - 9,  ly: dy - 7    },
      { lx: dx - lw - 9,  ly: dy + 15   },
      { lx: dx - lw / 2,  ly: dy - 14   },
      { lx: dx - lw / 2,  ly: dy + 20   },
      { lx: dx + 9,       ly: dy + 26   },
      { lx: dx + 9,       ly: dy - 20   },
    ]

    let chosen = candidates[0]
    for (const c of candidates) {
      const overlaps = placed.some(p =>
        c.lx         < p.x2 + GAP &&
        c.lx + lw    > p.x1 - GAP &&
        c.ly - LABEL_H < p.y2 + GAP &&
        c.ly         > p.y1 - GAP
      )
      if (!overlaps) { chosen = c; break }
    }
    placed.push({ x1: chosen.lx, y1: chosen.ly - LABEL_H, x2: chosen.lx + lw, y2: chosen.ly })
    return { name, dx, dy, lx: chosen.lx, ly: chosen.ly }
  })
}

export default function BrandMap({ boardPosition, spectrums, lensId = 'market' }) {
  const lens = LENSES.find(l => l.id === lensId) ?? LENSES[0]

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
    () => layoutLabels(brands, lens.x, lens.y),
    [brands, lens.x, lens.y]
  )

  const bx = boardPosition ? toX(boardPosition[lens.x] ?? 0) : null
  const by = boardPosition ? toY(boardPosition[lens.y] ?? 0) : null

  return (
    <div className="brand-map">
      <div className="brand-map__wrap">
        <svg viewBox={`0 0 ${W} ${H}`} className="brand-map__svg" preserveAspectRatio="xMidYMid meet">

          {/* Center axes — thin solid lines */}
          <line x1={toX(0)} y1={PAD.top - 20} x2={toX(0)} y2={PAD.top + PH + 20} className="brand-map__axis" />
          <line x1={PAD.left - 20} y1={toY(0)} x2={PAD.left + PW + 20} y2={toY(0)} className="brand-map__axis" />

          {/* Axis labels — IBM Plex Mono, uppercase, matches slider labels */}
          <text x={PAD.left + PW / 2} y={PAD.top - 28}       textAnchor="middle"            fontSize={F_AXIS} className="brand-map__edge-label">{yL.right}</text>
          <text x={PAD.left + PW / 2} y={PAD.top + PH + 40}  textAnchor="middle"            fontSize={F_AXIS} className="brand-map__edge-label">{yL.left}</text>
          <text x={PAD.left - 26}     y={PAD.top + PH / 2}   textAnchor="end"   dominantBaseline="middle" fontSize={F_AXIS} className="brand-map__edge-label">{xL.left}</text>
          <text x={PAD.left + PW + 26} y={PAD.top + PH / 2}  textAnchor="start" dominantBaseline="middle" fontSize={F_AXIS} className="brand-map__edge-label">{xL.right}</text>

          {/* Brand dots + labels */}
          {labelPositions.map(({ name, dx, dy, lx, ly }) => (
            <g key={name} className="brand-map__brand">
              {/* Slider-thumb style dot */}
              <circle cx={dx} cy={dy} r={4.5} className="brand-map__brand-dot" />
              <text x={lx} y={ly} fontSize={F_BRAND} className="brand-map__brand-name">{name}</text>
            </g>
          ))}

          {/* Your board — crosshair target */}
          {bx !== null && (
            <motion.g
              animate={{ x: bx, y: by }}
              initial={{ x: bx, y: by }}
              transition={{ type: 'spring', stiffness: 120, damping: 22 }}
            >
              {/* Outer ring */}
              <circle r={14} className="brand-map__board-ring" />
              {/* Center dot */}
              <circle r={3.5} className="brand-map__board-dot" />
              {/* Crosshair ticks */}
              <line x1={-20} y1={0} x2={-16} y2={0} className="brand-map__board-cross" />
              <line x1={16}  y1={0} x2={20}  y2={0} className="brand-map__board-cross" />
              <line x1={0} y1={-20} x2={0} y2={-16} className="brand-map__board-cross" />
              <line x1={0} y1={16}  x2={0} y2={20}  className="brand-map__board-cross" />
              {/* Label */}
              <text x={0} y={30} textAnchor="middle" fontSize={F_BOARD} className="brand-map__board-label">YOUR BOARD</text>
            </motion.g>
          )}

          {bx === null && (
            <text x={W / 2} y={H / 2} textAnchor="middle" dominantBaseline="middle" fontSize={F_AXIS} className="brand-map__empty">
              MOVE ANY SLIDER TO SEE YOUR POSITION
            </text>
          )}
        </svg>
      </div>
    </div>
  )
}
