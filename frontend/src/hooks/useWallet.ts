'use client'

import { useCallback, useEffect, useState } from 'react'

const BRADBURY_PARAMS = {
  chainId: '0x107D', // 4221
  chainName: 'GenLayer Bradbury Testnet',
  nativeCurrency: { name: 'GEN', symbol: 'GEN', decimals: 18 },
  rpcUrls: ['https://rpc-bradbury.genlayer.com'],
  blockExplorerUrls: ['https://explorer-bradbury.genlayer.com/'],
}

type Eth = {
  request: (a: { method: string; params?: unknown[] }) => Promise<unknown>
  on?: (e: string, cb: (...args: unknown[]) => void) => void
  removeListener?: (e: string, cb: (...args: unknown[]) => void) => void
}

function getEth(): Eth | null {
  if (typeof window === 'undefined') return null
  return (window as unknown as { ethereum?: Eth }).ethereum ?? null
}

export function useWallet() {
  const [address, setAddress] = useState<`0x${string}` | null>(null)
  const [chainId, setChainId] = useState<string | null>(null)
  const [connecting, setConnecting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [hasWallet, setHasWallet] = useState(true)

  useEffect(() => {
    setHasWallet(!!getEth())
  }, [])

  const refreshChain = useCallback(async () => {
    const eth = getEth()
    if (!eth) return
    try {
      const id = (await eth.request({ method: 'eth_chainId' })) as string
      setChainId(id)
    } catch {
      /* ignore */
    }
  }, [])

  const connect = useCallback(async () => {
    const eth = getEth()
    if (!eth) {
      setHasWallet(false)
      return
    }
    setConnecting(true)
    setError(null)
    try {
      const accounts = (await eth.request({ method: 'eth_requestAccounts' })) as string[]
      try {
        await eth.request({
          method: 'wallet_addEthereumChain',
          params: [BRADBURY_PARAMS],
        })
      } catch {
        /* chain may already exist */
      }
      try {
        await eth.request({
          method: 'wallet_switchEthereumChain',
          params: [{ chainId: BRADBURY_PARAMS.chainId }],
        })
      } catch {
        /* user may decline switch */
      }
      setAddress((accounts[0] ?? null) as `0x${string}` | null)
      await refreshChain()
    } catch (e: unknown) {
      const msg = String((e as { message?: string })?.message ?? e)
      setError(/reject|denied/i.test(msg) ? 'Connection request was declined.' : 'Could not connect the wallet.')
    } finally {
      setConnecting(false)
    }
  }, [refreshChain])

  const disconnect = useCallback(() => {
    setAddress(null)
  }, [])

  useEffect(() => {
    const eth = getEth()
    if (!eth?.on) return
    const onAccounts = (...args: unknown[]) => {
      const accts = args[0] as string[]
      setAddress((accts && accts.length ? (accts[0] as `0x${string}`) : null))
    }
    const onChain = (...args: unknown[]) => setChainId(args[0] as string)
    eth.on('accountsChanged', onAccounts)
    eth.on('chainChanged', onChain)
    return () => {
      eth.removeListener?.('accountsChanged', onAccounts)
      eth.removeListener?.('chainChanged', onChain)
    }
  }, [])

  const onBradbury = chainId === BRADBURY_PARAMS.chainId
  return { address, chainId, onBradbury, connecting, error, hasWallet, connect, disconnect }
}
