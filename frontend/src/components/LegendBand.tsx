'use client'

import { MapPin, PenTool, Scale } from 'lucide-react'

const STEPS = [
  {
    icon: MapPin,
    title: 'Claim a region',
    body: 'Pick any uncharted cell on the twelve-by-twelve chart and write its lore: its geography, its peoples, its history. Your claim is signed and broadcast on-chain.',
  },
  {
    icon: PenTool,
    title: 'The Cartographer judges',
    body: 'An on-chain AI weighs your region against the canon of the world for coherence, scoring it zero to one hundred. It reads what is written; it does not invent the land for you.',
  },
  {
    icon: Scale,
    title: 'Consensus rules it',
    body: 'Validators re-run the ruling and must agree. The claim is sealed CANON, CONTESTED, or APOCRYPHA. Only a CANON region is inked onto the shared map.',
  },
]

export function LegendBand() {
  return (
    <section
      aria-labelledby="legend-title"
      className="paper border-y px-4 py-10 sm:px-6"
      style={{ borderColor: 'var(--hairline-strong)' }}
    >
      <div className="mx-auto max-w-[1100px]">
        <p className="text-center font-mono text-[0.72rem] uppercase tracking-[0.22em] text-faded">
          How the world is charted
        </p>
        <h2 id="legend-title" className="mt-1 text-center font-display text-3xl text-ink">
          One region at a time, under consensus
        </h2>
        <div className="mt-8 grid gap-5 md:grid-cols-3">
          {STEPS.map((s, i) => {
            const Icon = s.icon
            return (
              <div key={s.title} className="rounded-lg border p-5" style={{ borderColor: 'var(--hairline-strong)' }}>
                <div className="flex items-center gap-3">
                  <span
                    className="flex h-9 w-9 items-center justify-center rounded-full"
                    style={{ background: 'rgba(31,111,120,0.14)' }}
                  >
                    <Icon size={17} color="var(--teal)" aria-hidden="true" />
                  </span>
                  <span className="font-mono text-[0.74rem] text-faded">0{i + 1}</span>
                </div>
                <h3 className="mt-3 font-display text-xl text-ink">{s.title}</h3>
                <p className="mt-1.5 text-[0.9rem] leading-relaxed text-sepia">{s.body}</p>
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}
