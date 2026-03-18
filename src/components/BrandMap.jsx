import { useState, useMemo } from 'react'
import { motion }            from 'framer-motion'
import brandProfiles         from '../data/brandProfiles.json'
import './BrandMap.css'

const LENSES = [
  { id: 'market',   name: 'Market Position',  x: 'minimal_decorative',        y: 'rebellion_authority'   },
  { id: 'audience', name: 'Audience Signal',   x: 'approachable_aspirational', y: 'mass_niche'            },
  { id: 'energy',   name: 'Brand Energy',      x: 'bold_subtle',               y: 'playful_formal'        },
  { id: 'trust',    name: 'Trust vs Edge',     x: 'playful_formal',            y: 'rebellion_authority'   },
]

const W   = 760
const H   = 520
const PAD = { top: 52, right: 120, bottom: 52, left: 120 }
const PW  = W - PAD.left - PAD.right   // 520
const PH  = H - PAD.top  - PAD.bottom  // 416

const CHAR_W  = 5.8   // approx px per char at font-size 9px
const LABEL_H = 10
const GAP     = 3     // minimum gap between label bounding boxes

function toX(v) { return PAD.left + ((v + 3) / 6) * PW }
function toY(v) { return PAD.top  + ((3 - v) / 6) * PH }

// Returns label positions with collision avoidance
function layoutLabels(entries, lensX, lensY) {
  const placed = []

  return entries.map(([name, profile]) => {
    const dx  = toX(profile[lensX] ?? 0)
    const dy  = toY(profile[lensY] ?? 0)
    const lw  = name.length * CHAR_W

    const candidates = [
      { lx: dx + 8,       ly: dy + 4    },  // right-middle
      { lx: dx + 8,       ly: dy - 8    },  // right-up
      { lx: dx + 8,       ly: dy + 16   },  // right-down
      { lx: dx - lw - 8,  ly: dy + 4    },  // left-middle
      { lx: dx - lw - 8,  ly: dy - 8    },  // left-up
      { lx: dx - lw - 8,  ly: dy + 16   },  // left-down
      { lx: dx - lw / 2,  ly: dy - 14   },  // above
      { lx: dx - lw / 2,  ly: dy + 22   },  // below
      { lx: dx + 8,       ly: dy + 28   },  // right-far-down
      { lx: dx + 8,       ly: dy - 22   },  // right-far-up
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

export default function BrandMap({ boardPosition, spectrums }) {
  const [lensId, setLensId] = useState('market')
  const lens    = LENSES.find(l => l.id === lensId)

  function getLabels(key) {
    for (const g of spectrums) {
      const item = g.items.find(i => i.key === key)
      if (item) return { left: item.left, right: item.right }
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

      {/* Lens pills */}
      <div className="brand-map__lenses">
        {LENSES.map(l => (
          <button
            key={l.id}
            className={`brand-map__lens${lensId === l.id ? ' brand-map__lens--active' : ''}`}
            onClick={() => setLensId(l.id)}
          >
            {l.name}
          </button>
        ))}
      </div>

      {/* Map */}
      <div className="brand-map__wrap">
        <svg viewBox={`0 0 ${W} ${H}`} className="brand-map__svg" preserveAspectRatio="xMidYMid meet">
          <defs>
            <pattern id="dotgrid" x={PAD.left % 36} y={PAD.top % 36} width="36" height="36" patternUnits="userSpaceOnUse">
              <circle cx="18" cy="18" r="1" className="brand-map__dot-fill" />
            </pattern>
          </defs>

          {/* Full dotted canvas */}
          <rect x="0" y="0" width={W} height={H} fill="url(#dotgrid)" />

          {/* Center axes only */}
          <line x1={toX(0)} y1={PAD.top} x2={toX(0)} y2={PAD.top + PH} className="brand-map__axis" />
          <line x1={PAD.left} y1={toY(0)} x2={PAD.left + PW} y2={toY(0)} className="brand-map__axis" />

          {/* Axis edge labels */}
          <text x={PAD.left + PW / 2} y={PAD.top - 20}       textAnchor="middle"            className="brand-map__edge-label">{yL.right}</text>
          <text x={PAD.left + PW / 2} y={PAD.top + PH + 36}  textAnchor="middle"            className="brand-map__edge-label">{yL.left}</text>
          <text x={PAD.left - 20}     y={PAD.top + PH / 2}   textAnchor="end"   dominantBaseline="middle" className="brand-map__edge-label">{xL.left}</text>
          <text x={PAD.left + PW + 20} y={PAD.top + PH / 2}  textAnchor="start" dominantBaseline="middle" className="brand-map__edge-label">{xL.right}</text>

          {/* Brand dots + labels */}
          {labelPositions.map(({ name, dx, dy, lx, ly }) => (
            <g key={name} className="brand-map__brand">
              <circle cx={dx} cy={dy} r={4} className="brand-map__brand-dot" />
              <text x={lx} y={ly} className="brand-map__brand-name">{name}</text>
            </g>
          ))}

          {/* Your board marker */}
          {bx !== null && (
            <motion.g
              animate={{ x: bx, y: by }}
              initial={{ x: bx, y: by }}
              transition={{ type: 'spring', stiffness: 120, damping: 22 }}
            >
              <circle r={13} className="brand-map__board-ring" />
              <circle r={5}  className="brand-map__board-dot"  />
              <text x={18} y={-13} className="brand-map__board-label">Your board</text>
            </motion.g>
          )}

          {/* Empty state */}
          {bx === null && (
            <text x={W / 2} y={H / 2} textAnchor="middle" dominantBaseline="middle" className="brand-map__empty">
              Filter images to see your board position
            </text>
          )}
        </svg>
      </div>
    </div>
  )
}
