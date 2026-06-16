'use client'

import { CompassRose } from '@/components/CompassRose'
import { WalletChip } from '@/components/WalletChip'
import type { useWallet } from '@/hooks/useWallet'
import type { AtlasStats } from '@/lib/contract'

type Wallet = ReturnType<typeof useWallet>

// A static, non-sticky parchment masthead: compass-rose wordmark left, live
// CANON / claims / contested readouts center, wallet instrument right.
export function Masthead({
  wallet,
  stats,
  loading,
}: {
  wallet: Wallet
  stats: AtlasStats | null
  loading: boolean
}) {
  const fmt = (v: number | undefined) => (loading && stats == null ? '--' : v ?? 0)

  return (
    <header className="paper border-b" style={{ borderColor: 'var(--hairline-strong)' }}>
      <div className="mx-auto flex max-w-[1600px] flex-col gap-4 px-4 py-4 sm:px-6 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-3">
          <CompassRose size={52} />
          <div>
            <h1 className="font-display text-3xl leading-none text-ink sm:text-4xl">ATLAS</h1>
            <p className="mt-1 font-mono text-[0.72rem] uppercase tracking-[0.22em] text-faded">
              A shared world charted under consensus
            </p>
          </div>
        </div>

        <div className="flex items-center gap-5">
          <dl className="flex items-center gap-5 font-mono text-[0.74rem]">
            <div className="text-center">
              <dt className="uppercase tracking-[0.16em] text-faded">Canon regions</dt>
              <dd className="mt-0.5 text-xl text-teal engraved tabular">{fmt(stats?.canon)}</dd>
            </div>
            <div aria-hidden="true" className="h-8 w-px" style={{ background: 'var(--hairline-strong)' }} />
            <div className="text-center">
              <dt className="uppercase tracking-[0.16em] text-faded">Claims judged</dt>
              <dd className="mt-0.5 text-xl text-ink engraved tabular">{fmt(stats?.claims)}</dd>
            </div>
            <div aria-hidden="true" className="h-8 w-px" style={{ background: 'var(--hairline-strong)' }} />
            <div className="text-center">
              <dt className="uppercase tracking-[0.16em] text-faded">Contested</dt>
              <dd className="mt-0.5 text-xl text-rust engraved tabular">{fmt(stats?.contested)}</dd>
            </div>
          </dl>
          <WalletChip wallet={wallet} />
        </div>
      </div>

      {wallet.address && !wallet.onBradbury ? (
        <p className="px-4 pb-3 text-center font-mono text-[0.76rem] text-rust sm:px-6" role="status">
          Your instrument is on the wrong network. Switch to Bradbury Testnet to claim.
        </p>
      ) : null}
    </header>
  )
}
