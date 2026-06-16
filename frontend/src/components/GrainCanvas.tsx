'use client'

import { useEffect, useRef } from 'react'

// A faint generative ink-grain drift behind the parchment. Canvas, DPR aware,
// paused when the tab is hidden, and disabled under prefers-reduced-motion.
export function GrainCanvas() {
  const ref = useRef<HTMLCanvasElement | null>(null)

  useEffect(() => {
    const canvas = ref.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const reduce =
      typeof window !== 'undefined' &&
      window.matchMedia &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches

    let raf = 0
    let running = true
    let t = 0

    const motes = Array.from({ length: 70 }, () => ({
      x: Math.random(),
      y: Math.random(),
      r: 0.4 + Math.random() * 1.4,
      a: 0.04 + Math.random() * 0.08,
      sx: (Math.random() - 0.5) * 0.00018,
      sy: (Math.random() - 0.5) * 0.00018,
    }))

    function resize() {
      if (!canvas) return
      const dpr = Math.min(window.devicePixelRatio || 1, 2)
      canvas.width = Math.floor(window.innerWidth * dpr)
      canvas.height = Math.floor(window.innerHeight * dpr)
      canvas.style.width = `${window.innerWidth}px`
      canvas.style.height = `${window.innerHeight}px`
      if (ctx) ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    }

    function draw() {
      if (!ctx || !canvas) return
      const w = window.innerWidth
      const h = window.innerHeight
      ctx.clearRect(0, 0, w, h)
      t += 0.0025
      for (const m of motes) {
        m.x += m.sx + Math.sin(t + m.y * 6) * 0.00006
        m.y += m.sy + Math.cos(t + m.x * 6) * 0.00006
        if (m.x < 0) m.x += 1
        if (m.x > 1) m.x -= 1
        if (m.y < 0) m.y += 1
        if (m.y > 1) m.y -= 1
        ctx.beginPath()
        ctx.arc(m.x * w, m.y * h, m.r, 0, Math.PI * 2)
        ctx.fillStyle = `rgba(92, 74, 50, ${m.a})`
        ctx.fill()
      }
      if (running) raf = requestAnimationFrame(draw)
    }

    function onVisibility() {
      if (document.hidden) {
        running = false
        cancelAnimationFrame(raf)
      } else if (!reduce) {
        running = true
        raf = requestAnimationFrame(draw)
      }
    }

    resize()
    window.addEventListener('resize', resize)
    document.addEventListener('visibilitychange', onVisibility)

    if (reduce) {
      draw()
      running = false
      cancelAnimationFrame(raf)
    } else {
      raf = requestAnimationFrame(draw)
    }

    return () => {
      running = false
      cancelAnimationFrame(raf)
      window.removeEventListener('resize', resize)
      document.removeEventListener('visibilitychange', onVisibility)
    }
  }, [])

  return (
    <canvas
      ref={ref}
      aria-hidden="true"
      style={{ position: 'fixed', inset: 0, width: '100%', height: '100%', zIndex: 0, pointerEvents: 'none' }}
    />
  )
}
