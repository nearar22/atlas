'use client'

import { useEffect, useRef, useState } from 'react'
import { GRID_COLS, GRID_ROWS, type RegionRecord } from '@/lib/contract'

interface Props {
  regions: RegionRecord[]
  onSelect: (coord: string, region: RegionRecord | null) => void
  selected: string | null
}

const PARCHMENT = '#f4ecd8'
const SEPIA = '#4a3622'
const GREEN = '#1f6f5c'
const OXBLOOD = '#7c2d2d'

export default function WorldMap({ regions, onSelect, selected }: Props) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const wrapRef = useRef<HTMLDivElement | null>(null)
  const [hover, setHover] = useState<string | null>(null)
  const stateRef = useRef({ regions, hover, selected })
  stateRef.current = { regions, hover, selected }

  // map a pointer position to a grid coord
  const cellFromEvent = (e: React.MouseEvent): { coord: string } | null => {
    const canvas = canvasRef.current
    const wrap = wrapRef.current
    if (!canvas || !wrap) return null
    const rect = wrap.getBoundingClientRect()
    const pad = Math.min(rect.width, rect.height) * 0.085
    const gw = rect.width - pad * 2
    const gh = rect.height - pad * 2
    const cw = gw / GRID_COLS
    const ch = gh / GRID_ROWS
    const x = e.clientX - rect.left - pad
    const y = e.clientY - rect.top - pad
    if (x < 0 || y < 0 || x > gw || y > gh) return null
    const col = Math.floor(x / cw)
    const row = Math.floor(y / ch)
    if (col < 0 || col >= GRID_COLS || row < 0 || row >= GRID_ROWS) return null
    const coord = String.fromCharCode(65 + col) + String(row + 1)
    return { coord }
  }

  useEffect(() => {
    const canvas = canvasRef.current
    const wrap = wrapRef.current
    if (!canvas || !wrap) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    let raf = 0
    let t = 0
    let running = true
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2)
      const rect = wrap.getBoundingClientRect()
      canvas.width = Math.max(1, Math.floor(rect.width * dpr))
      canvas.height = Math.max(1, Math.floor(rect.height * dpr))
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    }
    resize()
    const ro = new ResizeObserver(resize)
    ro.observe(wrap)

    // deterministic pseudo-random for stable sea stipple + coastline
    const rnd = (n: number) => {
      const x = Math.sin(n * 127.1 + 311.7) * 43758.5453
      return x - Math.floor(x)
    }

    const draw = () => {
      const rect = wrap.getBoundingClientRect()
      const W = rect.width
      const H = rect.height
      const pad = Math.min(W, H) * 0.085
      const gw = W - pad * 2
      const gh = H - pad * 2
      const cw = gw / GRID_COLS
      const ch = gh / GRID_ROWS
      const reveal = reduced ? 1 : Math.min(1, t / 90)

      ctx.clearRect(0, 0, W, H)

      // sea stipple background
      ctx.fillStyle = 'rgba(31, 111, 92, 0.05)'
      for (let i = 0; i < 420; i++) {
        const sx = rnd(i) * W
        const sy = rnd(i + 99) * H
        const r = 0.6 + rnd(i + 7) * 1.1
        ctx.beginPath()
        ctx.arc(sx, sy, r, 0, Math.PI * 2)
        ctx.fill()
      }

      // wavering contour hatching (drawn coastlines inking in)
      ctx.strokeStyle = 'rgba(74, 54, 34, 0.1)'
      ctx.lineWidth = 1
      const contours = 5
      for (let c = 0; c < contours; c++) {
        const prog = Math.min(1, reveal * contours - c)
        if (prog <= 0) continue
        ctx.beginPath()
        const baseR = Math.min(gw, gh) * (0.18 + c * 0.09)
        const steps = 80
        for (let s = 0; s <= steps * prog; s++) {
          const a = (s / steps) * Math.PI * 2
          const wob = Math.sin(a * 5 + c * 1.7 + t * 0.01) * baseR * 0.08
          const rr = baseR + wob
          const px = W / 2 + Math.cos(a) * rr * 1.15
          const py = H / 2 + Math.sin(a) * rr * 0.82
          if (s === 0) ctx.moveTo(px, py)
          else ctx.lineTo(px, py)
        }
        ctx.stroke()
      }

      // grid graticule
      ctx.strokeStyle = 'rgba(74, 54, 34, 0.18)'
      ctx.lineWidth = 1
      const gridReveal = reduced ? 1 : Math.min(1, t / 60)
      for (let i = 0; i <= GRID_COLS; i++) {
        const x = pad + i * cw
        ctx.beginPath()
        ctx.moveTo(x, pad)
        ctx.lineTo(x, pad + gh * gridReveal)
        ctx.stroke()
      }
      for (let j = 0; j <= GRID_ROWS; j++) {
        const y = pad + j * ch
        ctx.beginPath()
        ctx.moveTo(pad, y)
        ctx.lineTo(pad + gw * gridReveal, y)
        ctx.stroke()
      }

      // coordinate labels
      ctx.fillStyle = 'rgba(74, 54, 34, 0.55)'
      ctx.font = `${Math.max(9, cw * 0.22)}px 'Spline Sans Mono', monospace`
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      for (let i = 0; i < GRID_COLS; i++) {
        ctx.fillText(String.fromCharCode(65 + i), pad + i * cw + cw / 2, pad - pad * 0.32)
      }
      for (let j = 0; j < GRID_ROWS; j++) {
        ctx.fillText(String(j + 1), pad - pad * 0.34, pad + j * ch + ch / 2)
      }

      // claimed canon tiles
      const { regions: regs, hover: hv, selected: sel } = stateRef.current
      const claimed = new Set(regs.map((r) => r.coord))
      regs.forEach((r) => {
        const col = r.coord.charCodeAt(0) - 65
        const row = parseInt(r.coord.slice(1), 10) - 1
        if (col < 0 || row < 0) return
        const x = pad + col * cw
        const y = pad + row * ch
        ctx.fillStyle = 'rgba(31, 111, 92, 0.16)'
        ctx.fillRect(x + 1, y + 1, cw - 2, ch - 2)
        ctx.strokeStyle = OXBLOOD
        ctx.lineWidth = 1.6
        ctx.strokeRect(x + 2, y + 2, cw - 4, ch - 4)
        // tiny contour hatch inside
        ctx.strokeStyle = 'rgba(31, 111, 92, 0.3)'
        ctx.lineWidth = 0.7
        for (let h = 0; h < 3; h++) {
          ctx.beginPath()
          ctx.moveTo(x + 4, y + ch * (0.3 + h * 0.22))
          ctx.lineTo(x + cw - 4, y + ch * (0.18 + h * 0.22))
          ctx.stroke()
        }
        // region initial
        ctx.fillStyle = SEPIA
        ctx.font = `700 ${Math.max(10, cw * 0.34)}px 'Cardo', serif`
        ctx.fillText(r.name.charAt(0).toUpperCase(), x + cw / 2, y + ch / 2)
      })

      // hover / selected highlight
      const markCell = (coord: string, color: string, lw: number) => {
        const col = coord.charCodeAt(0) - 65
        const row = parseInt(coord.slice(1), 10) - 1
        if (col < 0 || row < 0) return
        const x = pad + col * cw
        const y = pad + row * ch
        ctx.strokeStyle = color
        ctx.lineWidth = lw
        ctx.strokeRect(x + 1.5, y + 1.5, cw - 3, ch - 3)
      }
      if (hv && !claimed.has(hv)) markCell(hv, GREEN, 2)
      if (sel) markCell(sel, OXBLOOD, 2.4)

      // compass rose, slowly rotating
      const cx = W - pad * 0.62
      const cy = pad * 0.62
      const cr = pad * 0.42
      ctx.save()
      ctx.translate(cx, cy)
      if (!reduced) ctx.rotate(t * 0.0015)
      ctx.strokeStyle = SEPIA
      ctx.fillStyle = GREEN
      ctx.lineWidth = 1.2
      ctx.beginPath()
      ctx.arc(0, 0, cr, 0, Math.PI * 2)
      ctx.stroke()
      ctx.beginPath()
      ctx.arc(0, 0, cr * 0.66, 0, Math.PI * 2)
      ctx.stroke()
      for (let k = 0; k < 4; k++) {
        const a = (k * Math.PI) / 2
        ctx.save()
        ctx.rotate(a)
        ctx.beginPath()
        ctx.moveTo(0, -cr)
        ctx.lineTo(cr * 0.14, 0)
        ctx.lineTo(0, cr * 0.2)
        ctx.lineTo(-cr * 0.14, 0)
        ctx.closePath()
        ctx.fillStyle = k === 0 ? OXBLOOD : 'rgba(74,54,34,0.7)'
        ctx.fill()
        ctx.restore()
      }
      for (let k = 0; k < 4; k++) {
        const a = (k * Math.PI) / 2 + Math.PI / 4
        ctx.save()
        ctx.rotate(a)
        ctx.beginPath()
        ctx.moveTo(0, -cr * 0.7)
        ctx.lineTo(cr * 0.09, 0)
        ctx.lineTo(0, cr * 0.14)
        ctx.lineTo(-cr * 0.09, 0)
        ctx.closePath()
        ctx.fillStyle = 'rgba(74,54,34,0.4)'
        ctx.fill()
        ctx.restore()
      }
      ctx.restore()

      if (running && !reduced) {
        t += 1
        raf = requestAnimationFrame(draw)
      }
    }
    draw()
    if (reduced) {
      // draw a couple of frames so reveal completes
      t = 100
      draw()
    }

    const onVis = () => {
      if (document.hidden) {
        running = false
        cancelAnimationFrame(raf)
      } else if (!reduced) {
        running = true
        raf = requestAnimationFrame(draw)
      }
    }
    document.addEventListener('visibilitychange', onVis)

    return () => {
      running = false
      cancelAnimationFrame(raf)
      ro.disconnect()
      document.removeEventListener('visibilitychange', onVis)
    }
  }, [])

  const handleClick = (e: React.MouseEvent) => {
    const hit = cellFromEvent(e)
    if (!hit) return
    const region = stateRef.current.regions.find((r) => r.coord === hit.coord) ?? null
    onSelect(hit.coord, region)
  }

  const handleMove = (e: React.MouseEvent) => {
    const hit = cellFromEvent(e)
    setHover(hit ? hit.coord : null)
  }

  return (
    <div
      ref={wrapRef}
      className="map-pane"
      onClick={handleClick}
      onMouseMove={handleMove}
      onMouseLeave={() => setHover(null)}
      role="application"
      aria-label="Shared world map. Click a grid cell to inspect or claim a region."
      style={{ cursor: hover ? 'pointer' : 'crosshair' }}
    >
      <canvas ref={canvasRef} className="map-canvas" />
      <div className="map-instr">
        {hover ? `Cell ${hover} \u00b7 click to open` : 'Click any cell to claim or read its lore'}
      </div>
      <div className="map-legend" aria-hidden="true">
        <div className="legend-title">Map legend</div>
        <div className="lk">
          <span className="swatch" style={{ background: 'rgba(31,111,92,0.4)', border: '1.6px solid #7c2d2d' }} />
          Canon region (claimed)
        </div>
        <div className="lk">
          <span className="swatch" style={{ border: '2px solid #1f6f5c', background: 'transparent' }} />
          Cell under cursor
        </div>
        <div className="lk">
          <span className="swatch" style={{ background: 'rgba(31,111,92,0.06)' }} />
          Uncharted frontier
        </div>
      </div>
    </div>
  )
}
