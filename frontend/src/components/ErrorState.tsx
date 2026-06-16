'use client'

import { RotateCw, ExternalLink } from 'lucide-react'
import { CONTRACT_ADDRESS, EXPLORER } from '@/lib/contract'

export function ErrorState({
  message,
  diagnostic,
  onRetry,
}: {
  message: string
  diagnostic?: boolean
  onRetry: () => void
}) {
  return (
    <div className="paper deckle mx-auto max-w-xl rounded-lg p-6 text-center" role="alert">
      <p className="font-display text-2xl text-rust">The ink has run dry</p>
      <p className="mt-2 text-[0.95rem] leading-relaxed text-sepia">{message}</p>
      {diagnostic ? (
        <p className="mt-2 font-mono text-[0.78rem] text-faded">Configured atlas: {CONTRACT_ADDRESS}</p>
      ) : null}
      <div className="mt-5 flex items-center justify-center gap-3">
        <button
          type="button"
          onClick={onRetry}
          className="inline-flex items-center gap-2 rounded-md px-4 py-2 font-mono text-[0.82rem] text-vellum"
          style={{ background: 'var(--teal)' }}
        >
          <RotateCw size={15} aria-hidden="true" />
          Retry survey
        </button>
        <a
          href={`${EXPLORER}/address/${CONTRACT_ADDRESS}`}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 font-mono text-[0.82rem] text-sepia hover:text-ink"
        >
          <ExternalLink size={14} aria-hidden="true" />
          Explorer
        </a>
      </div>
    </div>
  )
}
