'use client'

import { ExternalLink } from 'lucide-react'
import { Copyable } from '@/components/Copyable'
import { CONTRACT_ADDRESS, DEPLOY_TX, EXPLORER, FAUCET } from '@/lib/contract'
import { shortHex } from '@/lib/format'

// A single ornamental cartouche footer: one hand-drawn SVG cartouche frame,
// centered, holding the contract address, faucet, and network as engraved text.
export function Footer() {
  return (
    <footer className="px-4 py-12 sm:px-6">
      <div className="relative mx-auto max-w-2xl">
        <svg viewBox="0 0 600 240" className="w-full" preserveAspectRatio="none" aria-hidden="true" role="presentation">
          <path
            d="M30 40 Q12 40 12 60 L12 180 Q12 200 30 200 L60 200 Q70 220 90 220 L510 220 Q530 220 540 200 L570 200 Q588 200 588 180 L588 60 Q588 40 570 40 L540 40 Q530 20 510 20 L90 20 Q70 20 60 40 Z"
            fill="rgba(241,231,207,0.7)"
            stroke="var(--sepia)"
            strokeWidth="1.5"
          />
          <path d="M40 52 L560 52 M40 188 L560 188" stroke="var(--gild)" strokeWidth="1" opacity="0.6" />
          <circle cx="300" cy="20" r="5" fill="var(--rust)" />
          <circle cx="300" cy="220" r="5" fill="var(--rust)" />
        </svg>

        <div className="absolute inset-0 flex flex-col items-center justify-center px-8 text-center">
          <p className="font-display text-2xl text-ink">ATLAS</p>
          <p className="mt-1 font-mono text-[0.72rem] uppercase tracking-[0.2em] text-faded">
            GenLayer Bradbury Testnet
          </p>

          <div className="mt-3 flex flex-wrap items-center justify-center gap-x-5 gap-y-1.5 font-mono text-[0.76rem]">
            <span className="text-faded">
              Atlas <Copyable value={CONTRACT_ADDRESS} label={shortHex(CONTRACT_ADDRESS)} className="ml-1" />
            </span>
            <span className="text-faded">
              Deploy <Copyable value={DEPLOY_TX} label={shortHex(DEPLOY_TX)} className="ml-1" />
            </span>
          </div>

          <div className="mt-3 flex items-center gap-5 font-mono text-[0.78rem]">
            <a
              href={FAUCET}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-teal hover:text-ink"
            >
              <ExternalLink size={13} aria-hidden="true" />
              Faucet
            </a>
            <a
              href={`${EXPLORER}/address/${CONTRACT_ADDRESS}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-teal hover:text-ink"
            >
              <ExternalLink size={13} aria-hidden="true" />
              Explorer
            </a>
          </div>
        </div>
      </div>
    </footer>
  )
}
