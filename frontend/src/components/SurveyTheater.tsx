'use client'

import { motion } from 'framer-motion'
import { Check, Compass, Feather, PenTool, Users } from 'lucide-react'
import { statusName, type LeaderDraft } from '@/lib/tx'

interface Stage {
  key: string
  label: string
  icon: typeof Compass
}

const STAGES: Stage[] = [
  { key: 'dispatch', label: 'Claim sealed and dispatched', icon: Feather },
  { key: 'drafting', label: 'Cartographer drafting the ruling', icon: Compass },
  { key: 'validators', label: 'Validators re-surveying the claim', icon: Users },
  { key: 'sealing', label: 'Sealing the verdict under consensus', icon: PenTool },
]

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

function activeIndex(phase: string, liveStatus: string): number {
  if (phase === 'wallet') return 0
  if (phase === 'confirmed') return STAGES.length
  const s = statusName(liveStatus)
  if (s === 'PENDING' || s === '') return 1
  if (s === 'PROPOSING') return 1
  if (s === 'COMMITTING' || s === 'REVEALING') return 2
  if (s === 'ACCEPTED' || s === 'FINALIZED') return 3
  return 1
}

export function SurveyTheater({
  phase,
  liveStatus,
  draft,
}: {
  phase: string
  liveStatus: string
  draft: LeaderDraft | null
}) {
  const idx = activeIndex(phase, liveStatus)
  const confirmed = phase === 'confirmed'

  return (
    <div className="mt-2">
      <ol className="space-y-2.5">
        {STAGES.map((st, i) => {
          const done = i < idx || confirmed
          const active = i === idx && !confirmed
          const Icon = st.icon
          return (
            <li key={st.key} className="flex items-center gap-3">
              <span
                className="flex h-8 w-8 flex-none items-center justify-center rounded-full border"
                style={{
                  borderColor: done || active ? 'var(--teal)' : 'var(--hairline-strong)',
                  background: done ? 'rgba(31,111,120,0.16)' : 'transparent',
                }}
              >
                {done ? (
                  <Check size={15} color="var(--teal)" aria-hidden="true" />
                ) : (
                  <Icon
                    size={15}
                    color={active ? 'var(--teal)' : 'var(--faded)'}
                    className={active && st.key === 'drafting' ? 'compass-drift' : undefined}
                    aria-hidden="true"
                  />
                )}
              </span>
              <span className="font-mono text-[0.82rem]" style={{ color: done || active ? 'var(--ink)' : 'var(--faded)' }}>
                {st.label}
              </span>
            </li>
          )
        })}
      </ol>

      <p className="mt-3 font-mono text-[0.72rem] uppercase tracking-[0.12em] text-faded">
        {liveStatus === 'LEADER_TIMEOUT' || liveStatus === 'VALIDATORS_TIMEOUT'
          ? 'Rotating leader, re-surveying'
          : `Status: ${statusName(liveStatus) || 'PENDING'}`}
      </p>

      {/* leader draft peek, labeled as in-flight under consensus */}
      {draft && !confirmed ? (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-4 rounded-md border border-dashed p-3"
          style={{ borderColor: 'var(--gild)', background: 'rgba(169,132,47,0.08)' }}
        >
          <p className="font-mono text-[0.68rem] uppercase tracking-[0.16em] text-gild">
            Leader draft, sealing under consensus
          </p>
          <div className="mt-2 flex items-baseline gap-2">
            <span
              className="font-display text-lg leading-none"
              style={{ color: RULING_COLOR[rulingClass(draft.ruling)] }}
            >
              {(draft.ruling || '').toUpperCase()}
            </span>
            {typeof draft.coherence === 'number' ? (
              <span className="font-mono text-[0.78rem] text-sepia tabular">coherence {draft.coherence}</span>
            ) : null}
          </div>
          {draft.note ? <p className="mt-2 text-[0.82rem] italic leading-snug text-sepia">{draft.note}</p> : null}
        </motion.div>
      ) : null}
    </div>
  )
}
