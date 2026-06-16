const STATUS_NAME: Record<string, string> = {
  '1': 'PENDING', '2': 'PROPOSING', '3': 'COMMITTING', '4': 'REVEALING',
  '5': 'ACCEPTED', '6': 'UNDETERMINED', '7': 'FINALIZED', '8': 'CANCELED',
  '12': 'VALIDATORS_TIMEOUT', '13': 'LEADER_TIMEOUT',
}
export const statusName = (s: unknown) =>
  STATUS_NAME[String(s)] ?? String(s).toUpperCase()

// LEADER_TIMEOUT / VALIDATORS_TIMEOUT are deliberately absent: the network
// rotates the leader and retries, so polling keeps going through them.
const TERMINAL = new Set(['ACCEPTED', 'FINALIZED', 'UNDETERMINED', 'CANCELED'])

export interface LeaderDraft {
  ruling: string
  coherence?: number
  note?: string
}

function pick(obj: unknown, key: string): unknown {
  if (obj instanceof Map) return obj.get(key)
  if (obj && typeof obj === 'object') return (obj as Record<string, unknown>)[key]
  return undefined
}

export function extractLeaderDraft(tx: unknown): LeaderDraft | null {
  try {
    const receipts = pick(pick(tx, 'consensus_data'), 'leader_receipt')
    const first = Array.isArray(receipts) ? receipts[0] : receipts
    const b64 = pick(pick(first, 'eq_outputs'), '0')
    if (typeof b64 !== 'string' || b64.length === 0) return null
    const text = atob(b64)
    for (let i = text.length - 1; i >= 0; i--) {
      if (text[i] !== '{') continue
      try {
        const obj = JSON.parse(text.slice(i))
        if (obj && typeof obj === 'object' && 'ruling' in obj) return obj as LeaderDraft
      } catch {
        /* keep scanning */
      }
    }
    return null
  } catch {
    return null
  }
}

type WalletClient = {
  getTransaction: (a: { hash: `0x${string}` & { length: 66 } }) => Promise<unknown>
}

export async function pollUntilDecided(
  client: WalletClient,
  hash: `0x${string}`,
  onUpdate?: (status: string, draft: LeaderDraft | null) => void,
): Promise<{ status: string; draft: LeaderDraft | null }> {
  let draft: LeaderDraft | null = null
  for (let i = 0; i < 150; i++) {
    const tx = await client.getTransaction({ hash: hash as `0x${string}` & { length: 66 } }).catch(() => null)
    const status = statusName(tx ? (tx as { status?: unknown }).status : 'PENDING')
    draft = (tx ? extractLeaderDraft(tx) : null) ?? draft
    onUpdate?.(status, draft)
    if (TERMINAL.has(status)) return { status, draft }
    await new Promise((r) => setTimeout(r, 8000))
  }
  return { status: 'TIMEOUT', draft }
}
