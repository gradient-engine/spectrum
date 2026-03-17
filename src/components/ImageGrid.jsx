import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import './ImageGrid.css'

const EASE_OUT = [0.25, 0.46, 0.45, 0.94]
const EASE_IN  = [0.55, 0.00, 0.55, 0.85]

function IconEye() {
  return (
    <svg viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M1 8s2.5-5 7-5 7 5 7 5-2.5 5-7 5-7-5-7-5z" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round"/>
      <circle cx="8" cy="8" r="2" stroke="currentColor" strokeWidth="1.3"/>
    </svg>
  )
}

function IconEyeOff() {
  return (
    <svg viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M1 8s2.5-5 7-5 7 5 7 5-2.5 5-7 5-7-5-7-5z" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round"/>
      <circle cx="8" cy="8" r="2" stroke="currentColor" strokeWidth="1.3"/>
      <line x1="2.5" y1="2.5" x2="13.5" y2="13.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
    </svg>
  )
}

function IconX() {
  return (
    <svg viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
      <line x1="3.5" y1="3.5" x2="12.5" y2="12.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
      <line x1="12.5" y1="3.5" x2="3.5" y2="12.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
    </svg>
  )
}

export default function ImageGrid({
  images,
  visibleSet,
  hiddenSet   = new Set(),
  showHidden  = false,
  urlMap      = {},
  onHide,
  onUnhide,
  onDelete,
}) {
  const [lightbox, setLightbox] = useState(null)

  if (images.length === 0) {
    return (
      <div className="image-grid__empty">
        <p>Upload images using the <strong>+ Add Images</strong> button,<br />
        or drop them into <code>public/images/</code> and run the tagging script.</p>
      </div>
    )
  }

  return (
    <>
      <div className="image-grid">
        {images.map(filename => {
          const isVisible        = visibleSet.has(filename)
          const isManuallyHidden = hiddenSet.has(filename)
          const dimmed           = !isVisible || isManuallyHidden
          const src              = urlMap[filename] || `/images/${filename}`

          return (
            <motion.div
              key={filename}
              initial={{ opacity: 0, scale: 0.92 }}
              animate={
                dimmed
                  ? {
                      opacity: 0.07, scale: 0.97, filter: 'grayscale(100%)',
                      transition: {
                        opacity: { duration: 0.35, ease: EASE_IN },
                        scale:   { duration: 0.35, ease: EASE_IN },
                        filter:  { duration: 0.35, ease: EASE_IN },
                      },
                    }
                  : {
                      opacity: 1, scale: 1, filter: 'grayscale(0%)',
                      transition: {
                        opacity: { duration: 0.45, ease: EASE_OUT },
                        scale:   { duration: 0.45, ease: EASE_OUT },
                        filter:  { duration: 0.45, ease: EASE_OUT },
                      },
                    }
              }
              className={`image-grid__item${dimmed ? ' image-grid__item--dimmed' : ''}`}
              onClick={() => !dimmed && setLightbox(filename)}
            >
              <img src={src} alt={filename} loading="lazy" />

              {!dimmed && (
                <div className="image-grid__overlay">
                  <span className="image-grid__name">{filename}</span>
                </div>
              )}

              <div className="image-grid__actions">
                {isManuallyHidden ? (
                  <button
                    className="image-grid__action"
                    title="Unhide"
                    onClick={e => { e.stopPropagation(); onUnhide?.(filename) }}
                  >
                    <IconEyeOff />
                  </button>
                ) : (
                  <button
                    className="image-grid__action"
                    title="Hide"
                    onClick={e => { e.stopPropagation(); onHide?.(filename) }}
                  >
                    <IconEye />
                  </button>
                )}
                <button
                  className="image-grid__action image-grid__action--delete"
                  title="Remove"
                  onClick={e => { e.stopPropagation(); onDelete?.(filename) }}
                >
                  <IconX />
                </button>
              </div>
            </motion.div>
          )
        })}
      </div>

      <AnimatePresence>
        {lightbox && (
          <motion.div
            className="lightbox"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1, transition: { duration: 0.2 } }}
            exit={{ opacity: 0, transition: { duration: 0.18 } }}
            onClick={() => setLightbox(null)}
          >
            <motion.img
              src={urlMap[lightbox] || `/images/${lightbox}`}
              alt={lightbox}
              initial={{ scale: 0.88, opacity: 0 }}
              animate={{ scale: 1, opacity: 1, transition: { duration: 0.28, ease: EASE_OUT } }}
              exit={{ scale: 0.92, opacity: 0, transition: { duration: 0.2, ease: EASE_IN } }}
            />
            <button className="lightbox__close" onClick={() => setLightbox(null)}>✕</button>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
