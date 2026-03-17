import { useState } from 'react'
import './ImageGrid.css'

export default function ImageGrid({ images, visibleSet }) {
  const [lightbox, setLightbox] = useState(null)

  if (images.length === 0) {
    return (
      <div className="image-grid__empty">
        <p>Drop images into <code>public/images/</code> and run the tagging script.</p>
      </div>
    )
  }

  return (
    <>
      <div className="image-grid">
        {images.map(filename => {
          const isVisible = visibleSet.has(filename)
          return (
            <div
              key={filename}
              className={`image-grid__item ${isVisible ? 'image-grid__item--visible' : 'image-grid__item--hidden'}`}
              onClick={() => isVisible && setLightbox(filename)}
            >
              <img src={`/images/${filename}`} alt={filename} loading="lazy" />
              <div className="image-grid__overlay">
                <span className="image-grid__name">{filename}</span>
              </div>
            </div>
          )
        })}
      </div>

      {lightbox && (
        <div className="lightbox" onClick={() => setLightbox(null)}>
          <img src={`/images/${lightbox}`} alt={lightbox} />
          <button className="lightbox__close" onClick={() => setLightbox(null)}>✕</button>
        </div>
      )}
    </>
  )
}
