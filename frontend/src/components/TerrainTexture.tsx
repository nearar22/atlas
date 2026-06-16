'use client'

import { TERRAIN_META, type Terrain } from '@/lib/terrain'

export const patternId = (t: Terrain) => `terrain-tex-${t}`

// All hand-drawn terrain textures live in one <defs> block, included once per
// SVG surface. Each pattern paints only ink strokes over a transparent ground,
// so a base-fill rect shows through underneath.
export function TerrainDefs() {
  return (
    <defs>
      {/* COAST: feathered shoreline ripples */}
      <pattern id={patternId('COAST')} width="20" height="14" patternUnits="userSpaceOnUse">
        <path d="M0 4 q5 -3 10 0 t10 0" fill="none" stroke={TERRAIN_META.COAST.ink} strokeWidth="0.8" opacity="0.55" />
        <path d="M0 10 q5 -3 10 0 t10 0" fill="none" stroke={TERRAIN_META.COAST.ink} strokeWidth="0.6" opacity="0.4" />
      </pattern>

      {/* PLAINS: sparse grass tufts */}
      <pattern id={patternId('PLAINS')} width="18" height="18" patternUnits="userSpaceOnUse">
        <path d="M4 13 l0 -4 M3 13 l1 -4 M5 13 l-1 -4" stroke={TERRAIN_META.PLAINS.ink} strokeWidth="0.7" opacity="0.5" />
        <path d="M13 9 l0 -4 M12 9 l1 -4 M14 9 l-1 -4" stroke={TERRAIN_META.PLAINS.ink} strokeWidth="0.7" opacity="0.4" />
      </pattern>

      {/* FOREST: clustered tree glyphs */}
      <pattern id={patternId('FOREST')} width="16" height="16" patternUnits="userSpaceOnUse">
        <path d="M4 12 l2 -6 l2 6 Z" fill={TERRAIN_META.FOREST.ink} opacity="0.5" />
        <path d="M10 14 l1.6 -5 l1.6 5 Z" fill={TERRAIN_META.FOREST.ink} opacity="0.42" />
      </pattern>

      {/* DESERT: dotted dune ridgelines */}
      <pattern id={patternId('DESERT')} width="22" height="16" patternUnits="userSpaceOnUse">
        <path
          d="M0 9 q6 -6 11 0 t11 0"
          fill="none"
          stroke={TERRAIN_META.DESERT.ink}
          strokeWidth="0.9"
          strokeDasharray="1.5 2.5"
          opacity="0.55"
        />
      </pattern>

      {/* MOUNTAIN: chevron peaks with contour hatch */}
      <pattern id={patternId('MOUNTAIN')} width="18" height="16" patternUnits="userSpaceOnUse">
        <path d="M3 13 l5 -8 l5 8" fill="none" stroke={TERRAIN_META.MOUNTAIN.ink} strokeWidth="0.9" opacity="0.6" />
        <path d="M6 13 l2 -3 l2 3" fill="none" stroke={TERRAIN_META.MOUNTAIN.ink} strokeWidth="0.6" opacity="0.4" />
      </pattern>

      {/* MARSH: broken reed strokes over standing water */}
      <pattern id={patternId('MARSH')} width="16" height="16" patternUnits="userSpaceOnUse">
        <path d="M4 14 l0 -7 M9 15 l0 -6 M13 13 l0 -5" stroke={TERRAIN_META.MARSH.ink} strokeWidth="0.8" opacity="0.55" />
        <path d="M0 11 h16" stroke={TERRAIN_META.MARSH.ink} strokeWidth="0.4" strokeDasharray="2 3" opacity="0.35" />
      </pattern>

      {/* TUNDRA: thin cold hatch and sparse stipple */}
      <pattern id={patternId('TUNDRA')} width="16" height="16" patternUnits="userSpaceOnUse">
        <path d="M0 8 h5 M9 4 h5" stroke={TERRAIN_META.TUNDRA.ink} strokeWidth="0.5" opacity="0.4" />
        <circle cx="11" cy="12" r="0.7" fill={TERRAIN_META.TUNDRA.ink} opacity="0.4" />
      </pattern>

      {/* HIGHLAND: cracked ridges and old stone */}
      <pattern id={patternId('HIGHLAND')} width="18" height="18" patternUnits="userSpaceOnUse">
        <path d="M2 2 l5 6 l-2 4 l6 4" fill="none" stroke={TERRAIN_META.HIGHLAND.ink} strokeWidth="0.8" opacity="0.5" />
        <path d="M14 1 l-3 5" fill="none" stroke={TERRAIN_META.HIGHLAND.ink} strokeWidth="0.6" opacity="0.38" />
      </pattern>

      {/* uncharted frontier: diagonal hatch */}
      <pattern id="frontier-hatch" width="8" height="8" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
        <path d="M0 0 v8" stroke="#7c6a4a" strokeWidth="0.8" opacity="0.28" />
      </pattern>
    </defs>
  )
}

// A standalone terrain swatch (used by the regions index and cartouche cards).
export function TerrainSwatch({ terrain, size = 64 }: { terrain: Terrain; size?: number }) {
  const meta = TERRAIN_META[terrain]
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" role="img" aria-label={`${meta.label} terrain`}>
      <TerrainDefs />
      <rect x="0" y="0" width="64" height="64" fill={meta.fill} />
      <rect x="0" y="0" width="64" height="64" fill={`url(#${patternId(terrain)})`} />
      <rect x="0" y="0" width="64" height="64" fill="none" stroke="var(--ink)" strokeWidth="1.5" opacity="0.4" />
    </svg>
  )
}
