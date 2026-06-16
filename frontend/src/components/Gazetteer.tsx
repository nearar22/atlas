'use client'

import { motion } from 'framer-motion'
import { Compass, ScrollText } from 'lucide-react'
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

// staggered reveal for gazetteer rows
const listV = {
  hidden: {},
  show: { transition: { staggerChildren: 0.06, delayChildren: 0.04 } },
}
const rowV = {
  hidden: { opacity: 0, y: 10 },
  show: { opacity: 1, y: 0, transition: { type: 'spring' as const, stiffness: 240, damping: 26 } },
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
            <motion.div
              className="empty-margin charted-empty"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, ease: 'easeOut' }}
            >
              <div className="empty-emblem" aria-hidden="true">
                <Compass size={44} strokeWidth={1.1} />
              </div>
              <div className="empty-kicker">Terra incognita</div>
              <h3 className="empty-head">The world is unwritten</h3>
              <p className="empty-lead">
                No region has yet entered canon. Every coastline, every people and every
                old road is still waiting to be drawn.
              </p>
              <p className="empty-fine">
                Choose any cell on the chart to lay down the first claim. The Cartographer
                will weigh it against its neighbours and rule it canon or send it to the
                apocrypha.
              </p>
            </motion.div>
          ) : (
            <motion.div variants={listV} initial="hidden" animate="show">
              {regions
                .slice()
                .sort((a, b) => a.coord.localeCompare(b.coord))
                .map((r) => (
                  <motion.button
                    key={r.coord}
                    variants={rowV}
                    className="gaz-item"
                    onClick={() => onSelect(r.coord, r)}
                  >
                    <div className="gi-top">
                      <span className="gaz-coord">{r.coord}</span>
                      <span className={`coh canon`}>{r.coherence}</span>
                    </div>
                    <div className="gaz-name">
                      <span className="gi-cap" aria-hidden="true">{r.name.charAt(0).toUpperCase()}</span>
                      {r.name.slice(1)}
                    </div>
                    <div className="gaz-lore">{r.lore}</div>
                  </motion.button>
                ))}
            </motion.div>
          )
        ) : chronicle.length === 0 ? (
          <motion.div
            className="empty-margin charted-empty"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: 'easeOut' }}
          >
            <div className="empty-emblem" aria-hidden="true">
              <ScrollText size={44} strokeWidth={1.1} />
            </div>
            <div className="empty-kicker">The open ledger</div>
            <h3 className="empty-head">No rulings recorded</h3>
            <p className="empty-lead">
              The chronicle keeps every verdict the Cartographer hands down, whether a
              claim is welcomed into canon or turned away.
            </p>
            <p className="empty-fine">
              Once the first claim is judged, its ruling, coherence and author will be
              inscribed here in order.
            </p>
          </motion.div>
        ) : (
          <motion.div variants={listV} initial="hidden" animate="show">
            {chronicle.map((c) => (
              <motion.div key={c.seq} variants={rowV} className="chron-item">
                <div className="chron-top">
                  <span className="gaz-coord">
                    {c.coord} {c.name && <span style={{ color: 'var(--sepia-soft)', fontWeight: 400 }}>{c.name}</span>}
                  </span>
                  <span className={`ruling-tag ${rulingClass(c.ruling)}`}>
                    {c.ruling}
                    {rulingClass(c.ruling) === 'canon' && <span className="wax-accent" aria-hidden="true" />}
                  </span>
                </div>
                {c.note && <p className="chron-note">{c.note}</p>}
                <div className="chron-meta">
                  {shortAddr(c.explorer)} {'\u00b7'} coherence {c.coherence} {'\u00b7'} #{c.seq}
                </div>
              </motion.div>
            ))}
          </motion.div>
        )}
      </div>
    </aside>
  )
}
