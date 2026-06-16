'use client'

import { useEffect, useRef, useState } from 'react'
import { GRID_COLS, GRID_ROWS, type RegionRecord } from '@/lib/contract'

interface Props {
  regions: RegionRecord[]
  onSelect: (coord: string, region: RegionRecord | null) => void
  selected: string | null
}

const SEPIA = '#4a3622'
const GREEN = '#1f6f5c'
const OXBLOOD = '#7c2d2d'
const GOLD = '#b08344'

// deterministic pseudo-random for stable stains, stipple and coastlines
const rnd = (n: number) => {
  const x = Math.sin(n * 127.1 + 311.7) * 43758.5453
  return x - Math.floor(x)
}

export default function WorldMap({ regions, onSelect, selected }: Props) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const wrapRef = useRef<HTMLDivElement | null>(null)
  const [hover, setHover] = useState<string | null>(null)
  const stateRef = useRef({ regions, hover, selected })
  stateRef.current = { regions, hover, selected }

  // track first-seen time per coord so fresh claims animate an ink bloom in
  const bloomRef = useRef<Map<string, number>>(new Map())

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

    // offscreen parchment texture, painted once per resize (expensive layered noise)
    const texCanvas = document.createElement('canvas')
    const texCtx = texCanvas.getContext('2d')

    let W = 0
    let H = 0
    let dpr = 1

    const paintParchment = () => {
      if (!texCtx) return
      texCanvas.width = canvas.width
      texCanvas.height = canvas.height
      texCtx.setTransform(dpr, 0, 0, dpr, 0, 0)
      texCtx.clearRect(0, 0, W, H)

      // warm parchment base gradient
      const base = texCtx.createLinearGradient(0, 0, W, H)
      base.addColorStop(0, '#f6efdc')
      base.addColorStop(0.5, '#f1e7cd')
      base.addColorStop(1, '#e9dcbb')
      texCtx.fillStyle = base
      texCtx.fillRect(0, 0, W, H)

      // broad uneven tint blooms (sun-aged unevenness)
      for (let i = 0; i < 26; i++) {
        const bx = rnd(i * 3.1) * W
        const by = rnd(i * 5.7 + 2) * H
        const br = (0.12 + rnd(i + 11) * 0.22) * Math.max(W, H)
        const g = texCtx.createRadialGradient(bx, by, 0, bx, by, br)
        const warm = rnd(i + 31) > 0.5
        g.addColorStop(0, warm ? 'rgba(176,131,68,0.06)' : 'rgba(124,45,45,0.035)')
        g.addColorStop(1, 'rgba(176,131,68,0)')
        texCtx.fillStyle = g
        texCtx.beginPath()
        texCtx.arc(bx, by, br, 0, Math.PI * 2)
        texCtx.fill()
      }

      // foxing: small age stains and speckles
      for (let i = 0; i < 240; i++) {
        const sx = rnd(i * 1.7 + 4) * W
        const sy = rnd(i * 2.3 + 9) * H
        const sr = 0.5 + rnd(i + 51) * 3.4
        const a = 0.015 + rnd(i + 71) * 0.05
        texCtx.fillStyle = `rgba(120, 84, 38, ${a})`
        texCtx.beginPath()
        texCtx.arc(sx, sy, sr, 0, Math.PI * 2)
        texCtx.fill()
      }

      // a few darker water-stain rings near the edges
      for (let i = 0; i < 7; i++) {
        const ex = rnd(i * 9.2 + 1) > 0.5 ? rnd(i + 3) * W * 0.28 : W - rnd(i + 3) * W * 0.28
        const ey = rnd(i * 4.4 + 6) * H
        const er = 30 + rnd(i + 13) * 90
        texCtx.strokeStyle = `rgba(110, 78, 36, ${0.04 + rnd(i + 2) * 0.05})`
        texCtx.lineWidth = 2 + rnd(i + 8) * 3
        texCtx.beginPath()
        texCtx.arc(ex, ey, er, 0, Math.PI * 2)
        texCtx.stroke()
      }

      // fine fibrous grain
      for (let i = 0; i < 900; i++) {
        const gx = rnd(i * 0.91 + 0.3) * W
        const gy = rnd(i * 1.13 + 0.7) * H
        texCtx.fillStyle = rnd(i + 5) > 0.5 ? 'rgba(255,250,235,0.05)' : 'rgba(90,64,30,0.04)'
        texCtx.fillRect(gx, gy, 1, 1)
      }

      // vignette: darkened, worn edges
      const vig = texCtx.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.32, W / 2, H / 2, Math.max(W, H) * 0.72)
      vig.addColorStop(0, 'rgba(58,42,24,0)')
      vig.addColorStop(1, 'rgba(58,42,24,0.26)')
      texCtx.fillStyle = vig
      texCtx.fillRect(0, 0, W, H)
    }

    const resize = () => {
      dpr = Math.min(window.devicePixelRatio || 1, 2)
      const rect = wrap.getBoundingClientRect()
      W = rect.width
      H = rect.height
      canvas.width = Math.max(1, Math.floor(W * dpr))
      canvas.height = Math.max(1, Math.floor(H * dpr))
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      paintParchment()
    }
    resize()
    const ro = new ResizeObserver(resize)
    ro.observe(wrap)

    const drawCompass = (cx: number, cy: number, cr: number, rot: number) => {
      ctx.save()
      ctx.translate(cx, cy)
      ctx.rotate(rot)

      // faint illuminated halo
      const halo = ctx.createRadialGradient(0, 0, 0, 0, 0, cr * 1.5)
      halo.addColorStop(0, 'rgba(176,131,68,0.16)')
      halo.addColorStop(1, 'rgba(176,131,68,0)')
      ctx.fillStyle = halo
      ctx.beginPath()
      ctx.arc(0, 0, cr * 1.5, 0, Math.PI * 2)
      ctx.fill()

      ctx.strokeStyle = SEPIA
      ctx.lineWidth = 1.2
      ctx.beginPath()
      ctx.arc(0, 0, cr, 0, Math.PI * 2)
      ctx.stroke()
      ctx.beginPath()
      ctx.arc(0, 0, cr * 0.66, 0, Math.PI * 2)
      ctx.stroke()

      // tick marks around the rose
      ctx.strokeStyle = 'rgba(74,54,34,0.5)'
      ctx.lineWidth = 0.8
      for (let k = 0; k < 32; k++) {
        const a = (k / 32) * Math.PI * 2
        const inner = k % 8 === 0 ? cr * 0.82 : cr * 0.92
        ctx.beginPath()
        ctx.moveTo(Math.cos(a) * inner, Math.sin(a) * inner)
        ctx.lineTo(Math.cos(a) * cr, Math.sin(a) * cr)
        ctx.stroke()
      }

      // ordinal (diagonal) points
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
      // cardinal points
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
      // gilded hub
      ctx.fillStyle = GOLD
      ctx.beginPath()
      ctx.arc(0, 0, cr * 0.07, 0, Math.PI * 2)
      ctx.fill()
      ctx.restore()
    }

    const drawCornerFlourish = (cx: number, cy: number, s: number, fx: number, fy: number) => {
      // a small drawn-by-hand cartographic corner ornament
      ctx.save()
      ctx.translate(cx, cy)
      ctx.scale(fx, fy)
      ctx.strokeStyle = 'rgba(74,54,34,0.35)'
      ctx.lineWidth = 1.1
      ctx.beginPath()
      ctx.moveTo(0, s)
      ctx.quadraticCurveTo(0, 0, s, 0)
      ctx.stroke()
      ctx.beginPath()
      ctx.moveTo(s * 0.28, s * 0.28)
      ctx.quadraticCurveTo(s * 0.28, s * 0.55, s * 0.55, s * 0.55)
      ctx.stroke()
      // little leaf curl
      ctx.beginPath()
      ctx.moveTo(s * 0.55, 0)
      ctx.quadraticCurveTo(s * 0.78, s * 0.04, s * 0.7, s * 0.24)
      ctx.quadraticCurveTo(s * 0.6, s * 0.1, s * 0.55, 0)
      ctx.fillStyle = 'rgba(31,111,92,0.18)'
      ctx.fill()
      ctx.restore()
    }

    const draw = () => {
      const pad = Math.min(W, H) * 0.085
      const gw = W - pad * 2
      const gh = H - pad * 2
      const cw = gw / GRID_COLS
      const ch = gh / GRID_ROWS
      const reveal = reduced ? 1 : Math.min(1, t / 90)
      const drift = reduced ? 0 : t

      ctx.clearRect(0, 0, W, H)

      // 1. aged parchment texture (pre-rendered offscreen)
      if (texCtx) ctx.drawImage(texCanvas, 0, 0, W, H)

      // 2. drifting sea stipple (uncharted frontier texture)
      ctx.fillStyle = 'rgba(31, 111, 92, 0.05)'
      const dx = Math.sin(drift * 0.004) * 6
      const dy = Math.cos(drift * 0.003) * 4
      for (let i = 0; i < 460; i++) {
        const sx = (rnd(i) * W + dx + i * 0.13) % W
        const sy = (rnd(i + 99) * H + dy) % H
        const r = 0.6 + rnd(i + 7) * 1.1
        ctx.beginPath()
        ctx.arc(sx, sy, r, 0, Math.PI * 2)
        ctx.fill()
      }

      // faint sea swell hatch lines drifting horizontally
      ctx.strokeStyle = 'rgba(31,111,92,0.05)'
      ctx.lineWidth = 1
      for (let r = 0; r < 7; r++) {
        const yy = (r / 7) * H + Math.sin(drift * 0.01 + r) * 4
        ctx.beginPath()
        for (let x = 0; x <= W; x += 8) {
          const wy = yy + Math.sin(x * 0.03 + drift * 0.02 + r * 1.3) * 3
          if (x === 0) ctx.moveTo(x, wy)
          else ctx.lineTo(x, wy)
        }
        ctx.stroke()
      }

      // 3. wavering contour rings (drawn coastlines inking in)
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
          const wob = Math.sin(a * 5 + c * 1.7 + drift * 0.01) * baseR * 0.08
          const rr = baseR + wob
          const px = W / 2 + Math.cos(a) * rr * 1.15
          const py = H / 2 + Math.sin(a) * rr * 0.82
          if (s === 0) ctx.moveTo(px, py)
          else ctx.lineTo(px, py)
        }
        ctx.stroke()
      }

      // 4. decorative double frame around the chart
      ctx.strokeStyle = 'rgba(74,54,34,0.45)'
      ctx.lineWidth = 2
      ctx.strokeRect(pad * 0.42, pad * 0.42, W - pad * 0.84, H - pad * 0.84)
      ctx.strokeStyle = 'rgba(74,54,34,0.22)'
      ctx.lineWidth = 1
      ctx.strokeRect(pad * 0.55, pad * 0.55, W - pad * 1.1, H - pad * 1.1)
      const fl = Math.min(W, H) * 0.06
      drawCornerFlourish(pad * 0.55, pad * 0.55, fl, 1, 1)
      drawCornerFlourish(W - pad * 0.55, pad * 0.55, fl, -1, 1)
      drawCornerFlourish(pad * 0.55, H - pad * 0.55, fl, 1, -1)
      drawCornerFlourish(W - pad * 0.55, H - pad * 0.55, fl, -1, -1)

      // 5. grid graticule
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

      // coordinate labels A-L, 1-12
      ctx.fillStyle = 'rgba(74, 54, 34, 0.55)'
      ctx.font = `${Math.max(9, cw * 0.22)}px 'Spline Sans Mono', monospace`
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      for (let i = 0; i < GRID_COLS; i++) {
        ctx.fillText(String.fromCharCode(65 + i), pad + i * cw + cw / 2, pad - pad * 0.32)
        ctx.fillText(String.fromCharCode(65 + i), pad + i * cw + cw / 2, pad + gh + pad * 0.32)
      }
      for (let j = 0; j < GRID_ROWS; j++) {
        ctx.fillText(String(j + 1), pad - pad * 0.34, pad + j * ch + ch / 2)
        ctx.fillText(String(j + 1), pad + gw + pad * 0.34, pad + j * ch + ch / 2)
      }

      // 6. claimed canon tiles, illustrated and illuminated
      const { regions: regs, hover: hv, selected: sel } = stateRef.current
      const claimed = new Set(regs.map((r) => r.coord))
      const now = performance.now()
      regs.forEach((r) => {
        const col = r.coord.charCodeAt(0) - 65
        const row = parseInt(r.coord.slice(1), 10) - 1
        if (col < 0 || row < 0) return
        const x = pad + col * cw
        const y = pad + row * ch
        const ccx = x + cw / 2
        const ccy = y + ch / 2

        // first time we see this coord, stamp a bloom start time
        if (!bloomRef.current.has(r.coord)) bloomRef.current.set(r.coord, now)
        const bloomStart = bloomRef.current.get(r.coord) as number
        const bloom = reduced ? 1 : Math.min(1, (now - bloomStart) / 900)
        const ease = 1 - Math.pow(1 - bloom, 3)

        ctx.save()
        // ink spreads outward from the centre on reveal
        ctx.globalAlpha = ease
        const radius = (Math.max(cw, ch) / 1.7) * ease

        // illuminated glow beneath the region
        const glow = ctx.createRadialGradient(ccx, ccy, 0, ccx, ccy, radius)
        glow.addColorStop(0, 'rgba(176,131,68,0.30)')
        glow.addColorStop(1, 'rgba(176,131,68,0)')
        ctx.fillStyle = glow
        ctx.beginPath()
        ctx.arc(ccx, ccy, radius, 0, Math.PI * 2)
        ctx.fill()

        // inked land fill
        ctx.fillStyle = 'rgba(31, 111, 92, 0.18)'
        ctx.fillRect(x + 1, y + 1, cw - 2, ch - 2)
        ctx.strokeStyle = OXBLOOD
        ctx.lineWidth = 1.6
        ctx.strokeRect(x + 2, y + 2, cw - 4, ch - 4)

        // contour hatch inside (terrain illustration)
        ctx.strokeStyle = 'rgba(31, 111, 92, 0.3)'
        ctx.lineWidth = 0.7
        for (let h = 0; h < 3; h++) {
          ctx.beginPath()
          ctx.moveTo(x + 4, y + ch * (0.3 + h * 0.22))
          ctx.lineTo(x + cw - 4, y + ch * (0.18 + h * 0.22))
          ctx.stroke()
        }

        // gilt illuminated initial
        ctx.fillStyle = SEPIA
        ctx.textAlign = 'center'
        ctx.textBaseline = 'middle'
        ctx.font = `700 ${Math.max(10, cw * 0.34)}px 'Cardo', serif`
        ctx.fillText(r.name.charAt(0).toUpperCase(), ccx, ccy - ch * 0.04)

        // tiny region label under the initial when cells are large enough
        if (cw > 46) {
          const label = r.name.length > 12 ? r.name.slice(0, 11) + '\u2026' : r.name
          ctx.fillStyle = 'rgba(74,54,34,0.7)'
          ctx.font = `${Math.max(7, cw * 0.13)}px 'Spline Sans Mono', monospace`
          ctx.fillText(label, ccx, y + ch - ch * 0.18)
        }
        ctx.restore()
      })
      // forget blooms for coords that are no longer present
      bloomRef.current.forEach((_, key) => {
        if (!claimed.has(key)) bloomRef.current.delete(key)
      })

      // 7. hover ink-bloom crosshair + selected highlight
      const markCell = (coord: string, color: string, lw: number) => {
        const col = coord.charCodeAt(0) - 65
        const row = parseInt(coord.slice(1), 10) - 1
        if (col < 0 || row < 0) return
        const x = pad + col * cw
        const y = pad + row * ch
        ctx.strokeStyle = color
        ctx.lineWidth = lw
        ctx.strokeRect(x + 1.5, y + 1.5, cw - 3, ch - 3)
        return { x, y }
      }
      if (hv && !claimed.has(hv)) {
        const col = hv.charCodeAt(0) - 65
        const row = parseInt(hv.slice(1), 10) - 1
        if (col >= 0 && row >= 0) {
          const x = pad + col * cw
          const y = pad + row * ch
          const ccx = x + cw / 2
          const ccy = y + ch / 2
          // ink bloom under cursor
          const pulse = reduced ? 0.5 : 0.4 + Math.sin(drift * 0.12) * 0.18
          const bg = ctx.createRadialGradient(ccx, ccy, 0, ccx, ccy, Math.max(cw, ch) * 0.7)
          bg.addColorStop(0, `rgba(31,111,92,${0.14 * pulse + 0.05})`)
          bg.addColorStop(1, 'rgba(31,111,92,0)')
          ctx.fillStyle = bg
          ctx.fillRect(x - cw, y - ch, cw * 3, ch * 3)
          // crosshair extending to the margins
          ctx.strokeStyle = 'rgba(31,111,92,0.4)'
          ctx.lineWidth = 0.8
          ctx.setLineDash([4, 4])
          ctx.beginPath()
          ctx.moveTo(ccx, pad)
          ctx.lineTo(ccx, pad + gh)
          ctx.moveTo(pad, ccy)
          ctx.lineTo(pad + gw, ccy)
          ctx.stroke()
          ctx.setLineDash([])
          markCell(hv, GREEN, 2)
        }
      }
      if (sel) markCell(sel, OXBLOOD, 2.4)

      // 8. compass rose, slowly rotating
      drawCompass(W - pad * 0.62, pad * 0.62, pad * 0.42, reduced ? 0 : t * 0.0015)

      if (running && !reduced) {
        t += 1
        raf = requestAnimationFrame(draw)
      }
    }
    draw()
    if (reduced) {
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
      <div className="map-title-plate" aria-hidden="true">
        <span className="mtp-kicker">Tabula Mundi</span>
        <span className="mtp-name">The Shared World</span>
        <span className="mtp-sub">Charted by consensus</span>
      </div>
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
