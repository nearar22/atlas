'use client'

import { useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { X, ExternalLink, CheckCircle2, AlertTriangle, XCircle } from 'lucide-react'
import {
  EXPLORER,
  makeWalletClient,
  sendClaim,
  fetchRegion,
  shortAddr,
  type RegionRecord,
} from '@/lib/contract'
import { pollUntilDecided, type LeaderDraft } from '@/lib/tx'
import { TerrainSwatch } from '@/components/TerrainTexture'
import { SurveyTheater } from '@/components/SurveyTheater'
import type { ToastItem } from '@/components/Toasts'
import { terrainForCoord, TERRAIN_META } from '@/lib/terrain'
import { bearing } from '@/lib/format'
import type { useWallet } from '@/hooks/useWallet'

type Wallet = ReturnType<typeof useWallet>

interface Props {
  coord: string
  region: RegionRecord | null
  wallet: Wallet
  onClose: () => void
  onClaimed: (coord: string, ruling: string) => void
  pushToast?: (t: Omit<ToastItem, 'id'>, ttl?: number) => number
  dismissToast?: (id: number) => void
}

type Phase = 'idle' | 'confirm' | 'wallet' | 'consensus' | 'confirmed' | 'error'

const MAX_NAME = 60
const MAX_LORE = 700
const MIN_LORE = 1

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

export default function Cartouche({ coord, region, wallet, onClose, onClaimed, pushToast, dismissToast }: Props) {
  const [name, setName] = useState('')
  const [lore, setLore] = useState('')
  const [phase, setPhase] = useState<Phase>('idle')
  const [liveStatus, setLiveStatus] = useState('')
  const [draft, setDraft] = useState<LeaderDraft | null>(null)
  const [result, setResult] = useState<RegionRecord | LeaderDraft | null>(null)
  const [txHash, setTxHash] = useState<string | null>(null)
  const [errMsg, setErrMsg] = useState('')

  const locked = phase === 'wallet' || phase === 'consensus'

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !locked) onClose()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [locked, onClose])

  const isClaimed = !!region
  const canSubmit = name.trim().length >= 1 && lore.trim().length >= MIN_LORE && !!wallet.address

  const dispatch = async () => {
    if (!wallet.address) {
      await wallet.connect()
      return
    }
    setErrMsg('')
    setPhase('wallet')
    let pendingId: number | undefined
    try {
      const client = makeWalletClient(wallet.address)
      const hash = (await sendClaim(client, coord, name.trim(), lore.trim())) as `0x${string}`
      setTxHash(hash)
      setPhase('consensus')
      pendingId = pushToast?.(
        { kind: 'pending', title: 'Claim dispatched', body: `Region ${coord} is under consensus.` },
        0,
      )
      const { status } = await pollUntilDecided(client, hash, (s, d) => {
        setLiveStatus(s)
        if (d) setDraft(d)
      })
      if (status === 'ACCEPTED' || status === 'FINALIZED') {
        let finalRegion: RegionRecord | null = null
        for (let i = 0; i < 5; i++) {
          finalRegion = await fetchRegion(coord).catch(() => null)
          if (finalRegion) break
          await new Promise((r) => setTimeout(r, 6000))
        }
        const outcome = finalRegion ?? draft
        const ruling = (finalRegion?.status ?? draft?.ruling ?? '').toUpperCase()
        setResult(outcome)
        setPhase('confirmed')
        if (pendingId != null) dismissToast?.(pendingId)
        const cls = rulingClass(ruling)
        pushToast?.({
          kind: cls === 'canon' ? 'success' : 'error',
          title: cls === 'canon' ? 'Region inked CANON' : `Ruling: ${ruling || 'recorded'}`,
          body:
            cls === 'canon'
              ? `${name.trim() || coord} now occupies the shared map.`
              : 'Recorded in the chronicle. The cell stays uncharted.',
        })
        onClaimed(coord, ruling)
      } else if (status === 'UNDETERMINED') {
        if (pendingId != null) dismissToast?.(pendingId)
        setErrMsg('Validators could not agree on this claim. Please try again in a moment.')
        setPhase('error')
        pushToast?.({ kind: 'error', title: 'Claim undetermined', body: 'Validators could not agree. Try again.' })
      } else {
        if (pendingId != null) dismissToast?.(pendingId)
        setErrMsg('The claim was canceled by the network. Please try again.')
        setPhase('error')
        pushToast?.({ kind: 'error', title: 'Claim canceled', body: 'The network canceled the claim.' })
      }
    } catch (e: unknown) {
      if (pendingId != null) dismissToast?.(pendingId)
      const raw = String((e as { message?: string })?.message ?? e)
      if (/reject|denied|User denied/i.test(raw)) setErrMsg('You declined the signature request.')
      else if (/LackOfFundForMaxFee|insufficient/i.test(raw))
        setErrMsg('Not enough test GEN to cover the network fee reserve. Claim more from the faucet and retry.')
      else setErrMsg('The claim could not be submitted. Please try again.')
      setPhase('error')
      pushToast?.({ kind: 'error', title: 'Claim failed', body: 'The claim could not be submitted.' })
    }
  }

  const terrain = isClaimed ? terrainForCoord(coord) : null

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 z-50 flex items-center justify-center p-4"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
      >
        <div className="absolute inset-0 bg-ink/40 backdrop-blur-[1px]" onClick={() => !locked && onClose()} aria-hidden="true" />
        <motion.div
          role="dialog"
          aria-modal="true"
          aria-labelledby="cartouche-title"
          initial={{ opacity: 0, y: 16, scale: 0.97 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 16, scale: 0.97 }}
          transition={{ type: 'spring', stiffness: 300, damping: 28 }}
          className="paper deckle relative z-10 w-[min(94vw,36rem)] rounded-lg p-6 scroll-thin"
          style={{ maxHeight: '88vh', overflowY: 'auto' }}
        >
          {!locked ? (
            <button
              type="button"
              onClick={onClose}
              className="absolute right-4 top-4 text-faded hover:text-ink"
              aria-label="Close cartouche"
            >
              <X size={18} aria-hidden="true" />
            </button>
          ) : null}

          {/* ---- existing CANON region ---- */}
          {isClaimed && phase === 'idle' && region && terrain ? (
            <>
              <div className="flex items-start gap-4">
                <div className="flex-none">
                  <TerrainSwatch terrain={terrain} size={84} />
                </div>
                <div className="min-w-0">
                  <p className="font-mono text-[0.7rem] uppercase tracking-[0.2em] text-faded">
                    Region {coord} {'\u00b7'} {TERRAIN_META[terrain].label}
                  </p>
                  <h2 id="cartouche-title" className="font-display text-3xl leading-tight text-ink">
                    {region.name}
                  </h2>
                  <p className="mt-1 font-mono text-[0.78rem] text-sepia">{bearing(coord)}</p>
                </div>
              </div>

              <div className="ink-rule my-4" />

              <p className="whitespace-pre-wrap text-[0.96rem] leading-relaxed text-ink">{region.lore}</p>

              <div className="mt-4 grid grid-cols-2 gap-3 font-mono text-[0.78rem]">
                <div>
                  <p className="uppercase tracking-[0.14em] text-faded">Status</p>
                  <p className="mt-0.5 text-teal">CANON</p>
                </div>
                <div>
                  <p className="uppercase tracking-[0.14em] text-faded">Coherence</p>
                  <p className="mt-0.5 text-ink tabular">{region.coherence} / 100</p>
                </div>
                <div>
                  <p className="uppercase tracking-[0.14em] text-faded">Charted by</p>
                  <p className="mt-0.5 text-ink">{shortAddr(region.explorer)}</p>
                </div>
                <div>
                  <p className="uppercase tracking-[0.14em] text-faded">Claim order</p>
                  <p className="mt-0.5 text-ink tabular">#{region.seq}</p>
                </div>
              </div>

              {region.note ? (
                <p className="mt-4 text-[0.86rem] italic leading-snug text-sepia">{region.note}</p>
              ) : null}
            </>
          ) : null}

          {/* ---- claim form ---- */}
          {!isClaimed && phase === 'idle' ? (
            <>
              <p className="font-mono text-[0.7rem] uppercase tracking-[0.2em] text-faded">
                Uncharted cell {coord} {'\u00b7'} {bearing(coord)}
              </p>
              <h2 id="cartouche-title" className="mt-1 font-display text-2xl text-ink">
                Claim the uncharted
              </h2>

              {!wallet.address ? (
                <p
                  className="mt-3 rounded-md border-l-2 px-3 py-2 text-[0.86rem] text-sepia"
                  style={{ borderColor: 'var(--gild)', background: 'rgba(169,132,47,0.08)' }}
                >
                  Connect your instrument to commit a claim. Reading the atlas needs no wallet.
                </p>
              ) : null}

              <form
                onSubmit={(e) => {
                  e.preventDefault()
                  if (canSubmit) setPhase('confirm')
                }}
                className="mt-4"
              >
                <label htmlFor="region-name" className="font-mono text-[0.74rem] uppercase tracking-[0.14em] text-sepia">
                  Region name
                  <span className="float-right text-faded">{name.length}/{MAX_NAME}</span>
                </label>
                <input
                  id="region-name"
                  value={name}
                  maxLength={MAX_NAME}
                  placeholder="The Saltglass Reaches"
                  onChange={(e) => setName(e.target.value)}
                  className="mt-1.5 w-full rounded-md border bg-vellum/60 px-3 py-2.5 text-[0.95rem] text-ink placeholder:text-faded focus:outline-none"
                  style={{ borderColor: 'var(--hairline-strong)' }}
                />

                <label htmlFor="region-lore" className="mt-4 block font-mono text-[0.74rem] uppercase tracking-[0.14em] text-sepia">
                  Lore: geography, peoples, history
                  <span className="float-right text-faded">{lore.length}/{MAX_LORE}</span>
                </label>
                <textarea
                  id="region-lore"
                  value={lore}
                  maxLength={MAX_LORE}
                  rows={7}
                  placeholder="Describe this region so it coheres with the canon of its neighbours. The Cartographer judges geography, peoples, and history against the established world."
                  onChange={(e) => setLore(e.target.value)}
                  className="mt-1.5 w-full resize-none rounded-md border bg-vellum/60 px-3 py-2.5 text-[0.95rem] text-ink placeholder:text-faded focus:outline-none"
                  style={{ borderColor: 'var(--hairline-strong)' }}
                />

                <button
                  type="submit"
                  disabled={!canSubmit}
                  className="mt-4 w-full rounded-md px-4 py-2.5 font-mono text-[0.84rem] text-vellum disabled:opacity-50"
                  style={{ background: 'var(--rust)' }}
                >
                  {wallet.address ? 'Submit to the Cartographer' : 'Connect wallet to claim'}
                </button>
                <p className="mt-2 text-center font-mono text-[0.7rem] text-faded">
                  Your lore guides the Cartographer; only a CANON ruling inks the tile.
                </p>
              </form>
            </>
          ) : null}

          {/* ---- confirm step ---- */}
          {phase === 'confirm' ? (
            <>
              <h2 id="cartouche-title" className="font-display text-2xl text-ink">
                Dispatch this claim?
              </h2>
              <p className="mt-3 text-[0.95rem] leading-relaxed text-sepia">
                This submits a transaction on Bradbury Testnet for region {coord}. Network fees apply. The
                Cartographer will rule it under consensus. Continue?
              </p>
              <div className="mt-6 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setPhase('idle')}
                  className="rounded-md border px-4 py-2 font-mono text-[0.82rem] text-sepia hover:bg-ink/5"
                  style={{ borderColor: 'var(--hairline-strong)' }}
                >
                  Back
                </button>
                <button
                  type="button"
                  onClick={dispatch}
                  className="rounded-md px-4 py-2 font-mono text-[0.82rem] text-vellum"
                  style={{ background: 'var(--teal)' }}
                >
                  Dispatch claim
                </button>
              </div>
            </>
          ) : null}

          {/* ---- wallet + consensus theater ---- */}
          {phase === 'wallet' || phase === 'consensus' ? (
            <>
              <p className="font-mono text-[0.7rem] uppercase tracking-[0.2em] text-faded">Region {coord}</p>
              <h2 id="cartouche-title" className="mt-1 font-display text-2xl text-ink">
                {phase === 'wallet' ? 'Awaiting your seal' : 'The Cartographer deliberates'}
              </h2>
              {phase === 'wallet' ? (
                <p className="mt-2 text-[0.9rem] text-sepia">Confirm the claim in your wallet to broadcast it.</p>
              ) : null}
              <SurveyTheater phase={phase} liveStatus={liveStatus} draft={draft} />
              {txHash ? (
                <a
                  href={`${EXPLORER}/tx/${txHash}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-4 inline-flex items-center gap-1.5 font-mono text-[0.78rem] text-teal hover:text-ink"
                >
                  <ExternalLink size={13} aria-hidden="true" />
                  View transaction
                </a>
              ) : null}
            </>
          ) : null}

          {/* ---- verdict ---- */}
          {phase === 'confirmed' && result ? (
            <VerdictView coord={coord} result={result} txHash={txHash} onClose={onClose} />
          ) : null}

          {/* ---- error ---- */}
          {phase === 'error' ? (
            <div className="text-center">
              <div
                className="mx-auto flex h-20 w-20 items-center justify-center rounded-full border-2"
                style={{ borderColor: 'var(--rust)', color: 'var(--rust)', background: 'rgba(181,83,46,0.10)' }}
              >
                <XCircle size={38} aria-hidden="true" />
              </div>
              <h2 id="cartouche-title" className="mt-4 font-display text-2xl text-ink">
                Claim halted
              </h2>
              <p className="mt-2 text-[0.92rem] italic text-sepia">{errMsg}</p>
              <button
                type="button"
                onClick={() => setPhase('idle')}
                className="mt-5 w-full rounded-md px-4 py-2.5 font-mono text-[0.84rem] text-vellum"
                style={{ background: 'var(--teal)' }}
              >
                Try again
              </button>
            </div>
          ) : null}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}

function VerdictView({
  coord,
  result,
  txHash,
  onClose,
}: {
  coord: string
  result: RegionRecord | LeaderDraft
  txHash: string | null
  onClose: () => void
}) {
  const ruling = ('status' in result ? result.status : result.ruling) ?? ''
  const coherence = result.coherence ?? 0
  const note = result.note ?? ''
  const cls = rulingClass(ruling)
  const Icon = cls === 'canon' ? CheckCircle2 : cls === 'contested' ? AlertTriangle : XCircle
  const color = RULING_COLOR[cls]

  return (
    <div className="text-center">
      <motion.div
        className="mx-auto flex h-24 w-24 items-center justify-center rounded-full border-2"
        style={{ borderColor: color, color, background: 'rgba(31,111,120,0.08)' }}
        initial={{ scale: 0.2, opacity: 0, rotate: -24 }}
        animate={{ scale: [0.2, 1.18, 1], opacity: 1, rotate: 0 }}
        transition={{ duration: 0.7, ease: 'easeOut', times: [0, 0.6, 1] }}
      >
        <Icon size={44} aria-hidden="true" />
      </motion.div>
      <h2 id="cartouche-title" className="mt-4 font-display text-3xl tracking-[0.04em]" style={{ color }}>
        {ruling.toUpperCase()}
      </h2>
      <p className="mt-1 font-mono text-[0.8rem] text-sepia tabular">
        Region {coord} {'\u00b7'} coherence {coherence} / 100
      </p>
      {note ? <p className="mx-auto mt-3 max-w-md text-[0.95rem] italic leading-relaxed text-ink">{note}</p> : null}
      <p className="mt-3 text-[0.9rem] text-sepia">
        {cls === 'canon'
          ? 'This region is now woven into the world atlas.'
          : 'Recorded in the chronicle. The cell stays uncharted and open to a new claim.'}
      </p>
      <div className="mt-5 flex items-center justify-center gap-4">
        <button
          type="button"
          onClick={onClose}
          className="rounded-md px-4 py-2.5 font-mono text-[0.84rem] text-vellum"
          style={{ background: 'var(--teal)' }}
        >
          Return to the map
        </button>
        {txHash ? (
          <a
            href={`${EXPLORER}/tx/${txHash}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 font-mono text-[0.78rem] text-teal hover:text-ink"
          >
            <ExternalLink size={13} aria-hidden="true" />
            Transaction
          </a>
        ) : null}
      </div>
    </div>
  )
}
