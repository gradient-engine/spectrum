import { useState } from 'react'
import { motion }    from 'framer-motion'
import brandProfiles from '../data/brandProfiles.json'
import './BrandMap.css'

const LENSES = [
  { id: 'market',   name: 'Market Position',  x: 'minimal_decorative',        y: 'rebellion_authority'   },
  { id: 'audience', name: 'Audience Signal',   x: 'approachable_aspirational', y: 'mass_niche'            },
  { id: 'energy',   name: 'Brand Energy',      x: 'bold_subtle',               y: 'playful_formal'        },
  { id: 'trust',    name: 'Trust vs Edge',     x: 'playful_formal',            y: 'rebellion_authority'   },
]

const W   = 720
const H   = 500
const PAD = { top: 44, right: 108, bottom: 44, left: 108 }
const PW  = W - PAD.left - PAD.right
const PH  = H - PAD.top  - PAD.bottom

function toX(v) { return PAD.left + ((v + 3) / 6) * PW }
function toY(v) { return PAD.top  + ((3 - v) / 6) * PH }

export default function BrandMap({ boardPosition, spectrums }) {
  const [lensId, setLensId] = useState('market')
  const lens = LENSES.find(l => l.id === lensId)

  function getLabels(key) {
    for (const g of spectrums) {
      const item = g.items.find(i => i.key === key)
      if (item) return { left: item.left, right: item.right }
    }
    return { left: '', right: '' }
  }

  const xL   = getLabels(lens.x)
  const yL   = getLabels(lens.y)
  const brands = Object.entries(brandProfiles)
  const bx   = boardPosition ? toX(boardPosition[lens.x] ?? 0) : null
  const by   = boardPosition ? toY(boardPosition[lens.y] ?? 0) : null

  return (
    <div className="brand-map">

      {/* Lens selector */}
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

          {/* Plot background */}
          <rect x={PAD.left} y={PAD.top} width={PW} height={PH} className="brand-map__bg" rx={6} />

          {/* Grid lines */}
          {[-3, -2, -1, 0, 1, 2, 3].map(v => (
            <g key={v}>
              <line
                x1={toX(v)} y1={PAD.top}
                x2={toX(v)} y2={PAD.top + PH}
                className={v === 0 ? 'brand-map__axis' : 'brand-map__grid'}
              />
              <line
                x1={PAD.left}      y1={toY(v)}
                x2={PAD.left + PW} y2={toY(v)}
                className={v === 0 ? 'brand-map__axis' : 'brand-map__grid'}
              />
            </g>
          ))}

          {/* Axis labels — centered on each edge */}
          <text x={PAD.left + PW / 2} y={PAD.top - 14}       textAnchor="middle"            className="brand-map__edge-label">{yL.right}</text>
          <text x={PAD.left + PW / 2} y={PAD.top + PH + 30}  textAnchor="middle"            className="brand-map__edge-label">{yL.left}</text>
          <text x={PAD.left - 16}     y={PAD.top + PH / 2}   textAnchor="end"   dominantBaseline="middle" className="brand-map__edge-label">{xL.left}</text>
          <text x={PAD.left + PW + 16} y={PAD.top + PH / 2}  textAnchor="start" dominantBaseline="middle" className="brand-map__edge-label">{xL.right}</text>

          {/* Brand dots */}
          {brands.map(([name, profile]) => {
            const dx = toX(profile[lens.x] ?? 0)
            const dy = toY(profile[lens.y] ?? 0)
            return (
              <g key={name} className="brand-map__brand">
                <title>{name}</title>
                <circle cx={dx} cy={dy} r={4} className="brand-map__brand-dot" />
                <text x={dx + 7} y={dy + 4} className="brand-map__brand-name">{name}</text>
              </g>
            )
          })}

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
            <text
              x={W / 2} y={H / 2}
              textAnchor="middle" dominantBaseline="middle"
              className="brand-map__empty"
            >
              Filter images to see your board position
            </text>
          )}

        </svg>
      </div>
    </div>
  )
}
