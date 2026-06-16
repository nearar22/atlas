'use client'

import { useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { X, ExternalLink, Compass, CheckCircle2, AlertTriangle, XCircle } from 'lucide-react'
import {
  EXPLORER,
  makeWalletClient,
  sendClaim,
  fetchRegion,
  shortAddr,
  type RegionRecord,
} from '@/lib/contract'
import { pollUntilDecided, statusName, type LeaderDraft } from '@/lib/tx'
import type { useWallet } from '@/hooks/useWallet'

type Wallet = ReturnType<typeof useWallet>

interface Props {
  coord: string
  region: RegionRecord | null
  wallet: Wallet
  onClose: () => void
  onClaimed: () => void
}

type Phase = 'idle' | 'wallet' | 'consensus' | 'confirmed' | 'error'

const MAX_NAME = 60
const MAX_LORE = 700

const STAGES = [
  { t: 'Dispatch sealed', d: 'Your claim is signed and broadcast to the network.' },
  { t: 'Cartographer drafts', d: 'The leader validator reads neighbouring canon and rules.' },
  { t: 'Validators re-survey', d: 'Independent validators re-run the ruling and compare.' },
  { t: 'Atlas sealed', d: 'Consensus settles the verdict onto the shared map.' },
]

function stageIndex(status: string): number {
  switch (status) {
    case 'PENDING':
      return 0
    case 'PROPOSING':
      return 1
    case 'COMMITTING':
    case 'REVEALING':
      return 2
    case 'ACCEPTED':
    case 'FINALIZED':
      return 3
    default:
      return 1
  }
}

function rulingClass(r: string): string {
  const u = r.toUpperCase()
  if (u === 'CANON') return 'canon'
  if (u === 'CONTESTED') return 'contested'
  return 'apocrypha'
}

export default function Cartouche({ coord, region, wallet, onClose, onClaimed }: Props) {
  const [name, setName] = useState('')
  const [lore, setLore] = useState('')
  const [phase, setPhase] = useState<Phase>('idle')
  const [liveStatus, setLiveStatus] = useState('')
  const [draft, setDraft] = useState<LeaderDraft | null>(null)
  const [result, setResult] = useState<RegionRecord | LeaderDraft | null>(null)
  const [txHash, setTxHash] = useState<string | null>(null)
  const [errMsg, setErrMsg] = useState('')

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && phase !== 'consensus' && onClose()
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [phase, onClose])

  const isClaimed = !!region
  const canSubmit = name.trim().length >= 1 && lore.trim().length >= 1 && !!wallet.address

  const submit = async () => {
    if (!wallet.address) {
      await wallet.connect()
      return
    }
    setErrMsg('')
    setPhase('wallet')
    try {
      const client = makeWalletClient(wallet.address)
      const hash = (await sendClaim(client, coord, name.trim(), lore.trim())) as `0x${string}`
      setTxHash(hash)
      setPhase('consensus')
      const { status } = await pollUntilDecided(client, hash, (s, d) => {
        setLiveStatus(s)
        if (d) setDraft(d)
      })
      if (status === 'ACCEPTED' || status === 'FINALIZED') {
        // read authoritative result; retry a few times if gen_call is busy
        let finalRegion: RegionRecord | null = null
        for (let i = 0; i < 5; i++) {
          finalRegion = await fetchRegion(coord).catch(() => null)
          if (finalRegion) break
          await new Promise((r) => setTimeout(r, 6000))
        }
        setResult(finalRegion ?? draft)
        setPhase('confirmed')
        onClaimed()
      } else if (status === 'UNDETERMINED') {
        setErrMsg('Validators could not agree on this claim. Please try again in a moment.')
        setPhase('error')
      } else {
        setErrMsg('The claim was canceled by the network. Please try again.')
        setPhase('error')
      }
    } catch (e: unknown) {
      const raw = String((e as { message?: string })?.message ?? e)
      if (/reject|denied|User denied/i.test(raw)) setErrMsg('You declined the signature request.')
      else if (/LackOfFundForMaxFee|insufficient/i.test(raw)) setErrMsg('Not enough test GEN to cover the network fee reserve. Claim more from the faucet and retry.')
      else setErrMsg('The claim could not be submitted. Please try again.')
      setPhase('error')
    }
  }

  const active = stageIndex(liveStatus)

  return (
    <div className="scrim" onClick={() => phase !== 'consensus' && onClose()}>
      <motion.div
        className="cartouche"
        onClick={(e) => e.stopPropagation()}
        initial={{ opacity: 0, scale: 0.94, y: 14 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.94 }}
        transition={{ type: 'spring', stiffness: 260, damping: 24 }}
        role="dialog"
        aria-modal="true"
      >
        <div className="cart-inner">
          {phase !== 'consensus' && (
            <button className="cart-close" onClick={onClose} aria-label="Close cartouche">
              <X size={17} aria-hidden="true" />
            </button>
          )}

          <div className="cart-coord">Region {coord}</div>

          {/* Existing CANON region */}
          {isClaimed && phase === 'idle' && region && (
            <ReadView region={region} />
          )}

          {/* Claim form */}
          {!isClaimed && phase === 'idle' && (
            <>
              <h2 className="cart-title">Claim the uncharted</h2>
              {!wallet.address && (
                <div className="notice warn">Connect your wallet to commit a claim. Reading the atlas needs no wallet.</div>
              )}
              <div className="field">
                <label>
                  Region name
                  <span className="count">{name.length}/{MAX_NAME}</span>
                </label>
                <input
                  value={name}
                  maxLength={MAX_NAME}
                  placeholder="e.g. The Saltglass Reaches"
                  onChange={(e) => setName(e.target.value)}
                />
              </div>
              <div className="field">
                <label>
                  Lore: geography, peoples, history
                  <span className="count">{lore.length}/{MAX_LORE}</span>
                </label>
                <textarea
                  value={lore}
                  maxLength={MAX_LORE}
                  rows={7}
                  placeholder="Describe this region so it coheres with the canon of its neighbours. The Cartographer judges geography, peoples, and history against the established world."
                  onChange={(e) => setLore(e.target.value)}
                />
              </div>
              <button className="btn-primary" disabled={!canSubmit} onClick={submit}>
                {wallet.address ? 'Submit to the Cartographer' : 'Connect wallet to claim'}
              </button>
            </>
          )}

          {phase === 'wallet' && (
            <div className="consensus">
              <h2 className="cart-title">Awaiting your seal</h2>
              <p style={{ color: 'var(--sepia-soft)' }}>Confirm the claim in your wallet to broadcast it.</p>
            </div>
          )}

          {phase === 'consensus' && (
            <div className="consensus">
              <h2 className="cart-title" style={{ borderBottom: 'none', paddingBottom: 4 }}>
                The Cartographer deliberates
              </h2>
              <div className="compass-stage">
                <SpinningCompass />
                <div className="wax-seal-orbit" aria-hidden="true" />
              </div>
              {STAGES.map((s, i) => (
                <div key={i} className={`stage-row ${i <= active ? 'on' : ''}`}>
                  <div className="si">{i + 1}</div>
                  <div>
                    <div className="st">{s.t}</div>
                    <div className="sd">{s.d}</div>
                  </div>
                </div>
              ))}
              <div className="live-status">
                {liveStatus === 'LEADER_TIMEOUT' || liveStatus === 'VALIDATORS_TIMEOUT'
                  ? 'Rotating leader, re-surveying'
                  : `Status: ${statusName(liveStatus)}`}
              </div>
              {draft && (
                <div className="draft-peek">
                  <div className="dl">Leader draft, sealing under consensus</div>
                  <div className={`coh ${rulingClass(draft.ruling)}`} style={{ fontSize: 14 }}>
                    {draft.ruling.toUpperCase()}
                    {typeof draft.coherence === 'number' ? ` \u00b7 coherence ${draft.coherence}` : ''}
                  </div>
                  {draft.note && <p className="chron-note" style={{ marginTop: 8 }}>{draft.note}</p>}
                </div>
              )}
              {txHash && (
                <a className="tx-link" href={`${EXPLORER}/tx/${txHash}`} target="_blank" rel="noreferrer" style={{ display: 'inline-block', marginTop: 12 }}>
                  View transaction <ExternalLink size={11} aria-hidden="true" />
                </a>
              )}
            </div>
          )}

          {phase === 'confirmed' && result && (
            <VerdictView coord={coord} result={result} txHash={txHash} />
          )}

          {phase === 'error' && (
            <div className="verdict">
              <div className="verdict-seal apocrypha"><XCircle size={40} aria-hidden="true" /></div>
              <div className="verdict-ruling" style={{ fontSize: 24 }}>Claim halted</div>
              <p className="verdict-note">{errMsg}</p>
              <button className="btn-primary" onClick={() => setPhase('idle')}>Try again</button>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  )
}

function ReadView({ region }: { region: RegionRecord }) {
  const first = region.name.charAt(0).toUpperCase()
  const rest = region.lore
  return (
    <>
      <h2 className="cart-title">{region.name}</h2>
      <div className="lore-display">
        <span className="dropcap">{first}</span>
        {rest}
      </div>
      <div className="cart-meta-grid">
        <div className="cell">
          <div className="k">Status</div>
          <div className="v" style={{ color: 'var(--green-deep)' }}>CANON</div>
        </div>
        <div className="cell">
          <div className="k">Coherence</div>
          <div className="v">{region.coherence} / 100</div>
        </div>
        <div className="cell">
          <div className="k">Charted by</div>
          <div className="v">{shortAddr(region.explorer)}</div>
        </div>
        <div className="cell">
          <div className="k">Claim order</div>
          <div className="v">#{region.seq}</div>
        </div>
      </div>
      {region.note && <p className="chron-note" style={{ marginTop: 16 }}>{region.note}</p>}
    </>
  )
}

function VerdictView({
  coord,
  result,
  txHash,
}: {
  coord: string
  result: RegionRecord | LeaderDraft
  txHash: string | null
}) {
  const ruling = ('status' in result ? result.status : result.ruling) ?? ''
  const coherence = result.coherence ?? 0
  const note = result.note ?? ''
  const cls = rulingClass(ruling)
  const Icon = cls === 'canon' ? CheckCircle2 : cls === 'contested' ? AlertTriangle : XCircle
  return (
    <div className="verdict">
      <motion.div
        className={`verdict-seal ${cls}`}
        initial={{ scale: 0.2, opacity: 0, rotate: -24 }}
        animate={{ scale: [0.2, 1.18, 1], opacity: 1, rotate: 0 }}
        transition={{ duration: 0.7, ease: 'easeOut', times: [0, 0.6, 1] }}
      >
        <Icon size={40} aria-hidden="true" />
      </motion.div>
      <motion.div
        className="verdict-ruling"
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.45, duration: 0.4 }}
      >
        {ruling.toUpperCase()}
      </motion.div>
      <div className="verdict-coh">
        {`Region ${coord} \u00b7 coherence ${coherence} / 100`}
      </div>
      <p className="verdict-note">{note}</p>
      {cls === 'canon' ? (
        <p style={{ color: 'var(--green-deep)', fontSize: 15 }}>This region is now woven into the world atlas.</p>
      ) : (
        <p style={{ color: 'var(--sepia-soft)', fontSize: 15 }}>
          Recorded in the chronicle. The tile stays uncharted and open to a new claim.
        </p>
      )}
      {txHash && (
        <a className="tx-link" href={`${EXPLORER}/tx/${txHash}`} target="_blank" rel="noreferrer" style={{ display: 'inline-block', marginTop: 14 }}>
          View transaction <ExternalLink size={11} aria-hidden="true" />
        </a>
      )}
    </div>
  )
}

function SpinningCompass() {
  return (
    <motion.div
      animate={{ rotate: 360 }}
      transition={{ duration: 14, repeat: Infinity, ease: 'linear' }}
      style={{ width: '100%', height: '100%', color: 'var(--green-deep)' }}
    >
      <Compass size={150} strokeWidth={0.9} aria-hidden="true" />
    </motion.div>
  )
}
