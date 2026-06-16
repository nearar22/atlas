'use client'

import { Map as MapIcon, ScrollText } from 'lucide-react'
import { shortAddr, type AtlasStats, type ChronicleEntry, type RegionRecord } from '@/lib/contract'

interface Props {
  regions: RegionRecord[]
  chronicle: ChronicleEntry[]
  stats: AtlasStats | null
  loading: boolean
  error: boolean
  tab: 'regions' | 'chronicle'
  setTab: (t: 'regions' | 'chronicle') => void
  onSelect: (coord: string, region: RegionRecord | null) => void
  onRetry: () => void
}

function rulingClass(r: string): string {
  const u = r.toUpperCase()
  if (u === 'CANON') return 'canon'
  if (u === 'CONTESTED') return 'contested'
  return 'apocrypha'
}

export default function Gazetteer({
  regions,
  chronicle,
  stats,
  loading,
  error,
  tab,
  setTab,
  onSelect,
  onRetry,
}: Props) {
  return (
    <aside className="gazetteer" aria-label="Gazetteer of the shared world">
      <div className="gaz-head">
        <div className="gaz-kicker">The Gazetteer</div>
        <h2>A living atlas</h2>
        <div className="gaz-stats">
          <div className="gaz-stat">
            <span className="n">{stats ? stats.canon : '\u2013'}</span>
            <span className="l">Canon regions</span>
          </div>
          <div className="gaz-stat">
            <span className="n">{stats ? stats.claims : '\u2013'}</span>
            <span className="l">Claims judged</span>
          </div>
          <div className="gaz-stat">
            <span className="n">{stats ? stats.contested : '\u2013'}</span>
            <span className="l">Contested</span>
          </div>
          <div className="gaz-stat">
            <span className="n">{stats ? stats.apocrypha : '\u2013'}</span>
            <span className="l">Apocrypha</span>
          </div>
        </div>
      </div>

      <div className="gaz-tabs" role="tablist">
        <button className={`gaz-tab ${tab === 'regions' ? 'active' : ''}`} onClick={() => setTab('regions')} role="tab" aria-selected={tab === 'regions'}>
          Regions
        </button>
        <button className={`gaz-tab ${tab === 'chronicle' ? 'active' : ''}`} onClick={() => setTab('chronicle')} role="tab" aria-selected={tab === 'chronicle'}>
          Chronicle
        </button>
      </div>

      <div className="gaz-list">
        {error ? (
          <div className="err-card" style={{ margin: '24px 16px' }}>
            <p style={{ marginBottom: 12 }}>Could not reach the contract.</p>
            <button className="btn-primary" onClick={onRetry}>Retry</button>
          </div>
        ) : loading ? (
          <div className="skeleton">
            {[0, 1, 2, 3].map((i) => (
              <div key={i}>
                <div className="sk-line" style={{ width: '40%' }} />
                <div className="sk-line" style={{ width: '85%' }} />
                <div className="sk-line" style={{ width: '70%', marginBottom: 20 }} />
              </div>
            ))}
          </div>
        ) : tab === 'regions' ? (
          regions.length === 0 ? (
            <div className="empty-margin">
              <MapIcon size={42} strokeWidth={1.2} aria-hidden="true" />
              <p>No region has entered canon yet. Click any cell on the map to chart the first one.</p>
            </div>
          ) : (
            regions
              .slice()
              .sort((a, b) => a.coord.localeCompare(b.coord))
              .map((r) => (
                <button key={r.coord} className="gaz-item" onClick={() => onSelect(r.coord, r)}>
                  <div className="gi-top">
                    <span className="gaz-coord">{r.coord}</span>
                    <span className={`coh canon`}>{r.coherence}</span>
                  </div>
                  <div className="gaz-name">{r.name}</div>
                  <div className="gaz-lore">{r.lore}</div>
                </button>
              ))
          )
        ) : chronicle.length === 0 ? (
          <div className="empty-margin">
            <ScrollText size={42} strokeWidth={1.2} aria-hidden="true" />
            <p>The chronicle is empty. Every ruling, accepted or not, will be recorded here.</p>
          </div>
        ) : (
          chronicle.map((c) => (
            <div key={c.seq} className="chron-item">
              <div className="chron-top">
                <span className="gaz-coord">
                  {c.coord} {c.name && <span style={{ color: 'var(--sepia-soft)', fontWeight: 400 }}>{c.name}</span>}
                </span>
                <span className={`ruling-tag ${rulingClass(c.ruling)}`}>{c.ruling}</span>
              </div>
              {c.note && <p className="chron-note">{c.note}</p>}
              <div className="chron-meta">
                {shortAddr(c.explorer)} {'\u00b7'} coherence {c.coherence} {'\u00b7'} #{c.seq}
              </div>
            </div>
          ))
        )}
      </div>
    </aside>
  )
}
