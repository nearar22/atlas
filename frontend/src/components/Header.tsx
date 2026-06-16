'use client'

import { useEffect, useRef, useState } from 'react'
import { Compass, Copy, ExternalLink } from 'lucide-react'
import { CONTRACT_ADDRESS, EXPLORER, shortAddr } from '@/lib/contract'
import type { useWallet } from '@/hooks/useWallet'

type Wallet = ReturnType<typeof useWallet>

export default function Header({ wallet }: { wallet: Wallet }) {
  const { address, onBradbury, connecting, error, hasWallet, connect, disconnect } = wallet
  const [open, setOpen] = useState(false)
  const [copied, setCopied] = useState(false)
  const ref = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [])

  const copy = (text: string) => {
    navigator.clipboard?.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 1400)
  }

  return (
    <header className="header">
      <div className="brand">
        <Compass className="brand-mark" strokeWidth={1.4} aria-hidden="true" />
        <div>
          <div className="brand-title">ATLAS</div>
          <div className="brand-sub">Cartographer of the Shared World</div>
        </div>
      </div>

      <div className="header-spacer" />

      <nav className="header-meta">
        <span className="meta-link" title="Live on GenLayer Bradbury testnet">
          <span className="meta-dot" /> Bradbury
        </span>
        <a
          className="meta-link"
          href={`${EXPLORER}/address/${CONTRACT_ADDRESS}`}
          target="_blank"
          rel="noreferrer"
        >
          <span className="mono">{shortAddr(CONTRACT_ADDRESS)}</span>
          <ExternalLink size={12} aria-hidden="true" />
        </a>

        <div className="wallet-wrap" ref={ref}>
          {address ? (
            <button className="chip" onClick={() => setOpen((o) => !o)} aria-haspopup="menu" aria-expanded={open}>
              <span className={`status-dot ${onBradbury ? 'live' : ''}`} />
              {shortAddr(address)}
            </button>
          ) : (
            <button className="chip connect" onClick={connect} disabled={connecting}>
              {connecting ? 'Connecting' : hasWallet ? 'Connect wallet' : 'Get a wallet'}
            </button>
          )}

          {open && address && (
            <div className="wallet-menu" role="menu">
              <div className="row">
                <span>Network</span>
                <span>{onBradbury ? 'Bradbury' : 'Wrong network'}</span>
              </div>
              <div className="row">
                <span>Address</span>
                <button
                  className="mono"
                  style={{ background: 'none', border: 'none', display: 'inline-flex', gap: 5, alignItems: 'center', cursor: 'pointer' }}
                  onClick={() => copy(address)}
                >
                  {shortAddr(address)} <Copy size={11} aria-hidden="true" />
                </button>
              </div>
              {copied && <div className="row" style={{ color: 'var(--green-deep)' }}>Address copied</div>}
              <button className="menu-btn" onClick={() => { disconnect(); setOpen(false) }}>
                Disconnect
              </button>
            </div>
          )}
        </div>
      </nav>
      {error && (
        <div style={{ position: 'absolute', top: 64, right: 22, zIndex: 50 }} className="notice err">
          {error}
        </div>
      )}
    </header>
  )
}
