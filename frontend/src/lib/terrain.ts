// Atlas has no biome field on its contract data. To give claimed CANON regions
// the illustrated, hand-inked terrain feel of the reference atlas, each region
// is assigned a terrain purely for visual texture, keyed off a stable hash of
// its coordinate. This is presentation only; it never touches chain state.

export type Terrain =
  | 'PLAINS'
  | 'FOREST'
  | 'DESERT'
  | 'MOUNTAIN'
  | 'MARSH'
  | 'TUNDRA'
  | 'COAST'
  | 'HIGHLAND'

export interface TerrainMeta {
  key: Terrain
  label: string
  // base fill drawn under the hand-drawn texture
  fill: string
  ink: string
  blurb: string
}

export const TERRAIN_META: Record<Terrain, TerrainMeta> = {
  PLAINS: {
    key: 'PLAINS',
    label: 'Plains',
    fill: '#e3d8b4',
    ink: '#7a6a32',
    blurb: 'Open grassland, marked with sparse tufts and a calm, level hand.',
  },
  FOREST: {
    key: 'FOREST',
    label: 'Forest',
    fill: '#cdd6ad',
    ink: '#3f5a2c',
    blurb: 'Dense woodland, charted with small clustered tree glyphs.',
  },
  DESERT: {
    key: 'DESERT',
    label: 'Desert',
    fill: '#eddcaf',
    ink: '#b58a3e',
    blurb: 'Arid dunes, scored with dotted ridgelines and drifting sand.',
  },
  MOUNTAIN: {
    key: 'MOUNTAIN',
    label: 'Mountain',
    fill: '#ddd2bd',
    ink: '#6a5740',
    blurb: 'High relief, raised with contour hatching and chevroned peaks.',
  },
  MARSH: {
    key: 'MARSH',
    label: 'Marsh',
    fill: '#d3d8bf',
    ink: '#4f6b58',
    blurb: 'Low wetland, drawn with broken reed strokes and standing water.',
  },
  TUNDRA: {
    key: 'TUNDRA',
    label: 'Tundra',
    fill: '#dfe2dd',
    ink: '#5d6b74',
    blurb: 'Frozen flatland, stippled pale with a thin, cold hatch.',
  },
  COAST: {
    key: 'COAST',
    label: 'Coast',
    fill: '#dcdcc4',
    ink: '#2f7a6b',
    blurb: 'The inked seam where land meets sea, drawn with a feathered shoreline.',
  },
  HIGHLAND: {
    key: 'HIGHLAND',
    label: 'Highland',
    fill: '#e0c6b4',
    ink: '#b5532e',
    blurb: 'Wind-scoured uplands, sketched with cracked ridges and old stone.',
  },
}

export const TERRAIN_LIST = Object.values(TERRAIN_META)
const ORDER: Terrain[] = TERRAIN_LIST.map((t) => t.key)

// Stable string hash (FNV-1a style) so a coord always maps to the same terrain.
function hashStr(s: string): number {
  let h = 0x811c9dc5
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i)
    h = Math.imul(h, 0x01000193)
  }
  return h >>> 0
}

export function terrainForCoord(coord: string): Terrain {
  return ORDER[hashStr(coord) % ORDER.length]
}

export function terrainMetaForCoord(coord: string): TerrainMeta {
  return TERRAIN_META[terrainForCoord(coord)]
}
