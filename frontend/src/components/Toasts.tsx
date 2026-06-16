'use client'

import { AnimatePresence, motion } from 'framer-motion'
import { AlertTriangle, CheckCircle2, Compass, X } from 'lucide-react'

export type ToastKind = 'pending' | 'success' | 'error'

export interface ToastItem {
  id: number
  kind: ToastKind
  title: string
  body?: string
}

const ICON = {
  pending: Compass,
  success: CheckCircle2,
  error: AlertTriangle,
}

const ACCENT = {
  pending: 'var(--gild)',
  success: 'var(--teal)',
  error: 'var(--rust)',
}

export function Toasts({ items, onDismiss }: { items: ToastItem[]; onDismiss: (id: number) => void }) {
  return (
    <div
      className="fixed bottom-4 right-4 z-50 flex w-[min(92vw,22rem)] flex-col gap-2.5"
      role="region"
      aria-label="Survey notifications"
      aria-live="polite"
    >
      <AnimatePresence initial={false}>
        {items.map((t) => {
          const Icon = ICON[t.kind]
          return (
            <motion.div
              key={t.id}
              layout
              initial={{ opacity: 0, x: 40, scale: 0.96 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, x: 40, scale: 0.96 }}
              transition={{ type: 'spring', stiffness: 320, damping: 30 }}
              className="paper deckle relative overflow-hidden rounded-md px-3.5 py-3"
            >
              <span
                aria-hidden="true"
                className="absolute left-0 top-0 h-full w-1"
                style={{ background: ACCENT[t.kind] }}
              />
              <div className="flex items-start gap-2.5 pl-1.5">
                <Icon
                  size={17}
                  style={{ color: ACCENT[t.kind] }}
                  className={t.kind === 'pending' ? 'compass-drift mt-0.5' : 'mt-0.5'}
                  aria-hidden="true"
                />
                <div className="min-w-0 flex-1">
                  <p className="font-display text-[0.98rem] leading-tight text-ink">{t.title}</p>
                  {t.body ? <p className="mt-0.5 text-[0.82rem] leading-snug text-sepia">{t.body}</p> : null}
                </div>
                <button
                  type="button"
                  onClick={() => onDismiss(t.id)}
                  className="text-faded hover:text-ink"
                  aria-label="Dismiss notification"
                >
                  <X size={15} aria-hidden="true" />
                </button>
              </div>
            </motion.div>
          )
        })}
      </AnimatePresence>
    </div>
  )
}
