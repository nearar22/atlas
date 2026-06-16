import { createClient } from 'genlayer-js'
import { testnetBradbury } from 'genlayer-js/chains'

// Real deployed atlas contract on GenLayer Bradbury testnet.
export const CONTRACT_ADDRESS = '0x2EA3a9aa16a57BD0F6f8d8ac5e20819772554a99' as const
export const DEPLOY_TX = '0x28054928aa482c92fa4202bfaa41ea7c6843ac9f562e356db39499d718ba38b1' as const
export const EXPLORER = 'https://explorer-bradbury.genlayer.com'
export const FAUCET = 'https://testnet-faucet.genlayer.foundation/'

export const GRID_COLS = 12
export const GRID_ROWS = 12

export const readClient = createClient({ chain: testnetBradbury })

export const makeWalletClient = (account: `0x${string}`) =>
  createClient({ chain: testnetBradbury, account })

export async function withRpcRetry<T>(fn: () => Promise<T>, tries = 4): Promise<T> {
  let last: unknown
  for (let i = 0; i < tries; i++) {
    try {
      return await fn()
    } catch (e) {
      last = e
      if (!/rate limit|429|timeout|network|fetch/i.test(String(e))) throw e
      await new Promise((r) => setTimeout(r, 2500 * 2 ** i))
    }
  }
  throw last
}

export interface RegionRecord {
  id: string
  coord: string
  name: string
  lore: string
  status: string
  explorer: string
  coherence: number
  note: string
  seq: number
}

export interface ChronicleEntry {
  coord: string
  name: string
  explorer: string
  ruling: string
  coherence: number
  note: string
  claimed: boolean
  seq: number
}

export interface AtlasStats {
  claims: number
  canon: number
  contested: number
  apocrypha: number
  chronicle: number
  cols: number
  rows: number
}

function toNum(v: unknown): number {
  if (typeof v === 'bigint') return Number(v)
  if (typeof v === 'number') return v
  if (typeof v === 'string') return Number(v) || 0
  return 0
}

function asRecord(r: unknown): RegionRecord {
  const o = r as Record<string, unknown>
  return {
    id: String(o.id ?? o.coord ?? ''),
    coord: String(o.coord ?? ''),
    name: String(o.name ?? ''),
    lore: String(o.lore ?? ''),
    status: String(o.status ?? 'CANON'),
    explorer: String(o.explorer ?? ''),
    coherence: toNum(o.coherence),
    note: String(o.note ?? ''),
    seq: toNum(o.seq),
  }
}

function asChronicle(r: unknown): ChronicleEntry {
  const o = r as Record<string, unknown>
  return {
    coord: String(o.coord ?? ''),
    name: String(o.name ?? ''),
    explorer: String(o.explorer ?? ''),
    ruling: String(o.ruling ?? ''),
    coherence: toNum(o.coherence),
    note: String(o.note ?? ''),
    claimed: Boolean(o.claimed),
    seq: toNum(o.seq),
  }
}

export async function fetchRegions(start = 0): Promise<RegionRecord[]> {
  const res = await withRpcRetry(() =>
    readClient.readContract({
      address: CONTRACT_ADDRESS,
      functionName: 'get_regions',
      args: [start],
    }),
  )
  return Array.isArray(res) ? res.map(asRecord) : []
}

export async function fetchRegion(coord: string): Promise<RegionRecord | null> {
  const res = await withRpcRetry(() =>
    readClient.readContract({
      address: CONTRACT_ADDRESS,
      functionName: 'get_region',
      args: [coord],
    }),
  )
  if (!res || typeof res !== 'object') return null
  const o = res as Record<string, unknown>
  if (!o.coord) return null
  return asRecord(res)
}

export async function fetchChronicle(start = 0): Promise<ChronicleEntry[]> {
  const res = await withRpcRetry(() =>
    readClient.readContract({
      address: CONTRACT_ADDRESS,
      functionName: 'get_chronicle',
      args: [start],
    }),
  )
  return Array.isArray(res) ? res.map(asChronicle) : []
}

export async function fetchStats(): Promise<AtlasStats> {
  const res = await withRpcRetry(() =>
    readClient.readContract({
      address: CONTRACT_ADDRESS,
      functionName: 'get_stats',
      args: [],
    }),
  )
  const o = (res ?? {}) as Record<string, unknown>
  return {
    claims: toNum(o.claims),
    canon: toNum(o.canon),
    contested: toNum(o.contested),
    apocrypha: toNum(o.apocrypha),
    chronicle: toNum(o.chronicle),
    cols: toNum(o.cols) || GRID_COLS,
    rows: toNum(o.rows) || GRID_ROWS,
  }
}

export const sendClaim = (
  client: ReturnType<typeof makeWalletClient>,
  coord: string,
  name: string,
  lore: string,
) =>
  client.writeContract({
    address: CONTRACT_ADDRESS,
    functionName: 'claim_region',
    args: [coord, name, lore],
    value: 0n,
  })

export const shortAddr = (a: string) =>
  a && a.length > 10 ? `${a.slice(0, 6)}\u2026${a.slice(-4)}` : a
