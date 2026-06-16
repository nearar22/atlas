'use client'

import { Compass, ExternalLink, MapPin } from 'lucide-react'
import { FAUCET } from '@/lib/contract'
import type { useWallet } from '@/hooks/useWallet'

type Wallet = ReturnType<typeof useWallet>

// The claim console section in the page flow. It frames the act of claiming and
// routes the user back to the live chart to pick an uncharted cell.
export function ClaimConsoleSection({
  wallet,
  unchartedCount,
  onJumpToMap,
}: {
  wallet: Wallet
  unchartedCount: number
  onJumpToMap: () => void
}) {
  const connected = !!wallet.address

  return (
    <section aria-labelledby="claim-section-title" className="px-4 py-10 sm:px-6">
      <div className="mx-auto max-w-[1100px]">
        <div className="paper deckle rounded-xl p-6 sm:p-8">
          <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
            <div className="max-w-xl">
              <p className="font-mono text-[0.72rem] uppercase tracking-[0.22em] text-faded">Claim console</p>
              <h2 id="claim-section-title" className="mt-1 font-display text-3xl text-ink">
                Write the shared world into being
              </h2>
              <p className="mt-2 text-[0.95rem] leading-relaxed text-sepia">
                {unchartedCount} cells remain uncharted. Choose one on the chart, write its lore, and the
                Cartographer will judge it CANON, CONTESTED, or APOCRYPHA under validator consensus.
              </p>

              <div className="mt-5 flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  onClick={onJumpToMap}
                  className="inline-flex items-center gap-2 rounded-md px-4 py-2.5 font-mono text-[0.84rem] text-vellum"
                  style={{ background: 'var(--rust)' }}
                >
                  <MapPin size={15} aria-hidden="true" />
                  Choose an uncharted cell
                </button>
                {!connected ? (
                  <button
                    type="button"
                    onClick={wallet.connect}
                    className="inline-flex items-center gap-2 rounded-md border px-4 py-2.5 font-mono text-[0.84rem] text-ink"
                    style={{ borderColor: 'var(--gild)' }}
                  >
                    <Compass size={15} aria-hidden="true" />
                    Connect to claim
                  </button>
                ) : null}
                <a
                  href={FAUCET}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 font-mono text-[0.82rem] text-teal hover:text-ink"
                >
                  <ExternalLink size={14} aria-hidden="true" />
                  Testnet faucet
                </a>
              </div>
            </div>

            <div className="flex-none self-center">
              <Compass size={120} color="var(--teal)" className="compass-drift opacity-30" aria-hidden="true" />
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
