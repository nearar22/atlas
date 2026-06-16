'use client'

import { CartoucheSkeleton } from '@/components/Skeleton'
import { shortHex, bearing } from '@/lib/format'
import type { ChronicleEntry } from '@/lib/contract'

function rulingClass(r: string): 'canon' | 'contested' | 'apocrypha' {
  const u = (r || '').toUpperCase()
  if (u === 'CANON') return 'canon'
  if (u === 'CONTESTED') return 'contested'
  return 'apocrypha'
}

const RULING_COLOR: Record<string, string> = {
  canon: 'var(--teal)',
  contested: 'var(--gild)',
  apocrypha: 'var(--rust)',
}

// The chronicle: every ruling the Cartographer has handed down, newest first.
export function Chronicle({
  chronicle,
  loading,
  onSelect,
}: {
  chronicle: ChronicleEntry[]
  loading: boolean
  onSelect: (coord: string) => void
}) {
  const recent = [...chronicle].sort((a, b) => b.seq - a.seq).slice(0, 9)

  return (
    <section aria-labelledby="chronicle-title" className="px-4 py-10 sm:px-6">
      <div className="mx-auto max-w-[1100px]">
        <p className="font-mono text-[0.72rem] uppercase tracking-[0.22em] text-faded">The open ledger</p>
        <h2 id="chronicle-title" className="mt-1 font-display text-3xl text-ink">
          Discoveries chronicle
        </h2>

        {loading && chronicle.length === 0 ? (
          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <CartoucheSkeleton key={i} />
            ))}
          </div>
        ) : recent.length === 0 ? (
          <p className="mt-6 text-[0.92rem] italic text-sepia">
            The chronicle is empty. Claim a cell on the chart to write the first entry.
          </p>
        ) : (
          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {recent.map((c) => {
              const cls = rulingClass(c.ruling)
              const color = RULING_COLOR[cls]
              return (
                <button
                  key={c.seq}
                  type="button"
                  onClick={() => onSelect(c.coord)}
                  className="paper deckle group flex flex-col gap-2 rounded-lg p-4 text-left transition-transform hover:-translate-y-0.5"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-mono text-[0.78rem] font-semibold tracking-[0.05em] text-teal">{c.coord}</span>
                    <span
                      className="rounded-sm px-2 py-0.5 font-mono text-[0.62rem] uppercase tracking-[0.14em]"
                      style={{ color: 'var(--vellum)', background: color }}
                    >
                      {(c.ruling || '').toUpperCase()}
                    </span>
                  </div>
                  {c.name ? (
                    <p className="truncate font-display text-lg leading-tight text-ink" title={c.name}>
                      {c.name}
                    </p>
                  ) : null}
                  {c.note ? <p className="line-clamp-2 text-[0.85rem] italic leading-snug text-sepia">{c.note}</p> : null}
                  <p className="mt-auto font-mono text-[0.7rem] text-faded">
                    {bearing(c.coord)} {'\u00b7'} coherence {c.coherence} {'\u00b7'} by {shortHex(c.explorer)}
                  </p>
                </button>
              )
            })}
          </div>
        )}
      </div>
    </section>
  )
}
