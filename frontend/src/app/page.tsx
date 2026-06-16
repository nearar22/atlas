'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { AnimatePresence } from 'framer-motion'
import Header from '@/components/Header'
import WorldMap from '@/components/WorldMap'
import Gazetteer from '@/components/Gazetteer'
import Cartouche from '@/components/Cartouche'
import { useWallet } from '@/hooks/useWallet'
import {
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
  const [tab, setTab] = useState<'regions' | 'chronicle'>('regions')
  const [sel, setSel] = useState<{ coord: string; region: RegionRecord | null } | null>(null)

  const alive = useRef(true)
  const inFlight = useRef(false)

  const load = useCallback(async (initial = false) => {
    if (inFlight.current) return
    inFlight.current = true
    if (initial) setLoading(true)
    try {
      const [regs, chron, st] = await Promise.all([
        fetchRegions(0),
        fetchChronicle(0),
        fetchStats(),
      ])
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

  const selectCell = (coord: string, region: RegionRecord | null) => {
    setSel({ coord, region })
  }

  const onClaimed = useCallback(() => {
    setTimeout(() => load(false), 1500)
  }, [load])

  const claimedSet = useMemo(() => new Set(regions.map((r) => r.coord)), [regions])

  return (
    <main className="grain">
      <Header wallet={wallet} />
      <div className="atlas-shell">
        <WorldMap regions={regions} onSelect={selectCell} selected={sel?.coord ?? null} />
        <Gazetteer
          regions={regions}
          chronicle={chronicle}
          stats={stats}
          loading={loading}
          error={error}
          tab={tab}
          setTab={setTab}
          onSelect={selectCell}
          onRetry={() => load(true)}
        />
      </div>

      <AnimatePresence>
        {sel && (
          <Cartouche
            key={sel.coord}
            coord={sel.coord}
            region={sel.region ?? (claimedSet.has(sel.coord) ? regions.find((r) => r.coord === sel.coord) ?? null : null)}
            wallet={wallet}
            onClose={() => setSel(null)}
            onClaimed={onClaimed}
          />
        )}
      </AnimatePresence>
    </main>
  )
}
