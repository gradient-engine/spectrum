import { useEffect, useRef } from 'react'
import { supabase } from '../lib/supabase'
import './Auth.css'

function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" width="18" height="18">
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
    </svg>
  )
}

function ParticleCanvas() {
  const canvasRef = useRef(null)

  useEffect(() => {
    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    let animId

    const resize = () => {
      canvas.width  = window.innerWidth
      canvas.height = window.innerHeight
    }
    resize()
    window.addEventListener('resize', resize)

    const COUNT = 55
    const dots = Array.from({ length: COUNT }, () => ({
      x:         Math.random() * window.innerWidth,
      y:         Math.random() * window.innerHeight,
      r:         Math.random() * 1.4 + 0.4,
      angle:     Math.random() * Math.PI * 2,
      speed:     Math.random() * 0.22 + 0.08,
      turnSpeed: (Math.random() - 0.5) * 0.012,
    }))

    function draw() {
      ctx.clearRect(0, 0, canvas.width, canvas.height)

      dots.forEach(d => {
        d.angle += d.turnSpeed
        d.x += Math.cos(d.angle) * d.speed
        d.y += Math.sin(d.angle) * d.speed

        if (d.x < -10)               d.x = canvas.width  + 10
        if (d.x > canvas.width  + 10) d.x = -10
        if (d.y < -10)               d.y = canvas.height + 10
        if (d.y > canvas.height + 10) d.y = -10

        ctx.beginPath()
        ctx.arc(d.x, d.y, d.r, 0, Math.PI * 2)
        ctx.fillStyle = 'rgba(255,255,255,0.15)'
        ctx.fill()
      })

      for (let i = 0; i < dots.length; i++) {
        for (let j = i + 1; j < dots.length; j++) {
          const dx   = dots[i].x - dots[j].x
          const dy   = dots[i].y - dots[j].y
          const dist = Math.sqrt(dx * dx + dy * dy)
          if (dist < 110) {
            ctx.beginPath()
            ctx.moveTo(dots[i].x, dots[i].y)
            ctx.lineTo(dots[j].x, dots[j].y)
            ctx.strokeStyle = `rgba(255,255,255,${0.10 * (1 - dist / 110)})`
            ctx.lineWidth = 0.5
            ctx.stroke()
          }
        }
      }

      animId = requestAnimationFrame(draw)
    }

    draw()

    return () => {
      cancelAnimationFrame(animId)
      window.removeEventListener('resize', resize)
    }
  }, [])

  return <canvas ref={canvasRef} className="auth__canvas" />
}

export default function Auth({ onGuest }) {
  async function handleGoogleSignIn() {
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: window.location.origin },
    })
  }

  return (
    <div className="auth-overlay">
      <ParticleCanvas />
      <div className="auth__card">
        <div className="auth__logo">
          <div className="auth__title">Spectrum</div>
          <div className="auth__sub">Brand Personality Filter</div>
        </div>
        <p className="auth__desc">
          Sign in to save your images and filters across all your devices.
        </p>
        <button className="auth__google-btn" onClick={handleGoogleSignIn}>
          <GoogleIcon />
          Continue with Google
        </button>
        {onGuest && (
          <button className="auth__guest-btn" onClick={onGuest}>
            Just exploring — I'll sign in later
          </button>
        )}
      </div>
    </div>
  )
}
