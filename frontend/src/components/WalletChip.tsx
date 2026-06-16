'use client'

import { Compass, LogOut, Plug } from 'lucide-react'
import type { useWallet } from '@/hooks/useWallet'
import { shortHex } from '@/lib/format'

type Wallet = ReturnType<typeof useWallet>

// The wallet rendered as a small brass instrument chip in the masthead.
export function WalletChip({ wallet }: { wallet: Wallet }) {
  if (!wallet.address) {
    return (
      <button
        type="button"
        onClick={wallet.connect}
        disabled={wallet.connecting}
        className="inline-flex items-center gap-2 rounded-full border px-3.5 py-1.5 font-mono text-[0.78rem] text-ink transition-colors hover:bg-ink/5 disabled:opacity-60"
        style={{ borderColor: 'var(--gild)', background: 'rgba(169,132,47,0.10)' }}
      >
        <Plug size={14} aria-hidden="true" />
        {wallet.connecting ? 'Opening instrument...' : wallet.hasWallet ? 'Connect instrument' : 'Get a wallet'}
      </button>
    )
  }

  return (
    <div className="flex items-center gap-2">
      <div
        className="inline-flex items-center gap-2 rounded-full border px-3 py-1.5 font-mono text-[0.78rem] text-ink"
        style={{ borderColor: 'var(--gild)', background: 'rgba(169,132,47,0.12)' }}
        title={wallet.onBradbury ? 'On Bradbury Testnet' : 'Wrong network'}
      >
        <Compass size={14} aria-hidden="true" style={{ color: wallet.onBradbury ? 'var(--teal)' : 'var(--rust)' }} />
        <span>{shortHex(wallet.address)}</span>
      </div>
      <button
        type="button"
        onClick={wallet.disconnect}
        className="text-faded hover:text-ink"
        aria-label="Disconnect wallet"
        title="Disconnect"
      >
        <LogOut size={15} aria-hidden="true" />
      </button>
    </div>
  )
}
