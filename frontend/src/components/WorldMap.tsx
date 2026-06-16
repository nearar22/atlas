'use client'

import { useMemo } from 'react'
import { Crosshair } from 'lucide-react'
import { TerrainDefs, patternId } from '@/components/TerrainTexture'
import { CompassRose } from '@/components/CompassRose'
import { terrainForCoord, TERRAIN_META } from '@/lib/terrain'
import { GRID_COLS, GRID_ROWS, type RegionRecord } from '@/lib/contract'
import { colLetter, makeCoord, parseCoord } from '@/lib/format'

const CELL = 64
const MARGIN = 30 // ruled margin for the A-L / 1-12 coordinate gutters

interface Props {
  regions: RegionRecord[]
  onSelect: (coord: string, region: RegionRecord | null) => void
  selected: string | null
  justClaimed: string | null
}

// A fixed twelve-by-twelve antique chart rendered entirely in SVG. Claimed
// CANON regions are inked illustrated tiles with an oxblood border; unclaimed
// cells are a hatched "uncharted frontier" that is clickable to claim.
export default function WorldMap({ regions, onSelect, selected, justClaimed }: Props) {
  const byCoord = useMemo(() => {
    const m = new Map<string, RegionRecord>()
    for (const r of regions) m.set(r.coord, r)
    return m
  }, [regions])

  const gridW = GRID_COLS * CELL
  const gridH = GRID_ROWS * CELL
  const width = gridW + MARGIN * 2
  const height = gridH + MARGIN * 2

  const cells: { coord: string; col: number; row: number }[] = []
  for (let row = 0; row < GRID_ROWS; row++) {
    for (let col = 0; col < GRID_COLS; col++) {
      cells.push({ coord: makeCoord(col, row), col, row })
    }
  }

  return (
    <div className="relative h-full w-full overflow-hidden paper" role="application" aria-label="Shared world map. A twelve by twelve chart. Click a cell to inspect or claim a region.">
      <div className="flex h-full w-full items-center justify-center p-4">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="map-canvas h-full w-full select-none"
          style={{ maxHeight: '100%', maxWidth: 'min(100%, 86vh)' }}
          preserveAspectRatio="xMidYMid meet"
        >
          <TerrainDefs />

          {/* chart field background */}
          <rect x={MARGIN} y={MARGIN} width={gridW} height={gridH} fill="rgba(241,231,207,0.35)" />

          {/* faint graticule */}
          <g opacity="0.6">
            {Array.from({ length: GRID_COLS + 1 }).map((_, i) => (
              <line
                key={`v${i}`}
                x1={MARGIN + i * CELL}
                y1={MARGIN}
                x2={MARGIN + i * CELL}
                y2={MARGIN + gridH}
                stroke="var(--hairline)"
                strokeWidth="1"
              />
            ))}
            {Array.from({ length: GRID_ROWS + 1 }).map((_, i) => (
              <line
                key={`h${i}`}
                x1={MARGIN}
                y1={MARGIN + i * CELL}
                x2={MARGIN + gridW}
                y2={MARGIN + i * CELL}
                stroke="var(--hairline)"
                strokeWidth="1"
              />
            ))}
          </g>

          {/* coordinate gutters: A-L across the top, 1-12 down the left */}
          <g fontFamily="var(--font-mono), monospace" fill="var(--faded)" fontSize="11">
            {Array.from({ length: GRID_COLS }).map((_, c) => (
              <text key={`cl${c}`} x={MARGIN + c * CELL + CELL / 2} y={MARGIN - 9} textAnchor="middle">
                {colLetter(c)}
              </text>
            ))}
            {Array.from({ length: GRID_ROWS }).map((_, r) => (
              <text key={`rl${r}`} x={MARGIN - 12} y={MARGIN + r * CELL + CELL / 2} textAnchor="middle" dominantBaseline="middle">
                {r + 1}
              </text>
            ))}
          </g>

          {/* cells */}
          {cells.map(({ coord, col, row }) => {
            const region = byCoord.get(coord)
            const x = MARGIN + col * CELL
            const y = MARGIN + row * CELL
            const isSel = selected === coord
            const isNew = justClaimed === coord

            if (region) {
              const terrain = terrainForCoord(coord)
              const meta = TERRAIN_META[terrain]
              return (
                <g
                  key={coord}
                  role="button"
                  tabIndex={0}
                  aria-label={`Canon region ${region.name} at ${coord}`}
                  transform={`translate(${x}, ${y})`}
                  style={{ cursor: 'pointer' }}
                  onClick={() => onSelect(coord, region)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault()
                      onSelect(coord, region)
                    }
                  }}
                  className={isNew ? 'ink-in' : undefined}
                >
                  <rect x={1} y={1} width={CELL - 2} height={CELL - 2} fill={meta.fill} />
                  <rect x={1} y={1} width={CELL - 2} height={CELL - 2} fill={`url(#${patternId(terrain)})`} />
                  <rect
                    x={1}
                    y={1}
                    width={CELL - 2}
                    height={CELL - 2}
                    fill="none"
                    stroke={isSel ? 'var(--rust)' : 'var(--rust)'}
                    strokeWidth={isSel ? 2.6 : 1.4}
                    opacity={isSel ? 1 : 0.7}
                  />
                  <text
                    x={CELL / 2}
                    y={CELL - 7}
                    textAnchor="middle"
                    fontSize="8"
                    fill="var(--ink)"
                    fontFamily="var(--font-mono), monospace"
                    opacity="0.8"
                  >
                    {region.name.length > 11 ? `${region.name.slice(0, 10)}\u2026` : region.name}
                  </text>
                </g>
              )
            }

            // uncharted frontier cell, clickable to claim
            return (
              <g
                key={coord}
                role="button"
                tabIndex={0}
                aria-label={`Uncharted cell ${coord}. Claim this region.`}
                transform={`translate(${x}, ${y})`}
                style={{ cursor: 'pointer' }}
                onClick={() => onSelect(coord, null)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault()
                    onSelect(coord, null)
                  }
                }}
                className="group"
              >
                <rect x={2.5} y={2.5} width={CELL - 5} height={CELL - 5} fill="url(#frontier-hatch)" opacity="0.7" />
                <rect
                  x={2.5}
                  y={2.5}
                  width={CELL - 5}
                  height={CELL - 5}
                  fill={isSel ? 'rgba(31,111,120,0.14)' : 'transparent'}
                  stroke={isSel ? 'var(--teal)' : 'var(--hairline-strong)'}
                  strokeWidth={isSel ? 2 : 1}
                  strokeDasharray="3 3"
                  className="transition-all group-hover:fill-[rgba(31,111,120,0.12)] group-focus:fill-[rgba(31,111,120,0.12)]"
                />
                <Crosshair
                  x={CELL / 2 - 7}
                  y={CELL / 2 - 7}
                  width={14}
                  height={14}
                  className="opacity-0 transition-opacity group-hover:opacity-70 group-focus:opacity-70"
                  color="var(--teal)"
                />
              </g>
            )
          })}

          {/* outer chart frame */}
          <rect
            x={MARGIN}
            y={MARGIN}
            width={gridW}
            height={gridH}
            fill="none"
            stroke="var(--ink)"
            strokeWidth="1.6"
            opacity="0.5"
          />
        </svg>
      </div>

      {/* drawn compass rose, anchored to the frame corner */}
      <div className="pointer-events-none absolute bottom-4 right-4 opacity-90">
        <CompassRose size={88} drift />
      </div>

      {/* offset title cartouche */}
      <div className="pointer-events-none absolute left-4 top-4 max-w-xs">
        <div className="paper deckle pointer-events-auto rounded-md px-4 py-3">
          <p className="font-mono text-[0.62rem] uppercase tracking-[0.24em] text-faded">Tabula Mundi</p>
          <p className="font-display text-lg text-ink">The Shared World</p>
          <p className="mt-1 text-[0.84rem] leading-snug text-sepia">
            Click an uncharted cell to claim it. The Cartographer judges your lore against the canon under consensus.
          </p>
        </div>
      </div>
    </div>
  )
}

// re-export for callers that build coords
export { parseCoord }
