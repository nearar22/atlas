'use client'

import { useMemo } from 'react'
import { TerrainSwatch } from '@/components/TerrainTexture'
import { terrainForCoord } from '@/lib/terrain'
import { shortHex } from '@/lib/format'
import type { RegionRecord } from '@/lib/contract'

// The regions index: every CANON region currently inked onto the world, drawn
// as an engraved cartouche card with its hand-struck terrain swatch.
export function RegionsIndex({
  regions,
  onSelect,
}: {
  regions: RegionRecord[]
  onSelect: (coord: string, region: RegionRecord) => void
}) {
  const sorted = useMemo(() => [...regions].sort((a, b) => a.coord.localeCompare(b.coord)), [regions])

  return (
    <section
      aria-labelledby="regions-title"
      className="paper border-t px-4 py-10 sm:px-6"
      style={{ borderColor: 'var(--hairline-strong)' }}
    >
      <div className="mx-auto max-w-[1100px]">
        <p className="font-mono text-[0.72rem] uppercase tracking-[0.22em] text-faded">The gazetteer</p>
        <h2 id="regions-title" className="mt-1 font-display text-3xl text-ink">
          Regions index
        </h2>
        <p className="mt-1 max-w-2xl text-[0.9rem] leading-relaxed text-sepia">
          Every region the Cartographer has ruled CANON, inked onto the shared world. Each is drawn with its own
          hand-struck terrain.
        </p>

        {sorted.length === 0 ? (
          <p className="mt-6 text-[0.92rem] italic text-sepia">
            No region has entered canon yet. The world is unwritten; claim a cell to draw the first.
          </p>
        ) : (
          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {sorted.map((r) => (
              <button
                key={r.coord}
                type="button"
                onClick={() => onSelect(r.coord, r)}
                className="rounded-lg border p-4 text-left transition-transform hover:-translate-y-0.5"
                style={{ borderColor: 'var(--hairline-strong)' }}
              >
                <div className="flex items-center gap-3">
                  <TerrainSwatch terrain={terrainForCoord(r.coord)} size={52} />
                  <div className="min-w-0">
                    <p className="truncate font-display text-lg leading-none text-ink" title={r.name}>
                      {r.name}
                    </p>
                    <p className="mt-1 font-mono text-[0.7rem] text-faded">
                      {r.coord} {'\u00b7'} coherence {r.coherence}
                    </p>
                  </div>
                </div>
                <p className="mt-3 line-clamp-2 text-[0.84rem] leading-snug text-sepia">{r.lore}</p>
                <p className="mt-2 font-mono text-[0.68rem] text-faded">charted by {shortHex(r.explorer)}</p>
              </button>
            ))}
          </div>
        )}
      </div>
    </section>
  )
}
