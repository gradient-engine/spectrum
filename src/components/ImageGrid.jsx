import { useState } from 'react'
import { motion, AnimatePresence, LayoutGroup } from 'framer-motion'
import './ImageGrid.css'

const EASE_OUT = [0.25, 0.46, 0.45, 0.94]
const EASE_IN  = [0.55, 0.00, 0.55, 0.85]

export default function ImageGrid({ images, visibleSet, urlMap = {} }) {
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
      <LayoutGroup>
        <motion.div className="image-grid" layout>
          {images.map(filename => {
            const isVisible = visibleSet.has(filename)
            const src = urlMap[filename] || `/images/${filename}`

            return (
              <motion.div
                key={filename}
                layout
                layoutId={filename}
                initial={{ opacity: 0, scale: 0.92 }}
                animate={
                  isVisible
                    ? {
                        opacity: 1,
                        scale: 1,
                        filter: 'grayscale(0%)',
                        transition: {
                          opacity: { duration: 0.45, ease: EASE_OUT },
                          scale:   { duration: 0.45, ease: EASE_OUT },
                          filter:  { duration: 0.45, ease: EASE_OUT },
                          layout:  { duration: 0.5,  ease: EASE_OUT },
                        },
                      }
                    : {
                        opacity: 0.07,
                        scale: 0.96,
                        filter: 'grayscale(100%)',
                        transition: {
                          opacity: { duration: 0.35, ease: EASE_IN },
                          scale:   { duration: 0.35, ease: EASE_IN },
                          filter:  { duration: 0.35, ease: EASE_IN },
                          layout:  { duration: 0.5,  ease: EASE_OUT },
                        },
                      }
                }
                className={`image-grid__item ${isVisible ? 'image-grid__item--visible' : 'image-grid__item--hidden'}`}
                onClick={() => isVisible && setLightbox(filename)}
              >
                <img src={src} alt={filename} loading="lazy" />
                <div className="image-grid__overlay">
                  <span className="image-grid__name">{filename}</span>
                </div>
              </motion.div>
            )
          })}
        </motion.div>
      </LayoutGroup>

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
