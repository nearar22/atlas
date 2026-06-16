'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { AnimatePresence } from 'framer-motion'
import { GrainCanvas } from '@/components/GrainCanvas'
import { Masthead } from '@/components/Masthead'
import WorldMap from '@/components/WorldMap'
import { LegendBand } from '@/components/LegendBand'
import { ClaimConsoleSection } from '@/components/ClaimConsoleSection'
import { Chronicle } from '@/components/Chronicle'
import { RegionsIndex } from '@/components/RegionsIndex'
import { Footer } from '@/components/Footer'
import Cartouche from '@/components/Cartouche'
import { Toasts, type ToastItem } from '@/components/Toasts'
import { ErrorState } from '@/components/ErrorState'
import { MapSkeleton } from '@/components/Skeleton'
import { DataErrorBoundary } from '@/components/DataErrorBoundary'
import { useWallet } from '@/hooks/useWallet'
import {
  GRID_COLS,
  GRID_ROWS,
  fetchChronicle,
  fetchRegions,
  fetchStats,
  type AtlasStats,
  type ChronicleEntry,
  type RegionRecord,
} from '@/lib/contract'

const POLL_MS = 90000

export default function Page() {
  const wallet = useWallet()
  const [regions, setRegions] = useState<RegionRecord[]>([])
  const [chronicle, setChronicle] = useState<ChronicleEntry[]>([])
  const [stats, setStats] = useState<AtlasStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const [justClaimed, setJustClaimed] = useState<string | null>(null)
  const [sel, setSel] = useState<{ coord: string; region: RegionRecord | null } | null>(null)
  const [toasts, setToasts] = useState<ToastItem[]>([])

  const alive = useRef(true)
  const inFlight = useRef(false)
  const mapRef = useRef<HTMLDivElement | null>(null)
  const toastSeq = useRef(0)

  const pushToast = useCallback((t: Omit<ToastItem, 'id'>, ttl = 6000) => {
    const id = ++toastSeq.current
    setToasts((cur) => [...cur, { ...t, id }])
    if (ttl > 0) setTimeout(() => setToasts((cur) => cur.filter((x) => x.id !== id)), ttl)
    return id
  }, [])

  const dismissToast = useCallback((id: number) => {
    setToasts((cur) => cur.filter((x) => x.id !== id))
  }, [])

  const load = useCallback(async (initial = false) => {
    if (inFlight.current) return
    inFlight.current = true
    if (initial) setLoading(true)
    try {
      const [regs, chron, st] = await Promise.all([fetchRegions(0), fetchChronicle(0), fetchStats()])
      if (!alive.current) return
      setRegions(regs)
      setChronicle(chron)
      setStats(st)
      setError(false)
    } catch {
      if (!alive.current) return
      if (initial) setError(true)
    } finally {
      if (alive.current) setLoading(false)
      inFlight.current = false
    }
  }, [])

  useEffect(() => {
    alive.current = true
    load(true)
    const id = setInterval(() => {
      if (!sel) load(false)
    }, POLL_MS)
    return () => {
      alive.current = false
      clearInterval(id)
    }
  }, [load, sel])

  const selectCell = useCallback((coord: string, region: RegionRecord | null) => {
    setSel({ coord, region })
  }, [])

  const onClaimed = useCallback(
    (coord: string, ruling: string) => {
      if (ruling === 'CANON') {
        setJustClaimed(coord)
        setTimeout(() => setJustClaimed(null), 2600)
      }
      setTimeout(() => load(false), 1500)
    },
    [load],
  )

  const jumpToMap = useCallback(() => {
    mapRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }, [])

  const claimedSet = useMemo(() => new Set(regions.map((r) => r.coord)), [regions])
  const unchartedCount = GRID_COLS * GRID_ROWS - regions.length

  return (
    <main className="relative min-h-full">
      <GrainCanvas />

      <div className="relative z-10">
        <Masthead wallet={wallet} stats={stats} loading={loading} />

        {/* full-bleed live map hero */}
        <section ref={mapRef} aria-label="Live world map" className="relative">
          <div className="h-[68vh] min-h-[440px] w-full border-b" style={{ borderColor: 'var(--hairline-strong)' }}>
            {error && regions.length === 0 ? (
              <div className="flex h-full items-center justify-center p-6">
                <ErrorState
                  message="The atlas could not be read from the contract. The network may be busy."
                  diagnostic
                  onRetry={() => load(true)}
                />
              </div>
            ) : loading && regions.length === 0 ? (
              <div className="flex h-full items-center justify-center">
                <div className="w-full max-w-2xl">
                  <MapSkeleton />
                  <p className="text-center font-mono text-[0.8rem] text-faded">Unrolling the atlas{'\u2026'}</p>
                </div>
              </div>
            ) : (
              <WorldMap
                regions={regions}
                onSelect={selectCell}
                selected={sel?.coord ?? null}
                justClaimed={justClaimed}
              />
            )}
          </div>
        </section>

        <LegendBand />

        <DataErrorBoundary>
          <ClaimConsoleSection wallet={wallet} unchartedCount={unchartedCount} onJumpToMap={jumpToMap} />
          <Chronicle chronicle={chronicle} loading={loading} onSelect={(coord) => selectCell(coord, regions.find((r) => r.coord === coord) ?? null)} />
          <RegionsIndex regions={regions} onSelect={selectCell} />
        </DataErrorBoundary>

        <Footer />
      </div>

      <AnimatePresence>
        {sel && (
          <Cartouche
            key={sel.coord}
            coord={sel.coord}
            region={
              sel.region ??
              (claimedSet.has(sel.coord) ? regions.find((r) => r.coord === sel.coord) ?? null : null)
            }
            wallet={wallet}
            onClose={() => setSel(null)}
            onClaimed={onClaimed}
            pushToast={pushToast}
            dismissToast={dismissToast}
          />
        )}
      </AnimatePresence>

      <Toasts items={toasts} onDismiss={dismissToast} />
    </main>
  )
}
