import { GRID_COLS, GRID_ROWS } from '@/lib/contract'

export function shortHex(hex: string, head = 6, tail = 4): string {
  if (!hex) return ''
  if (hex.length <= head + tail + 2) return hex
  return `${hex.slice(0, head)}\u2026${hex.slice(-tail)}`
}

// Atlas coordinates look like "F6": column letter A-L, row 1-12.
export interface Cell {
  col: number // 0-based column index
  row: number // 0-based row index
  coord: string
}

export function colLetter(col: number): string {
  return String.fromCharCode(65 + col)
}

export function makeCoord(col: number, row: number): string {
  return `${colLetter(col)}${row + 1}`
}

export function parseCoord(coord: string): { col: number; row: number } | null {
  if (!coord) return null
  const col = coord.charCodeAt(0) - 65
  const row = parseInt(coord.slice(1), 10) - 1
  if (Number.isNaN(col) || Number.isNaN(row)) return null
  if (col < 0 || col >= GRID_COLS || row < 0 || row >= GRID_ROWS) return null
  return { col, row }
}

// A faux antique latitude/longitude readout for flavor, derived from the cell.
export function bearing(coord: string): string {
  const p = parseCoord(coord)
  if (!p) return ''
  const lat = Math.round((GRID_ROWS / 2 - p.row) * (60 / GRID_ROWS))
  const lon = Math.round((p.col - GRID_COLS / 2) * (90 / GRID_COLS))
  const ns = lat >= 0 ? 'N' : 'S'
  const ew = lon >= 0 ? 'E' : 'W'
  return `${Math.abs(lat)}\u00b0${ns} ${Math.abs(lon)}\u00b0${ew}`
}
