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

      // paper drop-shadow: a soft dark inset lifting the chart off the desk
      const lift = texCtx.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.36, W / 2, H / 2, Math.max(W, H) * 0.62)
      lift.addColorStop(0, 'rgba(58,42,24,0)')
      lift.addColorStop(1, 'rgba(58,42,24,0.05)')
      texCtx.fillStyle = lift
      texCtx.fillRect(0, 0, W, H)

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

    // ---- portolan rhumb-line network radiating from wind-rose hubs ----
    const drawRhumbNetwork = (hubs: { x: number; y: number }[], drift: number) => {
      const rays = 16
      const reach = Math.hypot(W, H)
      hubs.forEach((hub, hi) => {
        const phase = Math.sin(drift * 0.01 + hi * 1.7) * 0.5 + 0.5
        for (let k = 0; k < rays; k++) {
          const a = (k / rays) * Math.PI * 2 + hi * 0.2
          const isMain = k % 4 === 0
          ctx.strokeStyle = isMain
            ? `rgba(124,45,45,${0.05 + phase * 0.035})`
            : `rgba(74,54,34,${0.035 + phase * 0.03})`
          ctx.lineWidth = isMain ? 0.8 : 0.5
          ctx.beginPath()
          ctx.moveTo(hub.x, hub.y)
          ctx.lineTo(hub.x + Math.cos(a) * reach, hub.y + Math.sin(a) * reach)
          ctx.stroke()
        }
        // small node ring at each hub
        ctx.strokeStyle = 'rgba(74,54,34,0.16)'
        ctx.lineWidth = 0.8
        ctx.beginPath()
        ctx.arc(hub.x, hub.y, Math.min(W, H) * 0.018, 0, Math.PI * 2)
        ctx.stroke()
      })
    }

    // ---- faint sketched landmass + coastline hints in open frontier ----
    const drawLandmassHint = (cx: number, cy: number, scale: number, seed: number, drift: number) => {
      ctx.save()
      ctx.translate(cx, cy)
      // wandering coastline blob
      ctx.strokeStyle = 'rgba(74,54,34,0.12)'
      ctx.lineWidth = 1
      ctx.beginPath()
      const steps = 60
      for (let s = 0; s <= steps; s++) {
        const a = (s / steps) * Math.PI * 2
        const wob = (Math.sin(a * 3 + seed) + Math.sin(a * 7 + seed * 1.7)) * scale * 0.12
        const rr = scale + wob + Math.sin(drift * 0.01 + a) * scale * 0.02
        const px = Math.cos(a) * rr * 1.2
        const py = Math.sin(a) * rr * 0.78
        if (s === 0) ctx.moveTo(px, py)
        else ctx.lineTo(px, py)
      }
      ctx.closePath()
      ctx.stroke()
      // faint land tint
      ctx.fillStyle = 'rgba(176,131,68,0.04)'
      ctx.fill()
      // interior relief hatching (sketched hills)
      ctx.strokeStyle = 'rgba(74,54,34,0.08)'
      ctx.lineWidth = 0.6
      for (let h = 0; h < 5; h++) {
        const hy = (-0.4 + h * 0.18) * scale
        ctx.beginPath()
        ctx.moveTo(-scale * 0.7, hy)
        ctx.quadraticCurveTo(0, hy - scale * 0.14, scale * 0.7, hy)
        ctx.stroke()
      }
      ctx.restore()
    }

    // ---- sea serpent flourish, here be monsters ----
    const drawSeaSerpent = (cx: number, cy: number, len: number, drift: number) => {
      ctx.save()
      ctx.translate(cx, cy)
      ctx.strokeStyle = 'rgba(74,54,34,0.32)'
      ctx.lineWidth = 2
      ctx.lineCap = 'round'
      const seg = 7
      const undulate = reduced ? 0 : drift * 0.04
      // body humps rising and dipping below an imagined waterline
      ctx.beginPath()
      for (let s = 0; s <= seg; s++) {
        const px = (s / seg) * len - len / 2
        const py = Math.sin(s * 1.1 + undulate) * len * 0.07
        if (s === 0) ctx.moveTo(px, py)
        else ctx.lineTo(px, py)
      }
      ctx.stroke()
      // dorsal spines
      ctx.fillStyle = 'rgba(31,111,92,0.3)'
      for (let s = 1; s < seg; s++) {
        const px = (s / seg) * len - len / 2
        const py = Math.sin(s * 1.1 + undulate) * len * 0.07
        ctx.beginPath()
        ctx.moveTo(px - 3, py)
        ctx.lineTo(px, py - len * 0.06)
        ctx.lineTo(px + 3, py)
        ctx.closePath()
        ctx.fill()
      }
      // head with eye and open jaw at the leading end
      const hx = -len / 2
      const hy = Math.sin(undulate) * len * 0.07
      ctx.fillStyle = 'rgba(74,54,34,0.34)'
      ctx.beginPath()
      ctx.ellipse(hx, hy, len * 0.09, len * 0.06, 0.3, 0, Math.PI * 2)
      ctx.fill()
      ctx.fillStyle = '#f4ecd8'
      ctx.beginPath()
      ctx.arc(hx - len * 0.02, hy - len * 0.015, 1.4, 0, Math.PI * 2)
      ctx.fill()
      ctx.restore()
    }

    // ---- whale spouting in open water ----
    const drawWhale = (cx: number, cy: number, len: number, drift: number) => {
      ctx.save()
      ctx.translate(cx, cy)
      ctx.fillStyle = 'rgba(74,54,34,0.22)'
      ctx.strokeStyle = 'rgba(74,54,34,0.32)'
      ctx.lineWidth = 1.4
      // rounded back
      ctx.beginPath()
      ctx.moveTo(-len * 0.5, 0)
      ctx.quadraticCurveTo(-len * 0.1, -len * 0.34, len * 0.32, -len * 0.05)
      ctx.quadraticCurveTo(len * 0.42, 0, len * 0.5, 0)
      ctx.stroke()
      // tail fluke
      ctx.beginPath()
      ctx.moveTo(len * 0.42, -len * 0.02)
      ctx.lineTo(len * 0.56, -len * 0.18)
      ctx.lineTo(len * 0.52, 0)
      ctx.lineTo(len * 0.56, len * 0.16)
      ctx.closePath()
      ctx.fill()
      // spout, drifting puff
      const puff = reduced ? 0 : Math.sin(drift * 0.05) * 2
      ctx.strokeStyle = 'rgba(31,111,92,0.3)'
      ctx.beginPath()
      ctx.moveTo(-len * 0.34, -len * 0.18)
      ctx.quadraticCurveTo(-len * 0.42 + puff, -len * 0.4, -len * 0.3, -len * 0.5)
      ctx.moveTo(-len * 0.34, -len * 0.18)
      ctx.quadraticCurveTo(-len * 0.26 - puff, -len * 0.4, -len * 0.36, -len * 0.5)
      ctx.stroke()
      ctx.restore()
    }

    // ---- galleon under sail in open water ----
    const drawGalleon = (cx: number, cy: number, s: number, drift: number) => {
      ctx.save()
      ctx.translate(cx, cy)
      const bob = reduced ? 0 : Math.sin(drift * 0.03) * 2
      ctx.translate(0, bob)
      ctx.rotate(reduced ? 0 : Math.sin(drift * 0.02) * 0.04)
      ctx.strokeStyle = 'rgba(74,54,34,0.34)'
      ctx.fillStyle = 'rgba(74,54,34,0.2)'
      ctx.lineWidth = 1.4
      // hull
      ctx.beginPath()
      ctx.moveTo(-s, 0)
      ctx.quadraticCurveTo(-s * 0.6, s * 0.5, s * 0.7, s * 0.42)
      ctx.quadraticCurveTo(s * 0.95, s * 0.3, s, 0)
      ctx.closePath()
      ctx.fill()
      ctx.stroke()
      // masts
      ctx.beginPath()
      ctx.moveTo(-s * 0.3, 0)
      ctx.lineTo(-s * 0.3, -s * 0.95)
      ctx.moveTo(s * 0.35, 0)
      ctx.lineTo(s * 0.35, -s * 0.85)
      ctx.stroke()
      // sails, gently billowing
      const bil = reduced ? 0 : Math.sin(drift * 0.04) * s * 0.04
      ctx.fillStyle = 'rgba(251,245,230,0.55)'
      ctx.strokeStyle = 'rgba(124,45,45,0.3)'
      ctx.beginPath()
      ctx.moveTo(-s * 0.3, -s * 0.9)
      ctx.quadraticCurveTo(s * 0.05 + bil, -s * 0.55, -s * 0.3, -s * 0.18)
      ctx.closePath()
      ctx.fill()
      ctx.stroke()
      ctx.beginPath()
      ctx.moveTo(s * 0.35, -s * 0.8)
      ctx.quadraticCurveTo(s * 0.62 + bil, -s * 0.5, s * 0.35, -s * 0.16)
      ctx.closePath()
      ctx.fill()
      ctx.stroke()
      // pennant
      ctx.strokeStyle = 'rgba(124,45,45,0.5)'
      ctx.beginPath()
      ctx.moveTo(-s * 0.3, -s * 0.95)
      ctx.lineTo(-s * 0.06 + bil, -s * 0.88)
      ctx.lineTo(-s * 0.3, -s * 0.82)
      ctx.stroke()
      ctx.restore()
    }

    // ---- scale bar, leagues of an imagined survey ----
    const drawScaleBar = (cx: number, cy: number, w: number) => {
      ctx.save()
      ctx.translate(cx, cy)
      const segs = 4
      const sw = w / segs
      ctx.strokeStyle = 'rgba(74,54,34,0.6)'
      ctx.lineWidth = 1
      ctx.font = `${Math.max(7, w * 0.045)}px 'Spline Sans Mono', monospace`
      ctx.textAlign = 'center'
      ctx.textBaseline = 'top'
      ctx.fillStyle = 'rgba(74,54,34,0.6)'
      for (let i = 0; i < segs; i++) {
        ctx.fillStyle = i % 2 === 0 ? 'rgba(74,54,34,0.55)' : 'rgba(251,245,230,0.7)'
        ctx.fillRect(i * sw, 0, sw, 5)
        ctx.strokeRect(i * sw, 0, sw, 5)
      }
      ctx.strokeRect(0, 0, w, 5)
      ctx.fillStyle = 'rgba(74,54,34,0.7)'
      ctx.fillText('0', 0, 8)
      ctx.fillText('250 leagues', w, 8)
      ctx.textAlign = 'left'
      ctx.fillText('Scale of leagues', 0, 20)
      ctx.restore()
    }

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
      ctx.strokeStyle = 'rgba(74,54,34,0.4)'
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
      ctx.fillStyle = 'rgba(31,111,92,0.2)'
      ctx.fill()
      // a second outward acanthus scroll and gilt bud
      ctx.strokeStyle = 'rgba(124,45,45,0.32)'
      ctx.lineWidth = 1
      ctx.beginPath()
      ctx.moveTo(s * 0.08, s * 0.7)
      ctx.quadraticCurveTo(s * 0.5, s * 0.9, s * 0.78, s * 0.62)
      ctx.quadraticCurveTo(s * 0.55, s * 0.66, s * 0.42, s * 0.5)
      ctx.stroke()
      ctx.fillStyle = 'rgba(176,131,68,0.5)'
      ctx.beginPath()
      ctx.arc(s * 0.14, s * 0.14, s * 0.05, 0, Math.PI * 2)
      ctx.fill()
      ctx.restore()
    }

    // ---- ornate engraved border band running between the two frame rules ----
    const drawEngravedBorder = (x: number, y: number, w: number, h: number, band: number) => {
      ctx.save()
      // outer + inner band rules
      ctx.strokeStyle = 'rgba(74,54,34,0.5)'
      ctx.lineWidth = 1.4
      ctx.strokeRect(x, y, w, h)
      ctx.strokeRect(x + band, y + band, w - band * 2, h - band * 2)

      // running interlaced guilloche woven along the band
      ctx.lineWidth = 0.9
      const wave = (x0: number, y0: number, x1: number, y1: number) => {
        const len = Math.hypot(x1 - x0, y1 - y0)
        const ang = Math.atan2(y1 - y0, x1 - x0)
        const reps = Math.max(4, Math.floor(len / (band * 0.9)))
        ctx.save()
        ctx.translate(x0, y0)
        ctx.rotate(ang)
        for (let pass = 0; pass < 2; pass++) {
          ctx.strokeStyle = pass === 0 ? 'rgba(74,54,34,0.4)' : 'rgba(124,45,45,0.3)'
          ctx.beginPath()
          for (let s = 0; s <= reps; s++) {
            const seg = len / reps
            const px = s * seg
            for (let q = 0; q <= 8; q++) {
              const qq = q / 8
              const xx = px + qq * seg
              const yy = band * 0.5 + Math.sin((s + qq) * Math.PI * 2 + pass * Math.PI) * (band * 0.28)
              if (s === 0 && q === 0) ctx.moveTo(xx, yy)
              else ctx.lineTo(xx, yy)
            }
          }
          ctx.stroke()
        }
        ctx.restore()
      }
      // four sides of the woven band
      wave(x, y, x + w, y)
      wave(x + w, y + h, x, y + h)
      ctx.save()
      ctx.translate(x, y + h)
      ctx.rotate(-Math.PI / 2)
      // left + right verticals reuse the same routine via rotated frames
      ctx.restore()
      wave(x, y + h, x, y)
      wave(x + w, y, x + w, y + h)

      // gilt studs at regular intervals along the outer rule
      ctx.fillStyle = 'rgba(176,131,68,0.55)'
      const studGap = band * 2.4
      for (let sx = x; sx <= x + w; sx += studGap) {
        ctx.beginPath(); ctx.arc(sx, y, 1.6, 0, Math.PI * 2); ctx.fill()
        ctx.beginPath(); ctx.arc(sx, y + h, 1.6, 0, Math.PI * 2); ctx.fill()
      }
      for (let sy = y; sy <= y + h; sy += studGap) {
        ctx.beginPath(); ctx.arc(x, sy, 1.6, 0, Math.PI * 2); ctx.fill()
        ctx.beginPath(); ctx.arc(x + w, sy, 1.6, 0, Math.PI * 2); ctx.fill()
      }
      ctx.restore()
    }

    // ---- a wind-head (a cherub of the four winds) blowing from a corner ----
    const drawWindHead = (cx: number, cy: number, s: number, drift: number) => {
      ctx.save()
      ctx.translate(cx, cy)
      ctx.strokeStyle = 'rgba(74,54,34,0.4)'
      ctx.fillStyle = 'rgba(176,131,68,0.1)'
      ctx.lineWidth = 1.1
      // cheeks / face
      ctx.beginPath()
      ctx.arc(0, 0, s, 0, Math.PI * 2)
      ctx.fill()
      ctx.stroke()
      // radiating cloud puffs around the face
      ctx.strokeStyle = 'rgba(74,54,34,0.3)'
      for (let k = 0; k < 12; k++) {
        const a = (k / 12) * Math.PI * 2
        ctx.beginPath()
        ctx.arc(Math.cos(a) * s * 1.15, Math.sin(a) * s * 1.15, s * 0.28, 0, Math.PI * 2)
        ctx.stroke()
      }
      // closed eyes and puffed cheeks
      ctx.strokeStyle = 'rgba(74,54,34,0.55)'
      ctx.lineWidth = 1
      ctx.beginPath()
      ctx.arc(-s * 0.34, -s * 0.18, s * 0.16, 0.1 * Math.PI, 0.9 * Math.PI)
      ctx.arc(s * 0.34, -s * 0.18, s * 0.16, 0.1 * Math.PI, 0.9 * Math.PI)
      ctx.stroke()
      // pursed mouth blowing
      ctx.beginPath()
      ctx.arc(0, s * 0.34, s * 0.12, 0, Math.PI * 2)
      ctx.stroke()
      // breath gusts streaming outward, drifting
      const g = reduced ? 0 : Math.sin(drift * 0.05) * s * 0.1
      ctx.strokeStyle = 'rgba(31,111,92,0.3)'
      ctx.lineWidth = 1
      for (let r = 0; r < 3; r++) {
        ctx.beginPath()
        ctx.moveTo(0, s * 0.5)
        ctx.quadraticCurveTo(s * (0.8 + r * 0.5) + g, s * (0.7 + r * 0.4), s * (1.6 + r * 0.6), s * (0.5 + r * 0.5))
        ctx.stroke()
      }
      ctx.restore()
    }

    // ---- flowing calligraphic sea / ocean label ----
    const drawSeaLabel = (cx: number, cy: number, text: string, size: number, rot: number) => {
      ctx.save()
      ctx.translate(cx, cy)
      ctx.rotate(rot)
      ctx.fillStyle = 'rgba(31,111,92,0.32)'
      ctx.font = `italic 700 ${size}px 'Cardo', serif`
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      // letter-spaced, the way engravers spread an ocean name across open water
      const spaced = text.split('').join('\u2009')
      ctx.fillText(spaced, 0, 0)
      // hairline underline swash
      ctx.strokeStyle = 'rgba(31,111,92,0.22)'
      ctx.lineWidth = 0.8
      const w = ctx.measureText(spaced).width
      ctx.beginPath()
      ctx.moveTo(-w / 2, size * 0.6)
      ctx.quadraticCurveTo(0, size * 0.85, w / 2, size * 0.6)
      ctx.stroke()
      ctx.restore()
    }

    // ---- sketched mountain range (chevrons) in the open frontier ----
    const drawMountains = (cx: number, cy: number, w: number, seed: number) => {
      ctx.save()
      ctx.translate(cx, cy)
      ctx.strokeStyle = 'rgba(74,54,34,0.34)'
      ctx.fillStyle = 'rgba(74,54,34,0.07)'
      ctx.lineWidth = 1
      const peaks = 5
      const pw = w / peaks
      for (let p = 0; p < peaks; p++) {
        const ph = pw * (0.7 + rnd(seed + p) * 0.5)
        const px = -w / 2 + p * pw + (rnd(seed + p * 2) - 0.5) * pw * 0.3
        ctx.beginPath()
        ctx.moveTo(px - pw * 0.6, 0)
        ctx.lineTo(px, -ph)
        ctx.lineTo(px + pw * 0.6, 0)
        ctx.closePath()
        ctx.fill()
        ctx.stroke()
        // shaded flank hatch
        ctx.beginPath()
        ctx.moveTo(px, -ph)
        ctx.lineTo(px + pw * 0.22, -ph * 0.5)
        ctx.stroke()
      }
      ctx.restore()
    }

    // ---- archipelago: a scatter of little inked islands ----
    const drawArchipelago = (cx: number, cy: number, spread: number, seed: number) => {
      ctx.save()
      ctx.translate(cx, cy)
      ctx.strokeStyle = 'rgba(74,54,34,0.3)'
      ctx.fillStyle = 'rgba(176,131,68,0.1)'
      ctx.lineWidth = 0.9
      const isles = 6
      for (let i = 0; i < isles; i++) {
        const ix = (rnd(seed + i) - 0.5) * spread
        const iy = (rnd(seed + i * 3 + 1) - 0.5) * spread * 0.7
        const ir = 3 + rnd(seed + i * 5) * spread * 0.07
        ctx.beginPath()
        const steps = 14
        for (let s = 0; s <= steps; s++) {
          const a = (s / steps) * Math.PI * 2
          const wob = 1 + (rnd(seed + i + s) - 0.5) * 0.5
          const px = ix + Math.cos(a) * ir * wob * 1.2
          const py = iy + Math.sin(a) * ir * wob
          if (s === 0) ctx.moveTo(px, py)
          else ctx.lineTo(px, py)
        }
        ctx.closePath()
        ctx.fill()
        ctx.stroke()
        // a couple of concentric soundings around the larger isles
        if (ir > spread * 0.05) {
          ctx.strokeStyle = 'rgba(31,111,92,0.16)'
          ctx.beginPath()
          ctx.arc(ix, iy, ir * 1.8, 0, Math.PI * 2)
          ctx.stroke()
          ctx.strokeStyle = 'rgba(74,54,34,0.3)'
        }
      }
      ctx.restore()
    }

    // ---- scattered depth-sounding numerals in open water ----
    const drawSoundings = (count: number) => {
      ctx.save()
      ctx.fillStyle = 'rgba(74,54,34,0.26)'
      ctx.font = `italic ${Math.max(7, Math.min(W, H) * 0.011)}px 'Spline Sans Mono', monospace`
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      for (let i = 0; i < count; i++) {
        const sx = rnd(i * 2.7 + 13) * W
        const sy = rnd(i * 3.9 + 21) * H
        const d = Math.floor(3 + rnd(i + 41) * 90)
        ctx.fillText(String(d), sx, sy)
        // a tiny dot marking the sounding point
        ctx.beginPath()
        ctx.arc(sx, sy - 6, 0.8, 0, Math.PI * 2)
        ctx.fill()
      }
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

      // 3. portolan rhumb-line network radiating from two wind-rose hubs
      drawRhumbNetwork(
        [
          { x: W - pad * 0.62, y: pad * 0.62 },
          { x: pad + gw * 0.3, y: pad + gh * 0.72 },
        ],
        drift,
      )

      // 4. faint sketched coastlines / landmass hints in the open frontier
      drawLandmassHint(pad + gw * 0.16, pad + gh * 0.2, Math.min(gw, gh) * 0.07, 1.3, drift)
      drawLandmassHint(pad + gw * 0.82, pad + gh * 0.34, Math.min(gw, gh) * 0.055, 4.1, drift)
      drawLandmassHint(pad + gw * 0.7, pad + gh * 0.82, Math.min(gw, gh) * 0.08, 7.7, drift)

      // 4b. mountain ranges, an archipelago and scattered soundings
      drawMountains(pad + gw * 0.16, pad + gh * 0.2 - Math.min(gw, gh) * 0.02, Math.min(gw, gh) * 0.14, 2.2)
      drawMountains(pad + gw * 0.7, pad + gh * 0.82 - Math.min(gw, gh) * 0.02, Math.min(gw, gh) * 0.16, 6.4)
      drawArchipelago(pad + gw * 0.4, pad + gh * 0.66, Math.min(gw, gh) * 0.22, 9.1)
      drawSoundings(40)

      // 4c. flowing calligraphic ocean names spread across open water
      drawSeaLabel(pad + gw * 0.5, pad + gh * 0.12, 'Mare Incognitum', Math.max(13, Math.min(gw, gh) * 0.032), -0.04)
      drawSeaLabel(pad + gw * 0.3, pad + gh * 0.9, 'Sea of Concord', Math.max(11, Math.min(gw, gh) * 0.026), 0.05)
      drawSeaLabel(pad + gw * 0.86, pad + gh * 0.56, 'The Reach', Math.max(10, Math.min(gw, gh) * 0.024), 1.4)

      // 5. wavering contour rings (drawn coastlines inking in)
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

      // 6. inhabited open water: sea serpent, whale, and a galleon under sail
      drawSeaSerpent(pad + gw * 0.24, pad + gh * 0.52, Math.min(gw, gh) * 0.26, drift)
      drawWhale(pad + gw * 0.84, pad + gh * 0.7, Math.min(gw, gh) * 0.12, drift)
      drawGalleon(pad + gw * 0.52, pad + gh * 0.28, Math.min(gw, gh) * 0.07, drift)

      // 7. ornate engraved border band around the chart
      const bw = pad * 0.34
      drawEngravedBorder(pad * 0.42, pad * 0.42, W - pad * 0.84, H - pad * 0.84, bw)
      const fl = Math.min(W, H) * 0.06
      drawCornerFlourish(pad * 0.55, pad * 0.55, fl, 1, 1)
      drawCornerFlourish(W - pad * 0.55, pad * 0.55, fl, -1, 1)
      drawCornerFlourish(pad * 0.55, H - pad * 0.55, fl, 1, -1)
      drawCornerFlourish(W - pad * 0.55, H - pad * 0.55, fl, -1, -1)
      // wind-head cherub of the four winds, blowing from the lower-left
      drawWindHead(pad * 1.15, H - pad * 1.15, Math.min(W, H) * 0.032, drift)

      // 8. grid graticule
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

      // fine latitude / longitude minute-ticks along the inner frame
      ctx.strokeStyle = 'rgba(74,54,34,0.4)'
      ctx.lineWidth = 0.7
      const ticks = GRID_COLS * 4
      for (let i = 0; i <= ticks; i++) {
        const major = i % 4 === 0
        const tx = pad + (i / ticks) * gw
        const tl = major ? pad * 0.16 : pad * 0.08
        ctx.beginPath()
        ctx.moveTo(tx, pad)
        ctx.lineTo(tx, pad - tl)
        ctx.moveTo(tx, pad + gh)
        ctx.lineTo(tx, pad + gh + tl)
        ctx.stroke()
      }
      const tticks = GRID_ROWS * 4
      for (let j = 0; j <= tticks; j++) {
        const major = j % 4 === 0
        const ty = pad + (j / tticks) * gh
        const tl = major ? pad * 0.16 : pad * 0.08
        ctx.beginPath()
        ctx.moveTo(pad, ty)
        ctx.lineTo(pad - tl, ty)
        ctx.moveTo(pad + gw, ty)
        ctx.lineTo(pad + gw + tl, ty)
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

      // 9. claimed canon tiles, illustrated and illuminated
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

        // hill and forest hatching inside (terrain illustration)
        ctx.strokeStyle = 'rgba(31, 111, 92, 0.3)'
        ctx.lineWidth = 0.7
        for (let h = 0; h < 3; h++) {
          ctx.beginPath()
          ctx.moveTo(x + 4, y + ch * (0.3 + h * 0.22))
          ctx.lineTo(x + cw - 4, y + ch * (0.18 + h * 0.22))
          ctx.stroke()
        }
        // small sketched hill humps along the lower third
        ctx.strokeStyle = 'rgba(74,54,34,0.28)'
        ctx.lineWidth = 0.6
        const hills = Math.max(2, Math.floor(cw / 18))
        ctx.beginPath()
        for (let hh = 0; hh < hills; hh++) {
          const hx = x + 5 + (hh + 0.5) * ((cw - 10) / hills)
          const hb = y + ch - ch * 0.26
          ctx.moveTo(hx - cw * 0.06, hb)
          ctx.quadraticCurveTo(hx, hb - ch * 0.12, hx + cw * 0.06, hb)
        }
        ctx.stroke()

        // name banner across the tile
        if (cw > 40) {
          const by = y + ch * 0.2
          ctx.fillStyle = 'rgba(251,245,230,0.85)'
          ctx.fillRect(x + 3, by - ch * 0.1, cw - 6, ch * 0.2)
          ctx.strokeStyle = 'rgba(124,45,45,0.5)'
          ctx.lineWidth = 0.8
          ctx.strokeRect(x + 3, by - ch * 0.1, cw - 6, ch * 0.2)
        }

        // gilt illuminated initial in an ornamented gold cell
        const capR = Math.max(9, cw * 0.2)
        const gilt = ctx.createRadialGradient(ccx, ccy, 0, ccx, ccy, capR)
        gilt.addColorStop(0, 'rgba(199,154,91,0.9)')
        gilt.addColorStop(0.7, 'rgba(176,131,68,0.7)')
        gilt.addColorStop(1, 'rgba(176,131,68,0)')
        ctx.fillStyle = gilt
        ctx.fillRect(ccx - capR, ccy - capR * 0.9, capR * 2, capR * 1.8)
        ctx.strokeStyle = 'rgba(124,45,45,0.55)'
        ctx.lineWidth = 1
        ctx.strokeRect(ccx - capR * 0.78, ccy - capR * 0.8, capR * 1.56, capR * 1.6)
        ctx.fillStyle = SEPIA
        ctx.textAlign = 'center'
        ctx.textBaseline = 'middle'
        ctx.font = `700 ${Math.max(11, cw * 0.36)}px 'Cardo', serif`
        ctx.fillText(r.name.charAt(0).toUpperCase(), ccx, ccy + ch * 0.06)

        // tiny region label in the banner, letter-spaced in a calligraphic hand
        if (cw > 46) {
          const raw = r.name.length > 13 ? r.name.slice(0, 12) + '\u2026' : r.name
          const label = raw.split('').join('\u200a')
          ctx.fillStyle = 'rgba(74,54,34,0.82)'
          ctx.font = `italic 600 ${Math.max(8, cw * 0.13)}px 'Cardo', serif`
          ctx.fillText(label, ccx, y + ch * 0.2)
        }
        ctx.restore()
      })
      // forget blooms for coords that are no longer present
      bloomRef.current.forEach((_, key) => {
        if (!claimed.has(key)) bloomRef.current.delete(key)
      })

      // 10. hover ink-bloom crosshair + selected highlight
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

      // 11. scale bar inside the lower frame margin
      drawScaleBar(pad + gw * 0.04, pad + gh + pad * 0.5, Math.min(gw * 0.26, 180))

      // 12. compass rose, slowly rotating, anchoring the rhumb network
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
          Rhumb lines & soundings
        </div>
      </div>
    </div>
  )
}
