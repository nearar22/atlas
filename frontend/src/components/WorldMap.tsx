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

// deterministic pseudo-random for stable stains and stipple
const rnd = (n: number) => {
  const x = Math.sin(n * 127.1 + 311.7) * 43758.5453
  return x - Math.floor(x)
}

export default function WorldMap({ regions, onSelect, selected }: Props) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const wrapRef = useRef<HTMLDivElement | null>(null)
  const [hover, setHover] = useState<string | null>(null)

  // keep latest data available to the rAF loop without re-subscribing
  const stateRef = useRef({ regions, hover, selected })
  stateRef.current = { regions, hover, selected }

  // map a pointer position to a grid coord (same math as before: pad = min(W,H)*0.085)
  const cellFromEvent = (e: React.MouseEvent): { coord: string } | null => {
    const wrap = wrapRef.current
    if (!wrap) return null
    const rect = wrap.getBoundingClientRect()
    if (rect.width === 0 || rect.height === 0) return null
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
    let running = true
    let t = 0
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches

    let W = 0
    let H = 0
    let dpr = 1

    // pre-rendered parchment texture (created with guaranteed non-zero size,
    // only drawn when its width > 0)
    const tex = document.createElement('canvas')
    const texCtx = tex.getContext('2d')

    const paintParchment = () => {
      if (!texCtx || W <= 0 || H <= 0) return
      tex.width = Math.max(1, Math.floor(W * dpr))
      tex.height = Math.max(1, Math.floor(H * dpr))
      texCtx.setTransform(dpr, 0, 0, dpr, 0, 0)
      texCtx.clearRect(0, 0, W, H)

      // warm aged vellum base
      const base = texCtx.createLinearGradient(0, 0, W, H)
      base.addColorStop(0, '#f1e7cb')
      base.addColorStop(0.5, '#e8d9b2')
      base.addColorStop(1, '#d8c193')
      texCtx.fillStyle = base
      texCtx.fillRect(0, 0, W, H)

      // soft age blooms
      for (let i = 0; i < 30; i++) {
        const bx = rnd(i * 3.1) * W
        const by = rnd(i * 5.7 + 2) * H
        const br = (0.08 + rnd(i + 11) * 0.22) * Math.max(W, H)
        const g = texCtx.createRadialGradient(bx, by, 0, bx, by, br)
        const tone = rnd(i + 31)
        const col = tone > 0.6 ? 'rgba(176,131,68,0.12)' : 'rgba(90,64,30,0.08)'
        g.addColorStop(0, col)
        g.addColorStop(1, 'rgba(176,131,68,0)')
        texCtx.fillStyle = g
        texCtx.beginPath()
        texCtx.arc(bx, by, br, 0, Math.PI * 2)
        texCtx.fill()
      }

      // foxing speckle
      for (let i = 0; i < 260; i++) {
        const sx = rnd(i * 1.7 + 4) * W
        const sy = rnd(i * 2.3 + 9) * H
        const sr = 0.4 + rnd(i + 51) * 2.6
        const a = 0.03 + rnd(i + 71) * 0.08
        texCtx.fillStyle = `rgba(120, 84, 38, ${a})`
        texCtx.beginPath()
        texCtx.arc(sx, sy, sr, 0, Math.PI * 2)
        texCtx.fill()
      }

      // vignette
      const vig = texCtx.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.3, W / 2, H / 2, Math.max(W, H) * 0.72)
      vig.addColorStop(0, 'rgba(0,0,0,0)')
      vig.addColorStop(1, 'rgba(60,40,18,0.26)')
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

    // ---- compass rose, drawn unconditionally every frame ----
    const drawCompass = (cx: number, cy: number, r: number, rot: number) => {
      ctx.save()
      ctx.translate(cx, cy)
      ctx.rotate(rot)

      ctx.strokeStyle = 'rgba(74,54,34,0.55)'
      ctx.lineWidth = 1.3
      ctx.beginPath()
      ctx.arc(0, 0, r, 0, Math.PI * 2)
      ctx.stroke()
      ctx.beginPath()
      ctx.arc(0, 0, r * 0.62, 0, Math.PI * 2)
      ctx.stroke()

      // eight points
      for (let i = 0; i < 8; i++) {
        const a = (i / 8) * Math.PI * 2
        const long = i % 2 === 0
        const len = long ? r : r * 0.62
        ctx.save()
        ctx.rotate(a)
        ctx.beginPath()
        ctx.moveTo(0, 0)
        ctx.lineTo(len * 0.16, 0)
        ctx.lineTo(0, -len)
        ctx.lineTo(-len * 0.16, 0)
        ctx.closePath()
        ctx.fillStyle = long ? 'rgba(124,45,45,0.78)' : 'rgba(176,131,68,0.7)'
        ctx.fill()
        ctx.strokeStyle = 'rgba(74,54,34,0.6)'
        ctx.lineWidth = 0.8
        ctx.stroke()
        ctx.restore()
      }

      ctx.fillStyle = GOLD
      ctx.beginPath()
      ctx.arc(0, 0, r * 0.07, 0, Math.PI * 2)
      ctx.fill()
      ctx.restore()

      // fixed north label (not rotating)
      ctx.save()
      ctx.fillStyle = SEPIA
      ctx.font = `600 ${Math.max(10, r * 0.26)}px Georgia, serif`
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillText('N', cx, cy - r - r * 0.22)
      ctx.restore()
    }

    const draw = () => {
      if (!running) return
      raf = requestAnimationFrame(draw)

      // guard against zero-size canvas; try again next frame
      if (W <= 0 || H <= 0) return

      try {
        const data = stateRef.current
        const pad = Math.min(W, H) * 0.085
        const gw = W - pad * 2
        const gh = H - pad * 2
        const cw = gw / GRID_COLS
        const ch = gh / GRID_ROWS
        const drift = reduced ? 0 : t

        // (1) parchment background (texture if ready, else flat fill)
        if (tex.width > 0) {
          ctx.drawImage(tex, 0, 0, W, H)
        } else {
          ctx.fillStyle = '#e8d9b2'
          ctx.fillRect(0, 0, W, H)
        }

        // gentle sea stipple inside the chart field (secondary, decorative)
        ctx.save()
        ctx.fillStyle = 'rgba(31,111,92,0.05)'
        for (let i = 0; i < 70; i++) {
          const sx = pad + rnd(i * 2.1 + 1) * gw
          const sy = pad + rnd(i * 3.3 + 2) * gh
          const wob = reduced ? 0 : Math.sin(drift * 0.02 + i) * 1.2
          ctx.beginPath()
          ctx.arc(sx + wob, sy, 0.9, 0, Math.PI * 2)
          ctx.fill()
        }
        ctx.restore()

        // (2) sepia grid graticule, full 12x12, drawn at full extent immediately
        ctx.strokeStyle = 'rgba(74, 54, 34, 0.55)'
        ctx.lineWidth = 1
        for (let i = 0; i <= GRID_COLS; i++) {
          const x = pad + i * cw
          ctx.beginPath()
          ctx.moveTo(x, pad)
          ctx.lineTo(x, pad + gh)
          ctx.stroke()
        }
        for (let j = 0; j <= GRID_ROWS; j++) {
          const y = pad + j * ch
          ctx.beginPath()
          ctx.moveTo(pad, y)
          ctx.lineTo(pad + gw, y)
          ctx.stroke()
        }

        // chart border frame
        ctx.strokeStyle = SEPIA
        ctx.lineWidth = 2.2
        ctx.strokeRect(pad, pad, gw, gh)

        // (3) coordinate labels A-L across the top, 1-12 down the side
        ctx.fillStyle = SEPIA
        ctx.textAlign = 'center'
        ctx.textBaseline = 'middle'
        const labelSize = Math.max(9, Math.min(cw, ch) * 0.42)
        ctx.font = `600 ${labelSize}px Georgia, serif`
        for (let c = 0; c < GRID_COLS; c++) {
          const x = pad + c * cw + cw / 2
          ctx.fillText(String.fromCharCode(65 + c), x, pad - labelSize * 0.9)
        }
        for (let r = 0; r < GRID_ROWS; r++) {
          const y = pad + r * ch + ch / 2
          ctx.fillText(String(r + 1), pad - labelSize * 1.0, y)
        }

        // (5) claimed CANON regions: filled green tile, oxblood border, gold glow, name
        for (const reg of data.regions) {
          const coord = reg.coord
          if (!coord) continue
          const col = coord.charCodeAt(0) - 65
          const row = parseInt(coord.slice(1), 10) - 1
          if (col < 0 || col >= GRID_COLS || row < 0 || row >= GRID_ROWS) continue
          const x = pad + col * cw
          const y = pad + row * ch

          ctx.save()
          // soft gold glow
          ctx.shadowColor = 'rgba(176,131,68,0.55)'
          ctx.shadowBlur = Math.max(6, Math.min(cw, ch) * 0.45)
          ctx.fillStyle = 'rgba(31,111,92,0.42)'
          ctx.fillRect(x + 1.5, y + 1.5, cw - 3, ch - 3)
          ctx.restore()

          ctx.strokeStyle = OXBLOOD
          ctx.lineWidth = 1.8
          ctx.strokeRect(x + 1.5, y + 1.5, cw - 3, ch - 3)

          // region name, clipped to the tile
          const name = reg.name || coord
          ctx.save()
          ctx.beginPath()
          ctx.rect(x + 1, y + 1, cw - 2, ch - 2)
          ctx.clip()
          ctx.fillStyle = '#23150c'
          ctx.textAlign = 'center'
          ctx.textBaseline = 'middle'
          const nameSize = Math.max(7, Math.min(cw, ch) * 0.2)
          ctx.font = `600 ${nameSize}px Georgia, serif`
          ctx.fillText(name, x + cw / 2, y + ch / 2, cw - 4)
          ctx.restore()
        }

        // (6) hover highlight (green) and selected highlight (oxblood) with crosshair
        const drawCell = (coord: string, color: string, lw: number) => {
          const col = coord.charCodeAt(0) - 65
          const row = parseInt(coord.slice(1), 10) - 1
          if (col < 0 || col >= GRID_COLS || row < 0 || row >= GRID_ROWS) return
          const x = pad + col * cw
          const y = pad + row * ch
          ctx.strokeStyle = color
          ctx.lineWidth = lw
          ctx.strokeRect(x + 1, y + 1, cw - 2, ch - 2)
          // light crosshair across the chart
          ctx.save()
          ctx.strokeStyle = color
          ctx.globalAlpha = 0.3
          ctx.lineWidth = 1
          ctx.beginPath()
          ctx.moveTo(x + cw / 2, pad)
          ctx.lineTo(x + cw / 2, pad + gh)
          ctx.moveTo(pad, y + ch / 2)
          ctx.lineTo(pad + gw, y + ch / 2)
          ctx.stroke()
          ctx.restore()
        }
        if (data.hover && data.hover !== data.selected) drawCell(data.hover, GREEN, 2)
        if (data.selected) drawCell(data.selected, OXBLOOD, 2.4)

        // (4) compass rose in the bottom-right corner (slow rotation)
        const compR = Math.max(26, Math.min(W, H) * 0.075)
        const rot = reduced ? 0 : drift * 0.0015
        drawCompass(W - pad * 0.55 - compR, H - pad * 0.55 - compR, compR, rot)

        if (!reduced) t += 1
      } catch {
        // on error keep the last good frame; never throw out of rAF
      }
    }

    resize()
    const ro = new ResizeObserver(resize)
    ro.observe(wrap)

    if (reduced) {
      // single correct static frame, no loop
      running = false
      draw()
    } else {
      raf = requestAnimationFrame(draw)
    }

    const onVis = () => {
      if (reduced) return
      if (document.hidden) {
        running = false
        cancelAnimationFrame(raf)
      } else if (!running) {
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
        <span className="mtp-flourish mtp-flourish-l">{'\u269C'}</span>
        <span className="mtp-flourish mtp-flourish-r">{'\u269C'}</span>
        <span className="mtp-kicker">Tabula Mundi</span>
        <span className="mtp-name">The Shared World</span>
        <span className="mtp-rule" aria-hidden="true" />
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
        <div className="lk">
          <span className="swatch swatch-rhumb" />
          Rhumb lines &amp; soundings
        </div>
      </div>
    </div>
  )
}
