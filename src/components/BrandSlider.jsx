import './BrandSlider.css'

export default function BrandSlider({ leftLabel, rightLabel, value, onChange }) {
  const pct = ((value + 3) / 6) * 100

  return (
    <div className="brand-slider">
      <div className="brand-slider__labels">
        <span className={`brand-slider__label ${value < 0 ? 'brand-slider__label--active' : ''}`}>
          {leftLabel}
        </span>
        <span className={`brand-slider__label ${value > 0 ? 'brand-slider__label--active brand-slider__label--right' : 'brand-slider__label--right'}`}>
          {rightLabel}
        </span>
      </div>
      <div className="brand-slider__track-wrapper">
        <div className="brand-slider__track">
          <div className="brand-slider__center-tick" />
          <div
            className="brand-slider__fill"
            style={{
              left: value >= 0 ? '50%' : `${pct}%`,
              width: value === 0 ? 0 : value > 0 ? `${pct - 50}%` : `${50 - pct}%`,
            }}
          />
        </div>
        <input
          type="range"
          min={-3}
          max={3}
          step={1}
          value={value}
          onChange={e => onChange(Number(e.target.value))}
          className="brand-slider__input"
          style={{ '--thumb-pct': `${pct}%` }}
        />
      </div>
      <div className="brand-slider__ticks">
        {[-3, -2, -1, 0, 1, 2, 3].map(v => (
          <div key={v} className={`brand-slider__tick ${v === 0 ? 'brand-slider__tick--center' : ''} ${v === value ? 'brand-slider__tick--active' : ''}`} />
        ))}
      </div>
    </div>
  )
}
